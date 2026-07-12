import { OrganizerRole } from '@prisma/client';
import { Router } from 'express';

import { questionCategoryController } from '../controllers/question-category.controller';
import { requireActiveOrganizer, requireAuth, requireOrganizerMembership, requireOrganizerRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  addExistingQuestionToCategorySchema,
  categoryIdParamSchema,
  categoryQuestionParamSchema,
  createCategoryQuestionSchema,
  createQuestionCategorySchema,
  sourceQuestionsQuerySchema,
  updateQuestionCategorySchema,
} from '../schemas/question-category.schema';

const router = Router();
const organizerAccess = [requireAuth(), requireOrganizerMembership(), requireActiveOrganizer()];
const ownerAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.OWNER)];

router.get('/active', ...organizerAccess, questionCategoryController.listActive);
router.get('/source-questions', ...ownerAccess, validateRequest(sourceQuestionsQuerySchema, 'query'), questionCategoryController.listSourceQuestions);
router.get('/', ...ownerAccess, questionCategoryController.list);
router.post('/', ...ownerAccess, validateRequest(createQuestionCategorySchema), questionCategoryController.create);

router.get('/:categoryId', ...organizerAccess, validateRequest(categoryIdParamSchema, 'params'), questionCategoryController.getById);
router.patch('/:categoryId', ...ownerAccess, validateRequest(categoryIdParamSchema, 'params'), validateRequest(updateQuestionCategorySchema), questionCategoryController.update);
router.delete('/:categoryId', ...ownerAccess, validateRequest(categoryIdParamSchema, 'params'), questionCategoryController.delete);

router.post(
  '/:categoryId/questions/existing',
  ...ownerAccess,
  validateRequest(categoryIdParamSchema, 'params'),
  validateRequest(addExistingQuestionToCategorySchema),
  questionCategoryController.addExistingQuestion
);

router.post(
  '/:categoryId/questions',
  ...ownerAccess,
  validateRequest(categoryIdParamSchema, 'params'),
  validateRequest(createCategoryQuestionSchema),
  questionCategoryController.createCategoryQuestion
);

router.delete(
  '/:categoryId/questions/:questionId',
  ...ownerAccess,
  validateRequest(categoryQuestionParamSchema, 'params'),
  questionCategoryController.removeQuestion
);

export default router;
