import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { UPLOAD_DIR } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = path.join(UPLOAD_DIR, name);
  try {
    const data = await fs.readFile(file);
    const ext = name.split(".").pop()!.toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
