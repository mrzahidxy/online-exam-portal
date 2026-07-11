import { OrganizerRole } from '@prisma/client';
import { Router } from 'express';

import { submissionController } from '../controllers/submission.controller';
import { requireActiveOrganizer, requireAuth, requireOrganizerMembership, requireOrganizerRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createSubmissionSchema,
  gradeSubmissionSchema,
  listSubmissionsQuerySchema,
  submissionIdParamSchema,
} from '../schemas/submission.schema';

const router = Router();
const organizerAccess = [requireAuth(), requireOrganizerMembership(), requireActiveOrganizer()];
const ownerAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.OWNER)];
const studentAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.STUDENT)];

router.get(
  '/',
  ...organizerAccess,
  validateRequest(listSubmissionsQuerySchema, 'query'),
  submissionController.list
);

router.get(
  '/:id',
  ...organizerAccess,
  validateRequest(submissionIdParamSchema, 'params'),
  submissionController.getById
);

router.post('/', ...studentAccess, validateRequest(createSubmissionSchema), submissionController.create);

router.post(
  '/:id/grades',
  ...ownerAccess,
  validateRequest(submissionIdParamSchema, 'params'),
  validateRequest(gradeSubmissionSchema),
  submissionController.grade
);

export default router;
