import { randomUUID } from 'crypto';
import path from 'path';

import { Storage } from '@google-cloud/storage';

import { env } from './env';

const storage = new Storage();

export interface UploadBufferOptions {
  contentType: string;
  destination?: string;
  bucket?: string;
}

export const uploadBufferToGcs = async (
  buffer: Buffer,
  { contentType, destination, bucket }: UploadBufferOptions
) => {
  const bucketName = bucket ?? env.GCP_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCP_BUCKET_NAME is not configured');
  }

  const objectName =
    destination ??
    path
      .join('uploads', `${Date.now()}-${randomUUID()}`)
      .replace(/\\/g, '/');

  const file = storage.bucket(bucketName).file(objectName);

  await file.save(buffer, {
    resumable: false,
    public: true,
    contentType,
  });

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;

  return {
    url: publicUrl,
    bucket: bucketName,
    objectName,
    contentType,
    size: buffer.length,
  };
};
