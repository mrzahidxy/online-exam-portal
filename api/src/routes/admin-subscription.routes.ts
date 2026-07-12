import { Router } from 'express';

import { adminSubscriptionController } from '../controllers/admin-subscription.controller';
import { requireAuth, requireOrganizerMembership } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createStudentSubscriptionPlanSchema,
  planIdParamSchema,
  studentIdParamSchema,
  subscriptionIdParamSchema,
  updateAdminSubscriptionSchema,
  updateStudentSubscriptionPlanSchema,
  upsertStudentSubscriptionSchema,
} from '../schemas/admin-subscription.schema';

const router = Router();
const ownerAccess = [requireAuth(), requireOrganizerMembership()];

router.get('/', ...ownerAccess, adminSubscriptionController.list);
router.get('/plans', ...ownerAccess, adminSubscriptionController.listPlans);
router.post('/plans', ...ownerAccess, validateRequest(createStudentSubscriptionPlanSchema), adminSubscriptionController.createPlan);
router.get('/plans/:planId', ...ownerAccess, validateRequest(planIdParamSchema, 'params'), adminSubscriptionController.getPlan);
router.patch(
  '/plans/:planId',
  ...ownerAccess,
  validateRequest(planIdParamSchema, 'params'),
  validateRequest(updateStudentSubscriptionPlanSchema),
  adminSubscriptionController.updatePlan
);
router.delete('/plans/:planId', ...ownerAccess, validateRequest(planIdParamSchema, 'params'), adminSubscriptionController.deletePlan);
router.get('/students', ...ownerAccess, adminSubscriptionController.listStudentSubscriptions);
router.get('/students/:studentId', ...ownerAccess, validateRequest(studentIdParamSchema, 'params'), adminSubscriptionController.getStudentSubscription);
router.put(
  '/students/:studentId',
  ...ownerAccess,
  validateRequest(studentIdParamSchema, 'params'),
  validateRequest(upsertStudentSubscriptionSchema),
  adminSubscriptionController.upsertStudentSubscription
);
router.post('/students/:studentId/reset-usage', ...ownerAccess, validateRequest(studentIdParamSchema, 'params'), adminSubscriptionController.resetStudentUsage);
router.get('/:subscriptionId', ...ownerAccess, validateRequest(subscriptionIdParamSchema, 'params'), adminSubscriptionController.getById);
router.patch(
  '/:subscriptionId',
  ...ownerAccess,
  validateRequest(subscriptionIdParamSchema, 'params'),
  validateRequest(updateAdminSubscriptionSchema),
  adminSubscriptionController.update
);

export default router;
