import { HttpError } from '../utils/http-error';
import { env } from '../utils/env';
import { validateUploadedMedia } from '../utils/media-validation';
import { createHash } from 'node:crypto';

const buildCloudinarySignature = (folder: string, timestamp: string, apiSecret: string) => {
  const serialized = `folder=${folder}&timestamp=${timestamp}`;
  return createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
};

const uploadToCloudinary = async (file: Express.Multer.File, expectedType?: 'image' | 'video') => {
  const mediaType = validateUploadedMedia(file, expectedType);
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new HttpError(503, 'Media uploads are temporarily unavailable');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = `${env.CLOUDINARY_FOLDER}/${mediaType === 'image' ? 'images' : 'videos'}`;
  const signature = buildCloudinarySignature(folder, timestamp, CLOUDINARY_API_SECRET);
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('folder', folder);
  formData.append('signature', signature);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json().catch(() => null) as { secure_url?: unknown; public_id?: unknown } | null;
      if (!response.ok || typeof result?.secure_url !== 'string' || typeof result.public_id !== 'string') {
        throw new Error('Cloudinary rejected the upload');
      }

      return {
        url: result.secure_url,
        fileName: result.public_id,
        mediaType,
      };
    } catch {
      throw new HttpError(502, 'Media upload failed');
    }
};

export const uploadService = {
  uploadImage: (file: Express.Multer.File) => uploadToCloudinary(file, 'image'),
  uploadMedia: (file: Express.Multer.File) => uploadToCloudinary(file),
};
