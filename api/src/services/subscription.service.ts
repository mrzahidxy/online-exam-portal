import { OrganizerRole, Prisma, SubscriptionStatus } from '@prisma/client';

import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { assertActiveSubscription, assertMockPaperQuota } from './subscription-rules';

const FIXED_STUDENT_PLAN_CODE = 'FIXED_MOCK_ACCESS';

export const createTrialSubscriptionData = (now = new Date()) => ({
  status: SubscriptionStatus.TRIAL,
  planCode: 'TRIAL',
  mockPaperLimit: 0,
  mockPaperUsed: 0,
  currentPeriodStart: now,
  currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
});

export const toOrganizerSubscriptionSummary = (subscription: {
  id: string;
  status: SubscriptionStatus;
  planCode: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  organizer?: { name: string } | null;
}) => ({
  id: subscription.id,
  tenantName: subscription.organizer?.name,
  status: subscription.status,
  planCode: subscription.planCode,
  currentPeriodStart: subscription.currentPeriodStart,
  currentPeriodEnd: subscription.currentPeriodEnd,
});

const studentSubscriptionPlanSelect = {
  id: true,
  organizerId: true,
  code: true,
  name: true,
  mockPaperLimit: true,
  periodDays: true,
  isActive: true,
  provider: true,
  providerPriceId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const toStudentSubscriptionPlanSummary = (plan: {
  id: string;
  code: string;
  name: string;
  mockPaperLimit: number;
  periodDays: number;
  isActive: boolean;
  provider: string | null;
  providerPriceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: plan.id,
  code: plan.code,
  name: plan.name,
  mockPaperLimit: plan.mockPaperLimit,
  periodDays: plan.periodDays,
  isActive: plan.isActive,
  provider: plan.provider,
  providerPriceId: plan.providerPriceId,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

const studentSubscriptionSelect = {
  id: true,
  organizerId: true,
  studentId: true,
  status: true,
  mockPaperLimit: true,
  mockPaperUsed: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  plan: { select: { id: true, code: true, name: true, mockPaperLimit: true } },
  student: { select: { id: true, name: true, email: true, schoolCode: true } },
} as const;

const toStudentSubscriptionSummary = (subscription: {
  id?: string;
  status: SubscriptionStatus;
  mockPaperLimit: number;
  mockPaperUsed: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  plan?: { id: string; code: string; name: string; mockPaperLimit: number } | null;
  student?: { id: string; name: string; email: string; schoolCode: string | null };
}) => ({
  id: subscription.id,
  student: subscription.student,
  status: subscription.status,
  plan: subscription.plan ? { id: subscription.plan.id, code: subscription.plan.code, name: subscription.plan.name } : null,
  mockPaperLimit: subscription.mockPaperLimit,
  mockPaperUsed: subscription.mockPaperUsed,
  remaining: Math.max(subscription.mockPaperLimit - subscription.mockPaperUsed, 0),
  currentPeriodStart: subscription.currentPeriodStart,
  currentPeriodEnd: subscription.currentPeriodEnd,
});

const assertStudentInOrganizer = async (organizerId: string, studentId: string) => {
  const membership = await prisma.organizerMembership.findFirst({
    where: { organizerId, userId: studentId, role: OrganizerRole.STUDENT },
    select: { id: true },
  });
  if (!membership) throw new HttpError(404, 'Student not found');
};

export const subscriptionService = {
  getOrganizerSubscription: async (organizerId: string) => prisma.subscription.findUnique({ where: { organizerId } }),

  assertOrganizerPlatformAccess: async (organizerId: string) => {
    const subscription = await subscriptionService.getOrganizerSubscription(organizerId);
    return assertActiveSubscription(subscription, 'Organizer subscription does not permit access');
  },

  getSubscriptionSummary: async (organizerId: string) => {
    const subscription = await subscriptionService.getOrganizerSubscription(organizerId);
    if (!subscription) throw new HttpError(403, 'Organizer subscription is required');
    return toOrganizerSubscriptionSummary(subscription);
  },

  listAdminSubscriptions: async (organizerId: string) => {
    const subscription = await prisma.subscription.findUnique({ where: { organizerId }, include: { organizer: { select: { name: true } } } });
    return subscription ? [toOrganizerSubscriptionSummary(subscription)] : [];
  },

  getAdminSubscription: async (organizerId: string, subscriptionId: string) => {
    const subscription = await prisma.subscription.findFirst({ where: { id: subscriptionId, organizerId }, include: { organizer: { select: { name: true } } } });
    if (!subscription) throw new HttpError(404, 'Subscription not found');
    return toOrganizerSubscriptionSummary(subscription);
  },

  updateAdminSubscription: async (
    organizerId: string,
    subscriptionId: string,
    input: { status?: SubscriptionStatus; planCode?: string; currentPeriodEnd?: Date }
  ) => {
    const existing = await prisma.subscription.findFirst({ where: { id: subscriptionId, organizerId }, select: { id: true } });
    if (!existing) throw new HttpError(404, 'Subscription not found');
    const subscription = await prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: { status: input.status, planCode: input.planCode, currentPeriodEnd: input.currentPeriodEnd },
        include: { organizer: { select: { name: true } } },
      });
      await tx.organizer.update({ where: { id: organizerId }, data: { subscriptionStatus: updated.status, subscriptionEndsAt: updated.currentPeriodEnd } });
      return updated;
    });
    return toOrganizerSubscriptionSummary(subscription);
  },

  listStudentSubscriptions: async (organizerId: string) => {
    const memberships = await prisma.organizerMembership.findMany({
      where: { organizerId, role: OrganizerRole.STUDENT },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            schoolCode: true,
            studentSubscriptions: {
              where: { organizerId },
              select: studentSubscriptionSelect,
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return memberships.map(({ user }) => {
      const subscription = user.studentSubscriptions[0];
      if (subscription) return toStudentSubscriptionSummary(subscription);
      return toStudentSubscriptionSummary({
        student: { id: user.id, name: user.name, email: user.email, schoolCode: user.schoolCode },
        status: SubscriptionStatus.EXPIRED,
        plan: null,
        mockPaperLimit: 0,
        mockPaperUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: now,
      });
    });
  },

  getStudentSubscription: async (organizerId: string, studentId: string) => {
    const subscription = await prisma.studentSubscription.findUnique({
      where: { organizerId_studentId: { organizerId, studentId } },
      select: studentSubscriptionSelect,
    });
    if (!subscription) throw new HttpError(404, 'Student subscription not found');
    return toStudentSubscriptionSummary(subscription);
  },

  getOwnStudentSubscription: async (organizerId: string, studentId: string) => subscriptionService.getStudentSubscription(organizerId, studentId),

  upsertStudentSubscription: async (
    organizerId: string,
    studentId: string,
    input: { status?: SubscriptionStatus; mockPaperLimit?: number; currentPeriodStart?: Date; currentPeriodEnd: Date }
  ) => {
    await assertStudentInOrganizer(organizerId, studentId);
    const plan = await prisma.studentSubscriptionPlan.upsert({
      where: { organizerId_code: { organizerId, code: FIXED_STUDENT_PLAN_CODE } },
      update: {},
      create: {
        organizerId,
        code: FIXED_STUDENT_PLAN_CODE,
        name: 'Fixed Mock Paper Access',
        mockPaperLimit: 20,
        periodDays: 30,
        isActive: true,
      },
    });
    const mockPaperLimit = input.mockPaperLimit ?? plan.mockPaperLimit;
    const subscription = await prisma.studentSubscription.upsert({
      where: { organizerId_studentId: { organizerId, studentId } },
      create: {
        organizerId,
        studentId,
        planId: plan.id,
        status: input.status ?? SubscriptionStatus.ACTIVE,
        mockPaperLimit,
        mockPaperUsed: 0,
        currentPeriodStart: input.currentPeriodStart ?? new Date(),
        currentPeriodEnd: input.currentPeriodEnd,
      },
      update: {
        planId: plan.id,
        status: input.status,
        mockPaperLimit,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
      },
      select: studentSubscriptionSelect,
    });
    return toStudentSubscriptionSummary(subscription);
  },

  resetStudentMockPaperUsage: async (organizerId: string, studentId: string) => {
    const subscription = await prisma.studentSubscription.update({
      where: { organizerId_studentId: { organizerId, studentId } },
      data: { mockPaperUsed: 0 },
      select: studentSubscriptionSelect,
    }).catch(() => null);
    if (!subscription) throw new HttpError(404, 'Student subscription not found');
    return toStudentSubscriptionSummary(subscription);
  },

  listStudentSubscriptionPlans: async (organizerId: string) => {
    const plans = await prisma.studentSubscriptionPlan.findMany({
      where: { organizerId },
      select: studentSubscriptionPlanSelect,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return plans.map(toStudentSubscriptionPlanSummary);
  },

  getStudentSubscriptionPlan: async (organizerId: string, planId: string) => {
    const plan = await prisma.studentSubscriptionPlan.findFirst({ where: { id: planId, organizerId }, select: studentSubscriptionPlanSelect });
    if (!plan) throw new HttpError(404, 'Student subscription plan not found');
    return toStudentSubscriptionPlanSummary(plan);
  },

  createStudentSubscriptionPlan: async (
    organizerId: string,
    input: {
      code: string;
      name: string;
      mockPaperLimit: number;
      periodDays?: number;
      isActive?: boolean;
      provider?: string | null;
      providerPriceId?: string | null;
    }
  ) => {
    const existing = await prisma.studentSubscriptionPlan.findUnique({
      where: { organizerId_code: { organizerId, code: input.code } },
      select: { id: true },
    });
    if (existing) throw new HttpError(409, 'Student subscription plan code already exists');

    const plan = await prisma.studentSubscriptionPlan.create({
      data: {
        organizerId,
        code: input.code,
        name: input.name,
        mockPaperLimit: input.mockPaperLimit,
        periodDays: input.periodDays,
        isActive: input.isActive,
        provider: input.provider,
        providerPriceId: input.providerPriceId,
      },
      select: studentSubscriptionPlanSelect,
    });
    return toStudentSubscriptionPlanSummary(plan);
  },

  updateStudentSubscriptionPlan: async (
    organizerId: string,
    planId: string,
    input: {
      code?: string;
      name?: string;
      mockPaperLimit?: number;
      periodDays?: number;
      isActive?: boolean;
      provider?: string | null;
      providerPriceId?: string | null;
    }
  ) => {
    const existing = await prisma.studentSubscriptionPlan.findFirst({ where: { id: planId, organizerId }, select: { id: true } });
    if (!existing) throw new HttpError(404, 'Student subscription plan not found');

    if (input.code) {
      const duplicate = await prisma.studentSubscriptionPlan.findUnique({
        where: { organizerId_code: { organizerId, code: input.code } },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== planId) throw new HttpError(409, 'Student subscription plan code already exists');
    }

    const plan = await prisma.studentSubscriptionPlan.update({
      where: { id: planId },
      data: input,
      select: studentSubscriptionPlanSelect,
    });
    return toStudentSubscriptionPlanSummary(plan);
  },

  deleteStudentSubscriptionPlan: async (organizerId: string, planId: string) => {
    const existing = await prisma.studentSubscriptionPlan.findFirst({ where: { id: planId, organizerId }, select: { id: true } });
    if (!existing) throw new HttpError(404, 'Student subscription plan not found');
    await prisma.studentSubscriptionPlan.delete({ where: { id: planId } });
    return { id: planId };
  },

  assertStudentMockPaperAccess: async ({ organizerId, studentId }: { organizerId: string; studentId: string }) => {
    await subscriptionService.assertOrganizerPlatformAccess(organizerId);
    const subscription = await prisma.studentSubscription.findUnique({ where: { organizerId_studentId: { organizerId, studentId } } });
    return assertActiveSubscription(subscription, 'Student mock-paper subscription is inactive or expired');
  },

  assertStudentMockPaperQuota: async ({ organizerId, studentId }: { organizerId: string; studentId: string }) => {
    const subscription = await subscriptionService.assertStudentMockPaperAccess({ organizerId, studentId });
    return assertMockPaperQuota(subscription);
  },

  incrementStudentMockPaperUsageOrThrow: async (tx: Prisma.TransactionClient, organizerId: string, studentId: string, now = new Date()) => {
    const result = await tx.studentSubscription.updateMany({
      where: {
        organizerId,
        studentId,
        status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] },
        currentPeriodEnd: { gt: now },
        mockPaperUsed: { lt: prisma.studentSubscription.fields.mockPaperLimit },
      },
      data: { mockPaperUsed: { increment: 1 } },
    });
    if (result.count !== 1) throw new HttpError(403, 'Mock paper quota exhausted or subscription is inactive');
  },
};
