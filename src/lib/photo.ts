import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { put } from "@vercel/blob";
import { UPLOAD_DIR } from "./db";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Stores a photo attached to a check and returns what goes into
 * `checks.photo`:
 *
 * - a Vercel Blob URL when BLOB_READ_WRITE_TOKEN is set (production);
 * - a local filename served by /api/uploads/[name] otherwise (local dev).
 *
 * On Vercel without a Blob store this throws, so the caller can fail loudly
 * rather than save a record whose photo will 404 later.
 */
export async function storePhoto(siteId: string, file: File): Promise<string> {
  const extension = EXTENSIONS[file.type] ?? "jpg";
  const fileName = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`checks/${siteId}/${fileName}`, bytes, {
      access: "public",
      contentType: file.type || "image/jpeg",
      addRandomSuffix: true,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Photo storage is not configured: set BLOB_READ_WRITE_TOKEN by connecting a Vercel Blob store.",
    );
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), bytes);
  return fileName;
}

/**
 * Photos are either an absolute Vercel Blob URL or a legacy local filename
 * written before the move to object storage.
 */
export function photoUrl(photo: string): string {
  return /^https?:\/\//i.test(photo)
    ? photo
    : `/api/uploads/${encodeURIComponent(photo)}`;
}
