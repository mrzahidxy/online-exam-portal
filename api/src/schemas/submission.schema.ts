import { SubmissionStatus } from '@prisma/client';
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

export const submissionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createSubmissionSchema = z.object({
  paperId: z.string().uuid(),
  answers: z.array(answerInputSchema).min(1),
});

export const listSubmissionsQuerySchema = z.object({
  paperId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: z.nativeEnum(SubmissionStatus).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const gradeSubmissionSchema = z.object({
  grades: z.array(gradeInputSchema).min(1),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
