import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type MediaType = "image" | "video";

interface MediaUploadResult {
  url: string;
  fileName: string;
  mediaType: MediaType;
  publicUrl?: string;
}

function getEnv() {
  const env = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER,
  };

  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return {
    CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME!,
    CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY!,
    CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET!,
    CLOUDINARY_FOLDER: env.CLOUDINARY_FOLDER || "online-exam-portal",
  };
}

function getMediaType(file: File): MediaType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "image";
}

function validateMediaFile(file: File): void {
  const maxSize = 50 * 1024 * 1024;

  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  const allowedVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/avi",
    "video/x-msvideo",
    "video/mov",
    "video/quicktime",
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

function buildSignature(params: Record<string, string>, apiSecret: string) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

async function uploadMediaToCloudinary(file: File): Promise<MediaUploadResult> {
  validateMediaFile(file);

  const env = getEnv();
  const mediaType = getMediaType(file);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = `${env.CLOUDINARY_FOLDER}/${mediaType === "image" ? "images" : "videos"}`;
  const signature = buildSignature(
    {
      folder,
      timestamp,
    },
    env.CLOUDINARY_API_SECRET
  );

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("api_key", env.CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        `Cloudinary upload failed (${response.status})`
    );
  }

  return {
    url: payload.secure_url,
    publicUrl: payload.secure_url,
    fileName: payload.public_id,
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

    const result = await uploadMediaToCloudinary(file);

    return NextResponse.json(
      {
        success: true,
        url: result.url,
        publicUrl: result.publicUrl,
        fileName: result.fileName,
        mediaType: result.mediaType,
      },
      { status: 200 }
    );
  } catch (err) {
    const { message, details } = toErrorPayload(err);

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
