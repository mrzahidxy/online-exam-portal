import { HttpError } from '../utils/http-error';
import { uploadBufferToGcs } from '../utils/gcs';

export const uploadService = {
  uploadImage: async (file: Express.Multer.File) => {
    if (!file.mimetype.startsWith('image/')) {
      throw new HttpError(400, 'Only image uploads are supported');
    }

    const result = await uploadBufferToGcs(file.buffer, {
      contentType: file.mimetype,
      destination: `uploads/images/${Date.now()}-${file.originalname}`,
    });

    return {
      url: result.url,
      bucket: result.bucket,
      objectName: result.objectName,
      bytes: result.size,
      contentType: result.contentType,
    };
  },
};
