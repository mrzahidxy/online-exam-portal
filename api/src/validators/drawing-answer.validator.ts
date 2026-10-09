import { z } from 'zod';

import { HttpError } from '../utils/http-error';

export const MAX_DRAWING_ANSWER_BYTES = 256 * 1024;
const MAX_DRAWING_CANVAS_DIMENSION = 4096;
const MAX_DRAWING_ELEMENTS = 500;
const MAX_DRAWING_POINTS = 10_000;

const pointSchema = z.object({
  x: z.number().int().min(0).max(MAX_DRAWING_CANVAS_DIMENSION),
  y: z.number().int().min(0).max(MAX_DRAWING_CANVAS_DIMENSION),
}).strict();

const baseElement = {
  id: z.string().min(1).max(128),
  color: z.string().min(1).max(64),
  strokeWidth: z.number().finite().min(1).max(24),
};

const drawingElementSchema = z.discriminatedUnion('kind', [
  z.object({
    ...baseElement,
    kind: z.literal('freehand'),
    points: z.array(pointSchema).min(2).max(MAX_DRAWING_POINTS),
  }).strict(),
  z.object({
    ...baseElement,
    kind: z.enum(['line', 'rectangle', 'circle', 'arrow']),
    from: pointSchema,
    to: pointSchema,
  }).strict(),
]);

const drawingAnswerSchema = z.object({
  version: z.literal(1),
  type: z.literal('drawing'),
  canvas: z.object({
    width: z.number().int().positive().max(MAX_DRAWING_CANVAS_DIMENSION),
    height: z.number().int().positive().max(MAX_DRAWING_CANVAS_DIMENSION),
  }).strict(),
  elements: z.array(drawingElementSchema).max(MAX_DRAWING_ELEMENTS),
}).strict().superRefine((answer, context) => {
  let pointCount = 0;

  answer.elements.forEach((element, index) => {
    const points = element.kind === 'freehand'
      ? element.points
      : [element.from, element.to];
    pointCount += points.length;

    points.forEach((point, pointIndex) => {
      if (point.x > answer.canvas.width || point.y > answer.canvas.height) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['elements', index, element.kind === 'freehand' ? 'points' : pointIndex === 0 ? 'from' : 'to'],
          message: 'Drawing points must stay within the canvas',
        });
      }
    });
  });

  if (pointCount > MAX_DRAWING_POINTS) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['elements'],
      message: 'Drawing contains too many points',
    });
  }
});

export const validateDrawingAnswer = (answerText: string) => {
  if (Buffer.byteLength(answerText, 'utf8') > MAX_DRAWING_ANSWER_BYTES) {
    throw new HttpError(413, 'Drawing answer exceeds the payload limit');
  }

  let value: unknown;
  try {
    value = JSON.parse(answerText);
  } catch {
    throw new HttpError(400, 'Drawing answer must be valid JSON');
  }

  const result = drawingAnswerSchema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'Drawing answer has an invalid format');
  }

  return result.data;
};
