import { SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';

export const subscriptionIdParamSchema = z.object({
  subscriptionId: z.string().uuid(),
});

export const studentIdParamSchema = z.object({
  studentId: z.string().uuid(),
});

export const planIdParamSchema = z.object({
  planId: z.string().uuid(),
});

export const updateAdminSubscriptionSchema = z
  .object({
    status: z.nativeEnum(SubscriptionStatus).optional(),
    planCode: z.string().min(1).optional(),
    currentPeriodEnd: z.coerce.date().optional(),
  })
  .refine((data) => data.status !== undefined || data.planCode !== undefined || data.currentPeriodEnd !== undefined, {
    message: 'At least one subscription field must be provided',
  });

export const upsertStudentSubscriptionSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus).optional(),
  mockPaperLimit: z.number().int().min(0).optional(),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date(),
});

export const createStudentSubscriptionPlanSchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(128),
  mockPaperLimit: z.number().int().min(0),
  periodDays: z.number().int().min(1).max(3650).optional(),
  isActive: z.boolean().optional(),
  provider: z.string().trim().min(1).max(64).nullable().optional(),
  providerPriceId: z.string().trim().min(1).max(255).nullable().optional(),
});

export const updateStudentSubscriptionPlanSchema = createStudentSubscriptionPlanSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one plan field must be provided',
});

export type UpdateAdminSubscriptionInput = z.infer<typeof updateAdminSubscriptionSchema>;
export type UpsertStudentSubscriptionInput = z.infer<typeof upsertStudentSubscriptionSchema>;
export type CreateStudentSubscriptionPlanInput = z.infer<typeof createStudentSubscriptionPlanSchema>;
export type UpdateStudentSubscriptionPlanInput = z.infer<typeof updateStudentSubscriptionPlanSchema>;
