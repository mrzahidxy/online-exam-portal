import { z } from 'zod';

export const examIncidentSchema = z.object({
  paperId: z.string().uuid(),
  violationType: z.enum([
    'COPY_SHORTCUT',
    'PASTE_SHORTCUT',
    'CUT_SHORTCUT',
    'ALT_TAB',
    'WINDOW_SWITCH',
    'FULLSCREEN_EXIT',
    'DEVTOOLS',
    'KEYBOARD_SHORTCUT',
  ]),
  details: z.string().min(1).optional(),
});

export const examUnlockSchema = z.object({
  paperId: z.string().uuid(),
  code: z.string().min(1),
});

export const rotateExamUnlockCodeSchema = z.object({});

export type ExamIncidentInput = z.infer<typeof examIncidentSchema>;
export type ExamUnlockInput = z.infer<typeof examUnlockSchema>;
export type RotateExamUnlockCodeInput = z.infer<typeof rotateExamUnlockCodeSchema>;
