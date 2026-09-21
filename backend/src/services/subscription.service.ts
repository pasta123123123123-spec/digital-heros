import Stripe from 'stripe';
import { prisma } from '../config/prisma';
import { stripe, STRIPE_PRICE_IDS } from '../config/stripe';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

/**
 * Creates a Stripe Checkout session. This is the ONLY thing the frontend is
 * allowed to trigger directly — everything after this (confirming payment,
 * flipping subscription.status to ACTIVE, handling renewals/cancellations)
 * happens exclusively via the webhook handler in webhooks/stripe.webhook.ts.
 * The client never gets to assert "I paid, mark me active."
 */
export async function createCheckoutSession(
  userId: string,
  plan: SubscriptionPlan,
  charityId: string,
  charityContributionPct: number
) {
  if (charityContributionPct < 10) {
    throw AppError.badRequest('Charity contribution must be at least 10%');
  }

  const charity = await prisma.charity.findFirst({ where: { id: charityId, isActive: true } });
  if (!charity) throw AppError.notFound('Selected charity was not found');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  let subscription = await prisma.subscription.findUnique({ where: { userId } });

  if (subscription?.status === SubscriptionStatus.ACTIVE) {
    throw AppError.conflict('You already have an active subscription');
  }

  let stripeCustomerId = subscription?.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name });
    stripeCustomerId = customer.id;
  }

  // Upsert a local subscription row in INCOMPLETE state up front, so we have
  // somewhere to record the user's plan/charity choice even before Stripe
  // confirms payment via webhook.
  subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: SubscriptionStatus.INCOMPLETE,
      stripeCustomerId,
      charityId,
      charityContributionPct,
    },
    create: {
      userId,
      plan,
      status: SubscriptionStatus.INCOMPLETE,
      stripeCustomerId,
      charityId,
      charityContributionPct,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }],
    success_url: `${env.CLIENT_URL}/dashboard?checkout=success`,
    cancel_url: `${env.CLIENT_URL}/subscribe?checkout=cancelled`,
    metadata: { userId, subscriptionRowId: subscription.id },
  });

  return { checkoutUrl: session.url };
}

/**
 * --- Webhook-driven state transitions ---
 * Each handler is intentionally idempotent (safe to run twice for the same
 * event) since Stripe can and does redeliver webhooks.
 */

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId || typeof session.subscription !== 'string') return;

  const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: SubscriptionStatus.ACTIVE,
      stripeSubscriptionId: stripeSub.id,
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    },
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (typeof invoice.subscription !== 'string') return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: invoice.subscription },
  });
  if (!subscription) return; // not one of ours, or not yet linked — ignore safely

  const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    },
  });
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (typeof invoice.subscription !== 'string') return;

  await prisma.subscription
    .updateMany({
      where: { stripeSubscriptionId: invoice.subscription },
      data: { status: SubscriptionStatus.PAST_DUE },
    })
    .catch(() => undefined);
}

export async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
  const status = mapStripeStatus(stripeSub.status);
  await prisma.subscription
    .updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: {
        status,
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    })
    .catch(() => undefined);
}

export async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
  await prisma.subscription
    .updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: { status: SubscriptionStatus.CANCELED },
    })
    .catch(() => undefined);
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.PAST_DUE;
    case 'canceled':
    case 'incomplete_expired':
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.LAPSED;
  }
}

export async function getMySubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { charity: true },
  });
}

export async function cancelSubscriptionForUser(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription?.stripeSubscriptionId) {
    throw AppError.badRequest('No active Stripe subscription to cancel');
  }

  // Cancel at period end rather than immediately — the user keeps access
  // (and their draw entries) through what they've already paid for. The
  // local row updates when Stripe sends customer.subscription.updated.
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  return { message: 'Subscription will cancel at the end of the current billing period' };
}

export async function cancelMySubscription(userId: string) {
  return cancelSubscriptionForUser(userId);
}

export async function updateMySubscription(
  userId: string,
  data: { charityId?: string; charityContributionPct?: number }
) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) {
    throw AppError.notFound('Subscription not found');
  }

  if (data.charityContributionPct !== undefined && data.charityContributionPct < 10) {
    throw AppError.badRequest('Charity contribution must be at least 10%');
  }

  if (data.charityId) {
    const charity = await prisma.charity.findFirst({ where: { id: data.charityId, isActive: true } });
    if (!charity) {
      throw AppError.notFound('Selected charity was not found');
    }
  }

  return prisma.subscription.update({
    where: { userId },
    data: {
      ...(data.charityId && { charityId: data.charityId }),
      ...(data.charityContributionPct !== undefined && { charityContributionPct: data.charityContributionPct }),
    },
    include: { charity: true },
  });
}
