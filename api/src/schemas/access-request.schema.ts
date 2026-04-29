import { AccessStatus } from '@prisma/client';
import { z } from 'zod';

export const createAccessRequestSchema = z.object({
  paperId: z.string().uuid(),
});

export const listAccessRequestQuerySchema = z.object({
  status: z.nativeEnum(AccessStatus).optional(),
  paperId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const accessRequestIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateAccessRequestSchema = z.object({
  status: z.nativeEnum(AccessStatus),
});

export type CreateAccessRequestInput = z.infer<typeof createAccessRequestSchema>;
export type ListAccessRequestQuery = z.infer<typeof listAccessRequestQuerySchema>;
export type UpdateAccessRequestInput = z.infer<typeof updateAccessRequestSchema>;
