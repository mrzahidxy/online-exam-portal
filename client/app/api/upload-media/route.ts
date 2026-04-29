import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

export const runtime = "nodejs"; // IMPORTANT (avoid edge runtime)

type MediaType = "image" | "video";

interface MediaUploadResult {
  url: string; // signed url (safe default)
  fileName: string; // path inside bucket
  mediaType: MediaType;
  publicUrl?: string; // only useful if your bucket/object is publicly readable
}

function getEnv() {
  const env = {
    GCS_PROJECT_ID: process.env.GCS_PROJECT_ID,
    GCS_CLIENT_EMAIL: process.env.GCS_CLIENT_EMAIL,
    GCS_PRIVATE_KEY: process.env.GCS_PRIVATE_KEY,
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
  };

  const missing = Object.entries(env)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return {
    GCS_PROJECT_ID: env.GCS_PROJECT_ID!,
    GCS_CLIENT_EMAIL: env.GCS_CLIENT_EMAIL!,
    GCS_PRIVATE_KEY: env.GCS_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    GCS_BUCKET_NAME: env.GCS_BUCKET_NAME!,
  };
}

function getMediaType(file: File): MediaType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "image";
}

function validateMediaFile(file: File): void {
  const maxSize = 50 * 1024 * 1024; // 50MB

  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  // include common browser MIME variants
  const allowedVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime", // mov
    "video/x-msvideo", // avi
  ];

  if (file.size > maxSize) {
    throw new Error(
      `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`
    );
  }

  const isImage = allowedImageTypes.includes(file.type);
  const isVideo = allowedVideoTypes.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error(
      "File type not supported. Upload image (JPEG/PNG/GIF/WebP/SVG) or video (MP4/WebM/OGG/MOV/AVI)."
    );
  }
}

function toErrorPayload(err: unknown) {
  const e = err as any;

  const message = e?.message
    ? String(e.message)
    : typeof e === "string"
    ? e
    : JSON.stringify(e);

  const details = e?.response?.data ?? e?.errors ?? e;

  return { message, details };
}

async function uploadMediaToGCS(file: File): Promise<MediaUploadResult> {
  validateMediaFile(file);

  const env = getEnv();

  const storage = new Storage({
    projectId: env.GCS_PROJECT_ID,
    credentials: {
      client_email: env.GCS_CLIENT_EMAIL,
      private_key: env.GCS_PRIVATE_KEY,
    },
  });

  const bucket = storage.bucket(env.GCS_BUCKET_NAME);

  const mediaType = getMediaType(file);
  const folder = mediaType === "image" ? "images" : "videos";

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const fileName = `${folder}/${timestamp}-${random}.${ext}`;

  const fileRef = bucket.file(fileName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fileRef.save(buffer, {
    metadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000",
    },
    resumable: false,
  });

  // Works regardless of UBLA/public settings:
  const [signedUrl] = await fileRef.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  // Only works if bucket/object is publicly readable (IAM/public access):
  const publicUrl = `https://storage.googleapis.com/${env.GCS_BUCKET_NAME}/${fileName}`;

  return {
    url: signedUrl,
    publicUrl,
    fileName,
    mediaType,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadMediaToGCS(file);

    return NextResponse.json(
      {
        success: true,
        url: result.url, // signed url (reliable)
        publicUrl: result.publicUrl, // optional
        fileName: result.fileName,
        mediaType: result.mediaType,
      },
      { status: 200 }
    );
  } catch (err) {
    const { message, details } = toErrorPayload(err);

    // treat validation/env issues as 400/500 appropriately
    const status =
      message.startsWith("File ") ||
      message.startsWith("Missing environment variables")
        ? message.startsWith("File ")
          ? 400
          : 500
        : 500;

    console.error("Upload error:", err);

    return NextResponse.json({ error: message, details }, { status });
  }
}
