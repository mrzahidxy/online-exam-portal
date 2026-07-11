import { OrganizerRole } from '@prisma/client';
import { Router } from 'express';

import { accessRequestController } from '../controllers/access-request.controller';
import { requireActiveOrganizer, requireAuth, requireOrganizerMembership, requireOrganizerRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  accessRequestIdParamSchema,
  createAccessRequestSchema,
  listAccessRequestQuerySchema,
  updateAccessRequestSchema,
} from '../schemas/access-request.schema';

const router = Router();
const organizerAccess = [requireAuth(), requireOrganizerMembership(), requireActiveOrganizer()];
const ownerAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.OWNER)];
const studentAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.STUDENT)];

router.get(
  '/',
  ...organizerAccess,
  validateRequest(listAccessRequestQuerySchema, 'query'),
  accessRequestController.list
);

router.post('/', ...studentAccess, validateRequest(createAccessRequestSchema), accessRequestController.create);

router.patch(
  '/:id',
  ...ownerAccess,
  validateRequest(accessRequestIdParamSchema, 'params'),
  validateRequest(updateAccessRequestSchema),
  accessRequestController.updateStatus
);

export default router;
