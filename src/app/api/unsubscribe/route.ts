import { NextResponse, type NextRequest } from "next/server";
import { getSiteById, setSiteOptOut } from "@/lib/data";
import { verifyUnsubscribeToken } from "@/lib/reminders";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unsubscribing is a POST so mail scanners and link prefetchers, which only
 * issue GETs, cannot opt a site out by opening the link in an email.
 */
async function confirm(req: NextRequest) {
  let token = req.nextUrl.searchParams.get("t") ?? "";
  if (!token) {
    const form = await req.formData().catch(() => null);
    token = String(form?.get("t") ?? "");
  }

  const siteId = token ? verifyUnsubscribeToken(token) : null;
  if (!siteId) {
    return NextResponse.redirect(
      new URL("/unsubscribe?error=invalid", req.url),
      303,
    );
  }

  const site = await getSiteById(siteId);
  if (site) {
    await setSiteOptOut(site.id, true);
    await trackEvent("unsubscribed", {
      firmId: site.firm_id,
      siteId: site.id,
    });
  }

  return NextResponse.redirect(new URL("/unsubscribe?done=1", req.url), 303);
}

export async function POST(req: NextRequest) {
  return confirm(req);
}
