import { NextResponse, type NextRequest } from "next/server";
import { setLeadOptOut } from "@/lib/leads";
import { verifyLeadUnsubscribeToken } from "@/lib/nurture";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirm-by-POST, like the reminder opt-out, so a mail scanner that opens the
 * link cannot stop someone's emails for them.
 */
async function confirm(req: NextRequest) {
  let token = req.nextUrl.searchParams.get("t") ?? "";
  if (!token) {
    const form = await req.formData().catch(() => null);
    token = String(form?.get("t") ?? "");
  }

  const leadId = token ? verifyLeadUnsubscribeToken(token) : null;
  if (!leadId) {
    return NextResponse.redirect(
      new URL("/lead-unsubscribe?error=invalid", req.url),
      303,
    );
  }

  await setLeadOptOut(leadId);
  await trackEvent("lead_nurture_unsubscribed");

  return NextResponse.redirect(new URL("/lead-unsubscribe?done=1", req.url), 303);
}

export async function POST(req: NextRequest) {
  return confirm(req);
}
