import { Router } from 'express';
import { UserRole } from '@prisma/client';

import { securityController } from '../controllers/security.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  examIncidentSchema,
  examUnlockSchema,
  rotateExamUnlockCodeSchema,
} from '../schemas/security.schema';

const router = Router();

router.post('/incidents', requireAuth(), validateRequest(examIncidentSchema), securityController.logIncident);

router.post('/exam-unlock', requireAuth(), validateRequest(examUnlockSchema), securityController.verifyUnlockCode);

router.post(
  '/exam-unlock/rotate',
  requireAuth([UserRole.ADMIN]),
  validateRequest(rotateExamUnlockCodeSchema),
  securityController.rotateUnlockCode
);

export default router;
