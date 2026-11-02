import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { get, put, type PutBlobResult } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { ensureSchema, getDb, UPLOAD_DIR } from "./db";
import { check_photos } from "./schema";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
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

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

/**
 * Loads a photo as a data URI so @react-pdf/renderer can embed it without making
 * a second HTTP request to our own deployment.
 */
export async function photoDataUri(photo: string): Promise<string | null> {
  try {
    if (/^https?:\/\//i.test(photo)) {
      const res = await fetch(photo);
      if (!res.ok) return null;
      const type = res.headers.get("content-type") ?? "image/jpeg";
      const bytes = Buffer.from(await res.arrayBuffer());
      return `data:${type};base64,${bytes.toString("base64")}`;
    }

    if (photo.startsWith("blob:")) {
      const result = await get(photo.slice(5), { access: "private" });
      if (!result || result.stream === null) return null;
      const bytes = await streamToBuffer(result.stream);
      return `data:${result.blob.contentType ?? "image/jpeg"};base64,${bytes.toString(
        "base64",
      )}`;
    }

    if (photo.startsWith("db:")) {
      await ensureSchema();
      const row = await getDb().query.check_photos.findFirst({
        where: eq(check_photos.id, photo.slice(3)),
      });
      if (!row) return null;
      return `data:${row.content_type};base64,${row.data}`;
    }

    const extension = photo.split(".").pop()?.toLowerCase() ?? "jpg";
    const bytes = await fs.readFile(path.join(UPLOAD_DIR, photo));
    return `data:${MIME_BY_EXTENSION[extension] ?? "image/jpeg"};base64,${bytes.toString(
      "base64",
    )}`;
  } catch (error) {
    console.error("Could not load photo for the PDF:", photo, error);
    return null;
  }
}
