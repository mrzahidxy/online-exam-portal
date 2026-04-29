import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { accessRequestController } from '../controllers/access-request.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  accessRequestIdParamSchema,
  createAccessRequestSchema,
  listAccessRequestQuerySchema,
  updateAccessRequestSchema,
} from '../schemas/access-request.schema';

const router = Router();

router.get(
  '/',
  requireAuth(),
  validateRequest(listAccessRequestQuerySchema, 'query'),
  accessRequestController.list
);

router.post('/', requireAuth(), validateRequest(createAccessRequestSchema), accessRequestController.create);

router.patch(
  '/:id',
  requireAuth([UserRole.ADMIN]),
  validateRequest(accessRequestIdParamSchema, 'params'),
  validateRequest(updateAccessRequestSchema),
  accessRequestController.updateStatus
);

export default router;
