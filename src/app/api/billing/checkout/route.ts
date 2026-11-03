import { NextResponse, type NextRequest } from "next/server";
import { requireFirm } from "@/lib/auth";
import { baseUrl } from "@/lib/mail";
import { countSites, updateFirm } from "@/lib/data";
import { createCheckoutSession, stripeConfigured } from "@/lib/stripe";
import type { PlanInterval } from "@/lib/billing";
import { trialDaysLeft } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firm, user } = await requireFirm();
  const body = await req.json().catch(() => ({}));
  const interval: PlanInterval = body.interval === "year" ? "year" : "month";
  const quantity = Math.max(1, await countSites(firm.id));
  const trialDays =
    firm.subscription_status === "trialing" ? trialDaysLeft(firm) : 0;

  if (stripeConfigured()) {
    try {
      const url = await createCheckoutSession({
        firm,
        quantity,
        interval,
        email: user.email,
        baseUrl: baseUrl(),
        trialDays,
      });
      return NextResponse.json({ mode: "stripe", url });
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Could not reach the payment provider",
        },
        { status: 502 },
      );
    }
  }

  // No Stripe configured: simulate an activation locally only. In production
  // this would hand out a free subscription, so fail closed instead.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 },
    );
  }

  const periodEnd = new Date(
    Date.now() + (interval === "year" ? 365 : 30) * 86_400_000,
  ).toISOString();

  updateFirm(firm.id, {
    subscription_status: "active",
    plan_interval: interval,
    stripe_subscription_id: `sub_sim_${firm.id.slice(0, 8)}`,
    current_period_end: new Date(periodEnd),
  });

  return NextResponse.json({ mode: "simulated" });
}
