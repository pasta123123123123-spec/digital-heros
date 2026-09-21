import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '../services/subscription.service';

/**
 * This is the ONLY place subscription.status is ever written to as "ACTIVE".
 * The signature check below is what makes that safe: without it, anyone
 * could POST a fake "payment succeeded" event to this endpoint and grant
 * themselves a free subscription. Never skip this verification, even in
 * development — use the Stripe CLI's `stripe listen --forward-to` for local
 * testing instead of disabling the check.
 *
 * Note: this route must receive the RAW request body (not JSON-parsed) for
 * signature verification to work — see app.ts, where express.raw() is
 * mounted specifically for this path before the global express.json().
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature as string, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('⚠️  Stripe webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        // Unhandled event types are fine to ignore — Stripe sends many more
        // event types than we act on.
        break;
    }

    // Always 200 once we've processed (or intentionally ignored) the event,
    // so Stripe doesn't retry it indefinitely.
    res.json({ received: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Error handling webhook event ${event.type}:`, err);
    // 500 here DOES cause Stripe to retry — appropriate for a transient DB
    // error, since we want the state change eventually applied.
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
