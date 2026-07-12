import { Router } from 'express';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import uploadRoutes from './upload.routes';
import paperRoutes from './paper.routes';
import accessRequestRoutes from './access-request.routes';
import submissionRoutes from './submission.routes';
import mockPaperRoutes from './mock-paper.routes';
import questionCategoryRoutes from './question-category.routes';
import subscriptionRoutes from './subscription.routes';
import adminSubscriptionRoutes from './admin-subscription.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);
router.use('/papers', paperRoutes);
router.use('/access-requests', accessRequestRoutes);
router.use('/submissions', submissionRoutes);
router.use('/mock-papers', mockPaperRoutes);
router.use('/question-categories', questionCategoryRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/admin/subscriptions', adminSubscriptionRoutes);

export default router;
