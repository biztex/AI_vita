// backend/src/services/stripeService.ts
import Stripe from "stripe";
import { ENV } from "../env.js";
import { prisma } from "../prisma.js";

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover", // keep whatever you're using now
  typescript: true,
});

// Map subscription types to Stripe price IDs
const PRICE_IDS = {
  VITAAI: ENV.STRIPE_PRICE_VITAAI,
  EXECUWELL: ENV.STRIPE_PRICE_EXECUWELL,
  INTEGRATED: ENV.STRIPE_PRICE_INTEGRATED,
} as const;

export type SubscriptionType = keyof typeof PRICE_IDS;

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
) {
  const user = await prisma.appUser.findUnique({
    where: { supabaseUserId: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!("deleted" in customer && customer.deleted)) {
        return customer as Stripe.Customer;
      }
    } catch (error) {
      console.error("[Stripe] Error retrieving customer:", error);
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || email,
    metadata: {
      userId,
    },
  });

  // Update user with Stripe customer ID
  await prisma.appUser.update({
    where: { supabaseUserId: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer;
}

/**
 * Create a Stripe Checkout Session for subscription
 * Note: Redirect URLs only contain session_id because Stripe Checkout handles
 * the payment flow. The session_id is used to verify payment completion on the frontend.
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  subscriptionType: SubscriptionType,
  name?: string
) {
  const customer = await getOrCreateCustomer(userId, email, name);
  const priceId = PRICE_IDS[subscriptionType];

  if (!priceId) {
    throw new Error(`Invalid subscription type: ${subscriptionType}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    locale: "ja",
    success_url: `${ENV.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ENV.FRONTEND_URL}/subscription?canceled=true`,
    metadata: {
      userId,
      subscriptionType,
    },
    subscription_data: {
      metadata: {
        userId,
        subscriptionType,
      },
    },
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a Stripe Billing Portal Session
 */
export async function createBillingPortalSession(userId: string) {
  const user = await prisma.appUser.findUnique({
    where: { supabaseUserId: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("User does not have a Stripe customer ID");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    locale: "ja",
    return_url: `${ENV.FRONTEND_URL}/subscription`,
  });

  return session;
}

/**
 * Get active subscription for a user
 */
export async function getUserSubscription(userId: string) {
  const subscription = await prisma.stripeSubscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return subscription;
}

/**
 * Update subscription status from Stripe webhook
 *
 * IMPORTANT:
 * Stripe webhook events often contain PARTIAL subscription objects.
 * Fields like current_period_start, current_period_end, billing_cycle_anchor,
 * latest_invoice, and default_payment_method are NOT guaranteed to exist in
 * event.data.object.
 *
 * This function expects a FULL subscription object retrieved via:
 *   stripe.subscriptions.retrieve(subscriptionId, {
 *     expand: ["default_payment_method", "latest_invoice"]
 *   })
 *
 * Never pass event.data.object directly to this function.
 */
export async function updateSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription
) {
  console.log("[Stripe] Processing subscription:", {
    id: stripeSubscription.id,
    status: stripeSubscription.status,
    metadata: stripeSubscription.metadata,
  });

  // 1. Resolve userId from subscription metadata or customer metadata
  let userId = stripeSubscription.metadata?.userId;

  if (!userId) {
    const customer =
      typeof stripeSubscription.customer === "string"
        ? await stripe.customers.retrieve(stripeSubscription.customer)
        : stripeSubscription.customer;

    if ("deleted" in customer && customer.deleted) {
      console.error("[Stripe] Customer is deleted, cannot access metadata:", {
        subscriptionId: stripeSubscription.id,
        customerId:
          typeof stripeSubscription.customer === "string"
            ? stripeSubscription.customer
            : stripeSubscription.customer.id,
      });
      return null;
    }

    const fallbackUserId = (customer as Stripe.Customer).metadata?.userId;
    if (!fallbackUserId) {
      console.error("[Stripe] Subscription missing userId metadata:", {
        subscriptionId: stripeSubscription.id,
        customerId:
          typeof stripeSubscription.customer === "string"
            ? stripeSubscription.customer
            : stripeSubscription.customer.id,
        metadata: stripeSubscription.metadata,
      });
      return null;
    }
    userId = fallbackUserId;
  }

  // 2. Subscription type from metadata
  const subscriptionType = stripeSubscription.metadata
    ?.subscriptionType as SubscriptionType;
  if (!subscriptionType || !PRICE_IDS[subscriptionType]) {
    console.error("[Stripe] Invalid subscription type in metadata");
    return null;
  }

  // 3. Map Stripe status → SubscriptionStatus enum
  const statusMap: Record<
    Stripe.Subscription.Status,
    | "ACTIVE"
    | "CANCELED"
    | "PAST_DUE"
    | "UNPAID"
    | "INCOMPLETE"
    | "INCOMPLETE_EXPIRED"
    | "TRIALING"
    | "PAUSED"
  > = {
    active: "ACTIVE",
    canceled: "CANCELED",
    past_due: "PAST_DUE",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    trialing: "TRIALING",
    paused: "PAUSED",
  };

  const status = statusMap[stripeSubscription.status] ?? "INCOMPLETE";

  // 4. Cancel all other ACTIVE subscriptions for this user when a new one is ACTIVE
  if (status === "ACTIVE") {
    await prisma.stripeSubscription.updateMany({
      where: {
        userId,
        status: "ACTIVE",
        stripeSubscriptionId: { not: stripeSubscription.id },
      },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    });
  }

  // 5. Convert Stripe timestamps (seconds) to JS Date or null
  const asAny = stripeSubscription as any;

  const currentPeriodStart = asAny.current_period_start
    ? new Date(asAny.current_period_start * 1000)
    : null;
  const currentPeriodEnd = asAny.current_period_end
    ? new Date(asAny.current_period_end * 1000)
    : null;
  const billingCycleAnchor = asAny.billing_cycle_anchor
    ? new Date(asAny.billing_cycle_anchor * 1000)
    : null;
  const trialStart = asAny.trial_start
    ? new Date(asAny.trial_start * 1000)
    : null;
  const trialEnd = asAny.trial_end
    ? new Date(asAny.trial_end * 1000)
    : null;
  const cancelAt = asAny.cancel_at
    ? new Date(asAny.cancel_at * 1000)
    : null;
  const canceledAt = asAny.canceled_at
    ? new Date(asAny.canceled_at * 1000)
    : null;

  // 6. Extract invoice and payment method IDs
  const latestInvoiceId =
    typeof asAny.latest_invoice === "string"
      ? asAny.latest_invoice
      : asAny.latest_invoice?.id || null;

  const defaultPaymentMethodId =
    typeof asAny.default_payment_method === "string"
      ? asAny.default_payment_method
      : asAny.default_payment_method?.id || null;

  // 7. Ensure user exists
  const userExists = await prisma.appUser.findUnique({
    where: { supabaseUserId: userId },
    select: { supabaseUserId: true },
  });

  if (!userExists) {
    console.error("[Stripe] User not found for subscription:", {
      userId,
      subscriptionId: stripeSubscription.id,
    });
    return null;
  }

  // 7.5. Sync LineUser.userMode to match subscription (best-effort).
  // - INTEGRATED → no userMode change (AXEL is computed at runtime from active sub)
  // - VITAAI     → set userMode = VITAAI
  // - EXECUWELL  → set userMode = EXECUWELL
  // Skipped silently when no LineUser is linked yet.
  if (status === "ACTIVE" && (subscriptionType === "VITAAI" || subscriptionType === "EXECUWELL")) {
    try {
      const lineUser = await prisma.lineUser.findFirst({ where: { appUserId: userId } });
      if (lineUser && lineUser.userMode !== subscriptionType) {
        await prisma.lineUser.update({
          where: { id: lineUser.id },
          data: { userMode: subscriptionType },
        });
        console.log(`[Stripe] Synced LineUser ${lineUser.id} userMode → ${subscriptionType}`);
      }
    } catch (err) {
      console.error("[Stripe] LineUser userMode sync failed:", err);
    }
  }

  // 8. Upsert subscription
  const subscription = await prisma.stripeSubscription.upsert({
    where: {
      stripeSubscriptionId: stripeSubscription.id,
    },
    create: {
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId:
        typeof stripeSubscription.customer === "string"
          ? stripeSubscription.customer
          : stripeSubscription.customer.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id || "",
      subscriptionType,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      billingCycleAnchor,
      trialStart,
      trialEnd,
      cancelAt,
      cancelAtPeriodEnd: asAny.cancel_at_period_end || false,
      canceledAt,
      latestInvoiceId,
      defaultPaymentMethodId,

      // Relation: Prisma will set userId FK automatically
      user: {
        connect: { supabaseUserId: userId },
      },
    },
    update: {
      status,
      currentPeriodStart,
      currentPeriodEnd,
      billingCycleAnchor,
      trialStart,
      trialEnd,
      cancelAt,
      cancelAtPeriodEnd: asAny.cancel_at_period_end || false,
      canceledAt,
      latestInvoiceId,
      defaultPaymentMethodId,
    },
  });

  return subscription;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  userId: string,
  subscriptionId: string
) {
  const subscription = await prisma.stripeSubscription.findFirst({
    where: {
      userId,
      stripeSubscriptionId: subscriptionId,
      status: "ACTIVE",
    },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // Set cancel_at_period_end on Stripe side
  const stripeSub = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  // Retrieve full subscription to ensure all fields are present
  const fullSubscription = await stripe.subscriptions.retrieve(stripeSub.id, {
    expand: ["default_payment_method", "latest_invoice"],
  });

  await updateSubscriptionFromStripe(fullSubscription);

  return fullSubscription;
}
