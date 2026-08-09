import express from "express";
import Stripe from "stripe";
import { requireAuth } from "../middlewares/auth.js";
import {
  createCheckoutSession,
  createBillingPortalSession,
  getUserSubscription,
  cancelSubscription,
  stripe,
  updateSubscriptionFromStripe,
} from "../services/stripeService.js";
import { ENV } from "../env.js";
import { prisma } from "../prisma.js";

const router = express.Router();

// Create checkout session
router.post("/create-checkout-session", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { subscriptionType, lineUserId } = req.body;
    const userId = req.user.id;
    const email = req.user.email;

    if (!subscriptionType || !["VITAAI", "EXECUWELL", "INTEGRATED"].includes(subscriptionType)) {
      return res.status(400).json({
        error: "Invalid subscription type. Must be VITAAI, EXECUWELL, or INTEGRATED",
      });
    }

    if (!email) {
      return res.status(400).json({
        error: "User email is required",
      });
    }

    // Optional: when the checkout originates from a LINE context, link the
    // payment to the LINE identity so AXEL activates automatically on success.
    const session = await createCheckoutSession(
      userId,
      email,
      subscriptionType,
      req.user.name,
      typeof lineUserId === "string" && lineUserId ? lineUserId : undefined,
    );

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("[Stripe] Error creating checkout session:", error);
    next(error);
  }
});

// Get user's current subscription
router.get("/subscription", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return res.json({
        subscription: null,
        active: false,
      });
    }

    // Get full subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

    res.json({
      subscription: {
        id: subscription.id,
        type: subscription.subscriptionType,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      },
      active: subscription.status === "ACTIVE",
      stripeSubscription: {
        status: stripeSubscription.status,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      },
    });
  } catch (error: any) {
    console.error("[Stripe] Error getting subscription:", error);
    next(error);
  }
});

// Create billing portal session
router.post("/create-portal-session", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;
    const session = await createBillingPortalSession(userId);

    res.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error("[Stripe] Error creating portal session:", error);
    if (error.message.includes("does not have a Stripe customer ID")) {
      return res.status(400).json({
        error: "No active subscription found",
      });
    }
    next(error);
  }
});

// Cancel subscription
router.post("/cancel-subscription", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        error: "Subscription ID is required",
      });
    }

    await cancelSubscription(userId, subscriptionId);

    res.json({
      success: true,
      message: "Subscription will be canceled at the end of the current period",
    });
  } catch (error: any) {
    console.error("[Stripe] Error canceling subscription:", error);
    next(error);
  }
});

// Webhook endpoint (must be before other routes to handle raw body)
// IMPORTANT: Stripe sends partial subscription objects in many webhook events.
// Never trust event.data.object for subscription fields like current_period_start,
// current_period_end, billing_cycle_anchor, etc.
// Always call stripe.subscriptions.retrieve() with expand to get full data.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: any, res: any) => {
    const sig = req.headers["stripe-signature"];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, ENV.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("[Stripe] Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          // Checkout session completed - retrieve full subscription object
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === "subscription" && session.subscription) {
            // Always retrieve full subscription - event.data.object is partial
            const fullSubscription = await stripe.subscriptions.retrieve(
              session.subscription as string,
              { expand: ["default_payment_method", "latest_invoice"] }
            );
            await updateSubscriptionFromStripe(fullSubscription);
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          // Subscription created/updated - event.data.object is PARTIAL
          // Must retrieve full subscription to get all fields
          const partialSubscription = event.data.object as Stripe.Subscription;
          const fullSubscription = await stripe.subscriptions.retrieve(
            partialSubscription.id,
            { expand: ["default_payment_method", "latest_invoice"] }
          );
          await updateSubscriptionFromStripe(fullSubscription);
          break;
        }

        case "customer.subscription.deleted": {
          // Subscription deleted - retrieve full subscription before deletion
          const partialSubscription = event.data.object as Stripe.Subscription;
          const fullSubscription = await stripe.subscriptions.retrieve(
            partialSubscription.id,
            { expand: ["default_payment_method", "latest_invoice"] }
          );
          await updateSubscriptionFromStripe(fullSubscription);
          break;
        }

        case "invoice.payment_succeeded": {
          // Payment succeeded - retrieve full subscription from invoice
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription;
          if (subscriptionId) {
            const subscriptionIdString = typeof subscriptionId === "string" 
              ? subscriptionId 
              : subscriptionId.id;
            // Always retrieve full subscription - invoice.subscription is just an ID
            const fullSubscription = await stripe.subscriptions.retrieve(
              subscriptionIdString,
              { expand: ["default_payment_method", "latest_invoice"] }
            );
            await updateSubscriptionFromStripe(fullSubscription);
          }
          break;
        }

        case "invoice.payment_failed": {
          // Payment failed - retrieve full subscription from invoice
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription;
          if (subscriptionId) {
            const subscriptionIdString = typeof subscriptionId === "string" 
              ? subscriptionId 
              : subscriptionId.id;
            // Always retrieve full subscription - invoice.subscription is just an ID
            const fullSubscription = await stripe.subscriptions.retrieve(
              subscriptionIdString,
              { expand: ["default_payment_method", "latest_invoice"] }
            );
            await updateSubscriptionFromStripe(fullSubscription);
          }
          break;
        }

        default:
          console.log(`[Stripe] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("[Stripe] Webhook handler error:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);

export default router;

