"use client";

export interface MediaUploadResult {
  url: string;
  fileName: string;
  mediaType: "image" | "video";
}

export interface MediaUploadOptions {
  maxSize?: number; // in bytes
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api").replace(/\/$/, "");

/**
 * Upload media through the authenticated API route backed by Cloudinary.
 */
export async function uploadMediaToCloudinary(
  file: File,
  options: MediaUploadOptions = {}
): Promise<MediaUploadResult> {
  const { maxSize = 50 * 1024 * 1024 } = options;

  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
  }

  validateMediaFile(file);

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/uploads/media`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // ignore
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Upload failed (${response.status})`);
  }

  return {
    url: payload.url,
    fileName: payload.fileName,
    mediaType: payload.mediaType,
  };
}

/**
 * Determine if file is image or video
 */
export function getMediaType(file: File): "image" | "video" {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  return "image";
}

/**
 * Validate media file type and size
 */
export function validateMediaFile(file: File): void {
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
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

  const isImage = allowedImageTypes.includes(file.type);
  const isVideo = allowedVideoTypes.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error(
      "File type not supported. Please upload images (JPEG, PNG, GIF, WebP) or videos (MP4, WebM, OGG, AVI, MOV)"
    );
  }
}

/**
 * Create file input for media selection
 */
export function createMediaFileInput(
  accept: string,
  onFileSelect: (file: File) => void
): void {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", accept);
  input.style.display = "none";

  input.onchange = function () {
    const file = (this as HTMLInputElement).files?.[0];
    if (file) {
      try {
        validateMediaFile(file);
        onFileSelect(file);
      } catch (error) {
        console.error("File validation error:", error);
        alert(error instanceof Error ? error.message : "Invalid file selected");
      }
    }
  };

  input.click();
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
