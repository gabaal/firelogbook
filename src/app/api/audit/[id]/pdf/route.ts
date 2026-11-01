import { NextResponse, type NextRequest } from "next/server";
import { getSession, signShareToken, verifyShareToken } from "@/lib/auth";
import { getSite, getSiteById, insertPdfJob } from "@/lib/data";
import { firmIsActive } from "@/lib/billing";
import { exportDir } from "@/lib/print";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signed-in owner of the site, or a valid share link. */
async function authorize(siteId: string, shareToken: string | null) {
  const session = await getSession();
  if (session) {
    const site = getSite(session.firm.id, siteId);
    if (site && firmIsActive(session.firm)) return site;
    if (site) return site;
  }
  if (shareToken && verifyShareToken(shareToken, siteId)) {
    return getSiteById(siteId);
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const shareToken = url.searchParams.get("k");

  const site = await authorize(id, shareToken);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const paramsStr = new URLSearchParams();
  if (from) paramsStr.set("from", from);
  if (to) paramsStr.set("to", to);

  const jobId = insertPdfJob({
    siteId: id,
    params: paramsStr.toString(),
  });

  return NextResponse.json(
    { jobId, status: "queued", pollUrl: `/api/audit/pdf/${jobId}` },
    { status: 202 },
  );
}
