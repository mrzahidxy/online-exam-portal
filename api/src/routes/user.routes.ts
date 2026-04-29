import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from '../schemas/user.schema';

const router = Router();

router.get('/', requireAuth([UserRole.ADMIN]), validateRequest(listUsersQuerySchema, 'query'), userController.list);

router.get(
  '/:id',
  requireAuth(),
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
  requireAuth([UserRole.ADMIN]),
  validateRequest(userIdParamSchema, 'params'),
  userController.remove
);

export default router;
