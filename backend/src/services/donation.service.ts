import Stripe from 'stripe';
import { stripe } from '../config/stripe';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export async function createDonationSession(charityId: string, amount: number, userId?: string) {
  const charity = await prisma.charity.findUniqueOrThrow({ where: { id: charityId } });
  
  const donation = await prisma.donation.create({
    data: {
      charityId,
      userId,
      amount
    }
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Donation to ${charity.name}` },
        unit_amount: amount * 100, // Stripe expects cents
      },
      quantity: 1,
    }],
    success_url: `${env.CLIENT_URL}/charities/${charityId}?donation=success`,
    cancel_url: `${env.CLIENT_URL}/charities/${charityId}?donation=cancelled`,
    metadata: { type: 'DONATION', donationId: donation.id },
  });

  await prisma.donation.update({
    where: { id: donation.id },
    data: { stripeSessionId: session.id }
  });

  return { checkoutUrl: session.url };
}

export async function handleDonationCompleted(session: Stripe.Checkout.Session) {
  if (session.metadata?.type !== 'DONATION' || !session.metadata.donationId) return;
  
  await prisma.donation.update({
    where: { id: session.metadata.donationId },
    data: { status: 'PAID' }
  });
}
