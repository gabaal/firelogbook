import { NextResponse } from "next/server";
import { requireFirm } from "@/lib/auth";
import { baseUrl } from "@/lib/mail";
import { createPortalSession, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { firm } = await requireFirm();

  if (!stripeConfigured() || !firm.stripe_customer_id) {
    // Nothing to manage in simulated mode.
    return NextResponse.json({ mode: "simulated" });
  }

  try {
    const url = await createPortalSession({
      customerId: firm.stripe_customer_id,
      baseUrl: baseUrl(),
    });
    return NextResponse.json({ mode: "stripe", url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not open the portal" },
      { status: 502 },
    );
  }
}
