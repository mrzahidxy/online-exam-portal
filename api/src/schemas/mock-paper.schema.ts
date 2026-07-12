import { MockSubmissionStatus } from '@prisma/client';
import { z } from 'zod';

const answerInputSchema = z.object({
  subQuestionId: z.string().uuid(),
  answerText: z.string().min(1),
});

const gradeInputSchema = z.object({
  subQuestionId: z.string().uuid(),
  assignedMarks: z.number().int().min(0),
  comment: z.string().trim().min(1).optional(),
});

export const mockPaperIdParamSchema = z.object({
  mockPaperId: z.string().uuid(),
});

export const mockSubmissionIdParamSchema = z.object({
  submissionId: z.string().uuid(),
});

export const generateMockPaperSchema = z.object({
  title: z.string().trim().min(1).optional(),
  categoryIds: z.array(z.string().uuid()).min(1),
});

export const submitMockPaperSchema = z.object({
  answers: z.array(answerInputSchema),
});

export const gradeMockSubmissionSchema = z.object({
  grades: z.array(gradeInputSchema).min(1),
});

export const listMockSubmissionsQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  mockPaperId: z.string().uuid().optional(),
  status: z.nativeEnum(MockSubmissionStatus).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export type GenerateMockPaperInput = z.infer<typeof generateMockPaperSchema>;
export type SubmitMockPaperInput = z.infer<typeof submitMockPaperSchema>;
export type GradeMockSubmissionInput = z.infer<typeof gradeMockSubmissionSchema>;
export type ListMockSubmissionsQuery = z.infer<typeof listMockSubmissionsQuerySchema>;
