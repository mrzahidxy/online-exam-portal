import { QuestionType } from '@prisma/client';

import { betaQuestionTypes } from '../schemas/paper.schema';
import { HttpError } from './http-error';

export const isBetaQuestionType = (questionType: QuestionType) =>
  (betaQuestionTypes as readonly string[]).includes(questionType);

export const assertBetaQuestionType = (
  questionType: QuestionType,
  existingQuestionType?: QuestionType,
) => {
  if (isBetaQuestionType(questionType) || questionType === existingQuestionType) {
    return;
  }

  throw new HttpError(
    400,
    'New beta questions support only DESCRIPTIVE, MCQ, and DRAWING types',
  );
};
