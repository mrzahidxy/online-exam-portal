import { Router } from 'express';

import { uploadController } from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/image', requireAuth(), upload.single('file'), uploadController.uploadSingleImage);

export default router;