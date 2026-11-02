import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { put, type PutBlobResult } from "@vercel/blob";
import { ensureSchema, getDb, UPLOAD_DIR } from "./db";
import { check_photos } from "./schema";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type BlobAccess = "public" | "private";

/**
 * Private stores reject public puts and vice versa. Vercel does not expose the
 * store's mode, so try private (right for evidence photos) and fall back.
 */
async function putCheckPhoto(
  pathname: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ access: BlobAccess; blob: PutBlobResult }> {
  const options = { contentType, addRandomSuffix: true } as const;
  try {
    const blob = await put(pathname, bytes, { ...options, access: "private" });
    return { access: "private", blob };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/public store/i.test(message)) throw error;
    const blob = await put(pathname, bytes, { ...options, access: "public" });
    return { access: "public", blob };
  }
}

/**
 * Stores a photo attached to a check and returns what goes into
 * `checks.photo`:
 *
 * - a Blob URL for a public store;
 * - `blob:<pathname>` for a private store, served by /api/blob/[...path];
 * - `db:<id>` on Vercel without Blob, stored in the check_photos table;
 * - a local filename served by /api/uploads/[name] in development.
 */
export async function storePhoto(siteId: string, file: File): Promise<string> {
  const extension = EXTENSIONS[file.type] ?? "jpg";
  const fileName = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { access, blob } = await putCheckPhoto(
      `checks/${siteId}/${fileName}`,
      bytes,
      contentType,
    );
    return access === "public" ? blob.url : `blob:${blob.pathname}`;
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
 * Photos are a Blob URL, a private Blob pathname, a Neon-backed `db:<id>`
 * reference, or a legacy local filename written before object storage.
 */
export function photoUrl(photo: string): string {
  if (/^https?:\/\//i.test(photo)) return photo;
  if (photo.startsWith("blob:")) {
    const pathname = photo
      .slice(5)
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return `/api/blob/${pathname}`;
  }
  if (photo.startsWith("db:")) {
    return `/api/photos/${encodeURIComponent(photo.slice(3))}`;
  }
  return `/api/uploads/${encodeURIComponent(photo)}`;
}
