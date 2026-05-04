import { PaperStatus } from '@prisma/client';
import { z } from 'zod';

const questionTypeSchema = z.enum(['DESCRIPTIVE', 'MCQ', 'GRAPH', 'TABLE', 'CIRCUIT']);

const mcqOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const mcqOptionsSchema = z.object({
  options: z.array(mcqOptionSchema).min(2),
});

const subQuestionInputSchema = z
  .object({
    label: z.string().min(1),
    question: z.string().min(1),
    marks: z.number().int().positive(),
    position: z.number().int().positive(),
    questionType: questionTypeSchema.optional().default('DESCRIPTIVE'),
    mcqOptions: mcqOptionsSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.questionType === 'MCQ') {
        return data.mcqOptions !== undefined;
      }
      return true;
    },
    {
      message: 'MCQ options are required when question type is mcq',
    }
  );

const questionInputSchema = z.object({
  contentHtml: z.string().min(1),
  marks: z.number().int().positive(),
  position: z.number().int().positive(),
  subQuestions: z.array(subQuestionInputSchema).min(1),
});

const updateSubQuestionInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    label: z.string().min(1).optional(),
    question: z.string().min(1).optional(),
    marks: z.number().int().positive().optional(),
    position: z.number().int().positive().optional(),
    questionType: questionTypeSchema.optional(),
    mcqOptions: mcqOptionsSchema.optional(),
  })
  .refine((data) => data.id || (data.position && data.label), {
    message: 'Sub-question id or both position and label are required',
  })
  .refine(
    (data) =>
      data.label !== undefined ||
      data.question !== undefined ||
      data.marks !== undefined ||
      data.position !== undefined ||
      data.questionType !== undefined ||
      data.mcqOptions !== undefined,
    { message: 'At least one sub-question field must be provided' }
  )
  .refine(
    (data) => {
      if (data.questionType === 'MCQ') {
        return data.mcqOptions !== undefined;
      }
      return true;
    },
    {
      message: 'MCQ options are required when question type is mcq',
    }
  );

const updateQuestionInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    position: z.number().int().positive().optional(),
    contentHtml: z.string().min(1).optional(),
    marks: z.number().int().positive().optional(),
    subQuestions: z.array(updateSubQuestionInputSchema).optional(),
  })
  .refine((data) => data.id || data.position, {
    message: 'Question id or position is required',
  })
  .refine(
    (data) =>
      data.contentHtml !== undefined ||
      data.marks !== undefined ||
      (data.subQuestions && data.subQuestions.length > 0),
    { message: 'At least one question field must be provided' }
  );

export const paperIdParamSchema = z.object({
  paperId: z.string().uuid(),
});

export const listPapersQuerySchema = z.object({
  status: z.nativeEnum(PaperStatus).optional(),
  search: z.string().min(1).optional(),
  startDateFrom: z.coerce.date().optional(),
  startDateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const createPaperSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  earlySubmissionRestrictionMinutes: z.number().int().min(0).nullable().optional(),
  status: z.nativeEnum(PaperStatus).optional(),
  questions: z.array(questionInputSchema).optional(),
});

export const updatePaperSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  earlySubmissionRestrictionMinutes: z.number().int().min(0).nullable().optional(),
  status: z.nativeEnum(PaperStatus).optional(),
});

export const createQuestionsSchema = z.array(questionInputSchema).min(1);
export const updateQuestionsSchema = z.array(updateQuestionInputSchema).min(1);

export type CreatePaperInput = z.infer<typeof createPaperSchema>;
export type UpdatePaperInput = z.infer<typeof updatePaperSchema>;
export type ListPapersQuery = z.infer<typeof listPapersQuerySchema>;
export type CreateQuestionInput = z.infer<typeof questionInputSchema>;
export type CreateQuestionsInput = z.infer<typeof createQuestionsSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionInputSchema>;
export type UpdateQuestionsInput = z.infer<typeof updateQuestionsSchema>;
export type UpdateSubQuestionInput = z.infer<typeof updateSubQuestionInputSchema>;
