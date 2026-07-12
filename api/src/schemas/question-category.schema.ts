import { z } from 'zod';

const questionTypeSchema = z.enum(['DESCRIPTIVE', 'MCQ', 'GRAPH', 'TABLE']);

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
  .refine((data) => data.questionType !== 'MCQ' || data.mcqOptions !== undefined, {
    message: 'MCQ options are required when question type is mcq',
  });

export const categoryIdParamSchema = z.object({
  categoryId: z.string().uuid(),
});

export const categoryQuestionParamSchema = z.object({
  categoryId: z.string().uuid(),
  questionId: z.string().uuid(),
});

export const createQuestionCategorySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateQuestionCategorySchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.description !== undefined || data.isActive !== undefined,
    { message: 'At least one category field must be provided' }
  );

export const sourceQuestionsQuerySchema = z.object({
  paperId: z.string().uuid().optional(),
  search: z.string().min(1).optional(),
});

export const addExistingQuestionToCategorySchema = z.object({
  questionId: z.string().uuid(),
  position: z.number().int().positive(),
});

export const createCategoryQuestionSchema = z.object({
  paperId: z.string().uuid().nullable().optional(),
  contentHtml: z.string().min(1),
  marks: z.number().int().positive(),
  position: z.number().int().positive(),
  subQuestions: z.array(subQuestionInputSchema).min(1),
});

export type CreateQuestionCategoryInput = z.infer<typeof createQuestionCategorySchema>;
export type UpdateQuestionCategoryInput = z.infer<typeof updateQuestionCategorySchema>;
export type SourceQuestionsQuery = z.infer<typeof sourceQuestionsQuerySchema>;
export type AddExistingQuestionToCategoryInput = z.infer<typeof addExistingQuestionToCategorySchema>;
export type CreateCategoryQuestionInput = z.infer<typeof createCategoryQuestionSchema>;
