import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { submissionController } from '../controllers/submission.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createSubmissionSchema,
  gradeSubmissionSchema,
  listSubmissionsQuerySchema,
  submissionIdParamSchema,
} from '../schemas/submission.schema';

const router = Router();

router.get(
  '/',
  requireAuth(),
  validateRequest(listSubmissionsQuerySchema, 'query'),
  submissionController.list
);

router.get(
  '/:id',
  requireAuth(),
  validateRequest(submissionIdParamSchema, 'params'),
  submissionController.getById
);

router.post('/', requireAuth([UserRole.STUDENT]), validateRequest(createSubmissionSchema), submissionController.create);

router.post(
  '/:id/grades',
  requireAuth([UserRole.ADMIN]),
  validateRequest(submissionIdParamSchema, 'params'),
  validateRequest(gradeSubmissionSchema),
  submissionController.grade
);

export default router;
