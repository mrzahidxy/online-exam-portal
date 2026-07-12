import { Router } from 'express';

import { subscriptionController } from '../controllers/subscription.controller';
import { requireAuth, requireOrganizerMembership } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth(), requireOrganizerMembership(), subscriptionController.getCurrent);
router.get('/mock-paper', requireAuth(), requireOrganizerMembership(), subscriptionController.getOwnStudentSubscription);

export default router;
