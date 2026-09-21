import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export const STRIPE_PRICE_IDS: Record<'MONTHLY' | 'YEARLY', string> = {
  MONTHLY: env.STRIPE_PRICE_ID_MONTHLY,
  YEARLY: env.STRIPE_PRICE_ID_YEARLY,
};
