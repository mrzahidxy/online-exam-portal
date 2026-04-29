import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { paperController } from '../controllers/paper.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createPaperSchema,
  createQuestionsSchema,
  listPapersQuerySchema,
  paperIdParamSchema,
  updatePaperSchema,
  updateQuestionsSchema,
} from '../schemas/paper.schema';

const router = Router();

router.get('/', requireAuth(), validateRequest(listPapersQuerySchema, 'query'), paperController.list);

router.get('/:paperId', requireAuth(), validateRequest(paperIdParamSchema, 'params'), paperController.getById);

router.post('/', requireAuth([UserRole.ADMIN]), validateRequest(createPaperSchema), paperController.create);

router.patch(
  '/:paperId',
  requireAuth([UserRole.ADMIN]),
  validateRequest(paperIdParamSchema, 'params'),
  validateRequest(updatePaperSchema),
  paperController.update
);

router.post(
  '/:paperId/questions',
  requireAuth([UserRole.ADMIN]),
  validateRequest(paperIdParamSchema, 'params'),
  validateRequest(createQuestionsSchema),
  paperController.addQuestions
);

router.patch(
  '/:paperId/questions',
  requireAuth([UserRole.ADMIN]),
  validateRequest(paperIdParamSchema, 'params'),
  validateRequest(updateQuestionsSchema),
  paperController.updateQuestions
);

export default router;
