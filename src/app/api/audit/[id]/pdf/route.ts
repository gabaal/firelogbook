import { NextResponse, type NextRequest } from "next/server";
import { getSession, verifyShareToken } from "@/lib/auth";
import {
  actionsForSite,
  checksBetween,
  checksForSite,
  getSite,
  getSiteById,
} from "@/lib/data";
import { renderAuditPdf } from "@/lib/audit-pdf";
import { photoDataUri } from "@/lib/photo";
import { endOfDayIso, inputDate, startOfDayIso } from "@/lib/format";
import { slugify } from "@/lib/print";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;

function parseDay(value: string | null, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

/** Signed-in owner of the site, or a valid share link. */
async function authorize(siteId: string, shareToken: string | null) {
  const session = await getSession();
  if (session) {
    const site = await getSite(session.firm.id, siteId);
    if (site) return site;
  }
  if (shareToken && verifyShareToken(shareToken, siteId)) {
    return await getSiteById(siteId);
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const shareToken = url.searchParams.get("k");

  const site = await authorize(id, shareToken);
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const to = parseDay(toParam, new Date());
    const siteCreated = new Date(site.created_at);
    const oneYearAgo = new Date(Date.now() - 365 * DAY);
    const earliest = siteCreated < oneYearAgo ? oneYearAgo : siteCreated;
    const from = parseDay(fromParam, earliest);

    if (!fromParam && !toParam) {
      const minFrom = new Date(to.getTime() - 365 * DAY);
      if (from < minFrom) from.setTime(minFrom.getTime());
    }
    if (from > to) from.setTime(to.getTime() - 365 * DAY);

    const checks = await checksBetween(site.id, startOfDayIso(from), endOfDayIso(to));
    const everRecorded = (await checksForSite(site.id, 1)).length > 0;
    const actions = (await actionsForSite(site.id)).filter(
      (a) => new Date(a.created_at) <= to || a.status === "open",
    );

    const failures = checks.filter((c) => c.result === "fail");
    const photoChecks = [...failures, ...checks]
      .filter((c) => c.photo)
      .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
      .slice(0, 12);

    const photoData = new Map<string, string>();
    await Promise.all(
      photoChecks.map(async (check) => {
        const uri = await photoDataUri(check.photo!);
        if (uri) photoData.set(check.id, uri);
      }),
    );

    const pdf = await renderAuditPdf({
      site,
      from,
      to,
      checks,
      actions,
      everRecorded,
      photoData,
    });

    const filename = `fire-audit-${slugify(site.name) || "site"}-${inputDate(from)}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Audit PDF generation failed:", error);
    return NextResponse.json(
      { error: "The PDF could not be generated. Please try again." },
      { status: 500 },
    );
  }
}
