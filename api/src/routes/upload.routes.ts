import { NextFunction, Request, Response, Router } from 'express';
import { UserRole } from '@prisma/client';

import { uploadController } from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { isHttpError } from '../utils/http-error';
import multer from 'multer';

const router = Router();

const requireAdmin = requireAuth([UserRole.ADMIN]);

router.post('/image', requireAdmin, upload.single('file'), uploadController.uploadSingleImage);
router.post('/media', requireAdmin, upload.single('file'), uploadController.uploadMedia);

router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File exceeds the upload size limit' });
  }
  if (isHttpError(error)) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Invalid upload request' });
  }
  return res.status(502).json({ message: 'Upload failed' });
});

export default router;
