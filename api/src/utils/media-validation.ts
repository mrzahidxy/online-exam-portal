import { HttpError } from './http-error';

const imageTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
const videoTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/x-msvideo',
  'video/mov',
  'video/quicktime',
]);

export type UploadedMediaType = 'image' | 'video';

const hasMatchingSignature = (file: Express.Multer.File) => {
  const bytes = file.buffer;
  const mimeType = file.mimetype.toLowerCase();

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/gif') {
    return bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a';
  }
  if (mimeType === 'image/webp') {
    return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mimeType === 'video/webm') return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mimeType === 'video/ogg') return bytes.subarray(0, 4).toString('ascii') === 'OggS';
  if (mimeType === 'video/avi' || mimeType === 'video/x-msvideo') {
    return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'AVI ';
  }
  if (mimeType === 'video/mp4' || mimeType === 'video/mov' || mimeType === 'video/quicktime') {
    return bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  return false;
};

export const validateUploadedMedia = (
  file: Express.Multer.File,
  expectedType?: UploadedMediaType,
): UploadedMediaType => {
  const mimeType = file.mimetype.toLowerCase();
  const mediaType = imageTypes.has(mimeType) ? 'image' : videoTypes.has(mimeType) ? 'video' : null;

  if (!mediaType || (expectedType && mediaType !== expectedType)) {
    throw new HttpError(400, expectedType === 'image' ? 'Only supported image formats are accepted' : 'Unsupported media format');
  }

  if (!file.buffer?.length || !hasMatchingSignature(file)) {
    throw new HttpError(400, 'File content does not match its declared format');
  }

  return mediaType;
};
