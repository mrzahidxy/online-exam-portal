import { Router } from 'express';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import uploadRoutes from './upload.routes';
import paperRoutes from './paper.routes';
import accessRequestRoutes from './access-request.routes';
import submissionRoutes from './submission.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);
router.use('/papers', paperRoutes);
router.use('/access-requests', accessRequestRoutes);
router.use('/submissions', submissionRoutes);

export default router;
