import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { check_photos } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Serves photos stored in Neon when Vercel Blob is not configured. The id is
 * an unguessable UUID, matching the public-but-opaque Blob URLs.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!ID.test(id)) return new NextResponse("Not found", { status: 404 });

  await ensureSchema();
  const row = await getDb().query.check_photos.findFirst({
    where: eq(check_photos.id, id),
  });
  if (!row) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(Buffer.from(row.data, "base64")), {
    headers: {
      "Content-Type": row.content_type,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
