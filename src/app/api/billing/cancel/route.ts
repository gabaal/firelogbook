import { NextResponse } from "next/server";
import { requireFirm } from "@/lib/auth";
import { updateFirm } from "@/lib/data";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Local-only cancellation. With Stripe configured, cancellation belongs in the portal. */
export async function POST() {
  const { firm } = await requireFirm();

  if (stripeConfigured()) {
    return NextResponse.json(
      { error: "Use the billing portal to cancel a live subscription" },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 },
    );
  }

  await updateFirm(firm.id, {
    subscription_status: "canceled",
    current_period_end: null,
  });

  return NextResponse.json({ ok: true });
}
