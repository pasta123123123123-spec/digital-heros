export type Role = 'SUBSCRIBER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface CharityEvent {
  id: string;
  charityId: string;
  title: string;
  description: string | null;
  date: string;
  imageUrl: string | null;
}

export interface Charity {
  id: string;
  name: string;
  description: string;
  categories: string[];
  imageUrl?: string | null;
  imageUrls: string[];
  isFeatured: boolean;
  events?: CharityEvent[];
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

export interface Donation {
  id: string;
  amount: string;
  status: 'PENDING' | 'PAID';
  charityId: string;
  charity: { name: string };
  createdAt: string;
}
