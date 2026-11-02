import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams photos from a private Vercel Blob store. `checks.photo` holds
 * `blob:<pathname>` and `photoUrl()` sends browsers here. The pathname
 * includes a random UUID and suffix, so it is unguessable.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const pathname = path.join("/");

  if (!pathname.startsWith("checks/") || pathname.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const result = await get(pathname, { access: "private" });
  if (!result || result.stream === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
