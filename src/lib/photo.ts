import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { put } from "@vercel/blob";
import { ensureSchema, getDb, UPLOAD_DIR } from "./db";
import { check_photos } from "./schema";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Stores a photo attached to a check and returns what goes into
 * `checks.photo`:
 *
 * - a Vercel Blob URL when BLOB_READ_WRITE_TOKEN is set (preferred);
 * - `db:<id>` on Vercel without Blob, stored in the check_photos table;
 * - a local filename served by /api/uploads/[name] in development.
 */
export async function storePhoto(siteId: string, file: File): Promise<string> {
  const extension = EXTENSIONS[file.type] ?? "jpg";
  const fileName = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`checks/${siteId}/${fileName}`, bytes, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    await ensureSchema();
    const id = randomUUID();
    await getDb().insert(check_photos).values({
      id,
      site_id: siteId,
      content_type: contentType,
      data: bytes.toString("base64"),
      created_at: new Date(),
    });
    return `db:${id}`;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), bytes);
  return fileName;
}

/**
 * Photos are a Vercel Blob URL, a Neon-backed `db:<id>` reference, or a legacy
 * local filename written before object storage.
 */
export function photoUrl(photo: string): string {
  if (/^https?:\/\//i.test(photo)) return photo;
  if (photo.startsWith("db:")) {
    return `/api/photos/${encodeURIComponent(photo.slice(3))}`;
  }
  return `/api/uploads/${encodeURIComponent(photo)}`;
}
