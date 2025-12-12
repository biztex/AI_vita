import Stripe from "stripe";
import { ENV } from "../env.js";
import { prisma } from "../prisma.js";

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
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
export async function getOrCreateCustomer(userId: string, email: string, name?: string) {
  const user = await prisma.appUser.findUnique({
    where: { supabaseUserId: userId },
    select: { stripeCustomerId: true } as any,
  });

  if (user && (user as any).stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve((user as any).stripeCustomerId);
      if (!customer.deleted) {
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
    data: { stripeCustomerId: customer.id } as any,
  });

  return customer;
}

/**
 * Create a Stripe Checkout Session for subscription
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
    select: { stripeCustomerId: true } as any,
  });

  if (!user || !(user as any).stripeCustomerId) {
    throw new Error("User does not have a Stripe customer ID");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: (user as any).stripeCustomerId,
    return_url: `${ENV.FRONTEND_URL}/subscription`,
  });

  return session;
}

/**
 * Get active subscription for a user
 */
export async function getUserSubscription(userId: string) {
  const subscription = await (prisma as any).stripeSubscription.findFirst({
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
 */
export async function updateSubscriptionFromStripe(stripeSubscription: Stripe.Subscription) {
  console.log("[Stripe] Processing subscription:", {
    id: stripeSubscription.id,
    status: stripeSubscription.status,
    metadata: stripeSubscription.metadata,
  });

  let userId = stripeSubscription.metadata?.userId;
  if (!userId) {
    // Try to get userId from customer metadata as fallback
    const customer = typeof stripeSubscription.customer === "string"
      ? await stripe.customers.retrieve(stripeSubscription.customer)
      : stripeSubscription.customer;
    
    const fallbackUserId = customer.metadata?.userId;
    if (!fallbackUserId) {
      console.error("[Stripe] Subscription missing userId metadata:", {
        subscriptionId: stripeSubscription.id,
        customerId: typeof stripeSubscription.customer === "string" 
          ? stripeSubscription.customer 
          : stripeSubscription.customer.id,
        metadata: stripeSubscription.metadata,
      });
      return null;
    }
    // Use fallback userId
    userId = fallbackUserId;
  }

  const subscriptionType = stripeSubscription.metadata?.subscriptionType as SubscriptionType;
  if (!subscriptionType || !PRICE_IDS[subscriptionType]) {
    console.error("[Stripe] Invalid subscription type in metadata");
    return null;
  }

  // Map Stripe status to our status
  const statusMap: Record<string, "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "TRIALING" | "PAUSED"> = {
    active: "ACTIVE",
    canceled: "CANCELED",
    past_due: "PAST_DUE",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    trialing: "TRIALING",
    paused: "PAUSED",
  };

  const status = statusMap[stripeSubscription.status] || "INCOMPLETE";

  // Cancel all other active subscriptions for this user
  if (status === "ACTIVE") {
    await (prisma as any).stripeSubscription.updateMany({
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

  // Validate required date fields
  const currentPeriodStart = (stripeSubscription as any).current_period_start;
  const currentPeriodEnd = (stripeSubscription as any).current_period_end;
  
  if (!currentPeriodStart || !currentPeriodEnd) {
    console.error("[Stripe] Subscription missing required date fields:", {
      subscriptionId: stripeSubscription.id,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
    });
    throw new Error("Subscription missing required date fields");
  }

  // Upsert subscription
  const subscription = await (prisma as any).stripeSubscription.upsert({
    where: {
      stripeSubscriptionId: stripeSubscription.id,
    },
    create: {
      userId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: typeof stripeSubscription.customer === "string" 
        ? stripeSubscription.customer 
        : stripeSubscription.customer.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id || "",
      subscriptionType,
      status,
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end || false,
      canceledAt: (stripeSubscription as any).canceled_at
        ? new Date((stripeSubscription as any).canceled_at * 1000)
        : null,
    },
    update: {
      status,
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end || false,
      canceledAt: (stripeSubscription as any).canceled_at
        ? new Date((stripeSubscription as any).canceled_at * 1000)
        : null,
    },
  });

  // Update user's subscription field
  await prisma.appUser.update({
    where: { supabaseUserId: userId },
    data: {
      subscription: status === "ACTIVE" ? subscriptionType : null,
    },
  });

  return subscription;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(userId: string, subscriptionId: string) {
  const subscription = await (prisma as any).stripeSubscription.findFirst({
    where: {
      userId,
      stripeSubscriptionId: subscriptionId,
      status: "ACTIVE",
    },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  await updateSubscriptionFromStripe(stripeSubscription);

  return stripeSubscription;
}

