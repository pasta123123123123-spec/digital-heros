export type Role = 'SUBSCRIBER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Charity {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  isFeatured: boolean;
}

export type SubscriptionStatus = 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'LAPSED';

export interface Subscription {
  id: string;
  plan: 'MONTHLY' | 'YEARLY';
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  charityId: string | null;
  charity: Charity | null;
  charityContributionPct: number;
}

export interface Score {
  id: string;
  value: number;
  playedOn: string;
}

export interface WinnerClaim {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  amountDue: string;
  proofUrl: string | null;
  rejectionReason: string | null;
  submittedAt: string;
}
