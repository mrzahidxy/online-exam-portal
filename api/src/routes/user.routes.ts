import { OrganizerRole } from '@prisma/client';
import { Router } from 'express';

import { userController } from '../controllers/user.controller';
import { requireActiveOrganizer, requireAuth, requireOrganizerMembership, requireOrganizerRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from '../schemas/user.schema';

const router = Router();
const organizerAccess = [requireAuth(), requireOrganizerMembership(), requireActiveOrganizer()];
const ownerAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.OWNER)];

router.get('/', ...ownerAccess, validateRequest(listUsersQuerySchema, 'query'), userController.list);

router.get(
  '/:id',
  ...organizerAccess,
  validateRequest(userIdParamSchema, 'params'),
  userController.getById
);

router.patch(
  '/:id',
  requireAuth(),
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(updateUserSchema),
  userController.update
);

router.delete(
  '/:id',
  ...ownerAccess,
  validateRequest(userIdParamSchema, 'params'),
  userController.remove
);

export default router;
