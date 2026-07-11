import { z } from 'zod';

export const registerSchema = z.object({
  registrationType: z.enum(['ORGANIZER', 'STUDENT']).optional().default('STUDENT'),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  schoolCode: z.string().min(1).optional(),
  organizerName: z.string().min(2).max(100).optional(),
  organizerSlug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
}).superRefine((value, ctx) => {
  if (value.registrationType === 'ORGANIZER' && !value.organizerName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['organizerName'], message: 'Organizer name is required' });
  }
  if (value.registrationType === 'STUDENT' && !value.schoolCode && !value.organizerSlug) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['schoolCode'], message: 'School code or organizer slug is required' });
  }
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
