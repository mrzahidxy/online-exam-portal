import { OrganizerRole } from '@prisma/client';
import { Router } from 'express';

import { mockPaperController } from '../controllers/mock-paper.controller';
import { requireActiveOrganizer, requireAuth, requireOrganizerMembership, requireOrganizerRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  generateMockPaperSchema,
  gradeMockSubmissionSchema,
  listMockSubmissionsQuerySchema,
  mockPaperIdParamSchema,
  mockSubmissionIdParamSchema,
  submitMockPaperSchema,
} from '../schemas/mock-paper.schema';

const router = Router();
const organizerAccess = [requireAuth(), requireOrganizerMembership(), requireActiveOrganizer()];
const ownerAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.OWNER)];
const studentAccess = [...organizerAccess, requireOrganizerRole(OrganizerRole.STUDENT)];

router.get('/submissions', ...ownerAccess, validateRequest(listMockSubmissionsQuerySchema, 'query'), mockPaperController.listSubmissions);

router.get('/submissions/:submissionId', ...organizerAccess, validateRequest(mockSubmissionIdParamSchema, 'params'), mockPaperController.getSubmissionById);

router.post(
  '/submissions/:submissionId/grades',
  ...ownerAccess,
  validateRequest(mockSubmissionIdParamSchema, 'params'),
  validateRequest(gradeMockSubmissionSchema),
  mockPaperController.gradeSubmission
);

router.get(
  '/submissions/:submissionId/feedback',
  ...studentAccess,
  validateRequest(mockSubmissionIdParamSchema, 'params'),
  mockPaperController.getFeedback
);

router.get('/', ...studentAccess, mockPaperController.listOwn);
router.post('/', ...studentAccess, validateRequest(generateMockPaperSchema), mockPaperController.generate);

router.get('/:mockPaperId', ...organizerAccess, validateRequest(mockPaperIdParamSchema, 'params'), mockPaperController.getById);

router.post(
  '/:mockPaperId/archive',
  ...studentAccess,
  validateRequest(mockPaperIdParamSchema, 'params'),
  mockPaperController.archiveOwn
);

router.post(
  '/:mockPaperId/submissions',
  ...studentAccess,
  validateRequest(mockPaperIdParamSchema, 'params'),
  validateRequest(submitMockPaperSchema),
  mockPaperController.submit
);

export default router;
