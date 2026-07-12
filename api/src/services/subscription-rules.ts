import { SubscriptionStatus } from '@prisma/client';

import { HttpError } from '../utils/http-error';

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.TRIAL,
  SubscriptionStatus.ACTIVE,
]);

export type SubscriptionAccessState = {
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
} | null;

export type MockPaperQuotaState = {
  mockPaperLimit: number;
  mockPaperUsed: number;
};

export const isSubscriptionActive = (subscription: SubscriptionAccessState, now = new Date()) =>
  !!subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) && subscription.currentPeriodEnd > now;

export const assertActiveSubscription = <T extends SubscriptionAccessState>(
  subscription: T,
  message: string,
  now = new Date()
): NonNullable<T> => {
  if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) || subscription.currentPeriodEnd <= now) {
    throw new HttpError(403, message);
  }
  return subscription;
};

export const hasMockPaperQuota = (subscription: MockPaperQuotaState) =>
  subscription.mockPaperUsed < subscription.mockPaperLimit;

export const assertMockPaperQuota = (subscription: MockPaperQuotaState, message = 'Mock paper quota exhausted') => {
  if (!hasMockPaperQuota(subscription)) throw new HttpError(403, message);
  return subscription;
};
