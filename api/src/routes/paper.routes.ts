import { OrganizerRole } from '@prisma/client';
import { Router } from 'express';

import { paperController } from '../controllers/paper.controller';
import { requireActiveOrganizer, requireAuth, requireOrganizerMembership, requireOrganizerRole } from '../middleware/auth.middleware';
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
const organizerAccess = [requireAuth(), requireOrganizerMembership(), requireActiveOrganizer()];
const ownerAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.OWNER)];

router.get('/', ...organizerAccess, validateRequest(listPapersQuerySchema, 'query'), paperController.list);

router.get('/:paperId', ...organizerAccess, validateRequest(paperIdParamSchema, 'params'), paperController.getById);

router.post('/', ...ownerAccess, validateRequest(createPaperSchema), paperController.create);

router.patch(
  '/:paperId',
  ...ownerAccess,
  validateRequest(paperIdParamSchema, 'params'),
  validateRequest(updatePaperSchema),
  paperController.update
);

router.post(
  '/:paperId/questions',
  ...ownerAccess,
  validateRequest(paperIdParamSchema, 'params'),
  validateRequest(createQuestionsSchema),
  paperController.addQuestions
);

router.patch(
  '/:paperId/questions',
  ...ownerAccess,
  validateRequest(paperIdParamSchema, 'params'),
  validateRequest(updateQuestionsSchema),
  paperController.updateQuestions
);

export default router;
