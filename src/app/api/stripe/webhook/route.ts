import { NextResponse, type NextRequest } from "next/server";
import { getDb, type FirmRow } from "@/lib/db";
import { updateFirm } from "@/lib/data";
import { verifyWebhook } from "@/lib/stripe";
import type { SubscriptionStatus } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StripeEvent {
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      subscription?: string;
      status?: string;
      current_period_end?: number;
      metadata?: { firm_id?: string };
      client_reference_id?: string;
      // Newer API versions moved the period end onto the subscription item.
      items?: { data?: Array<{ current_period_end?: number }> };
    };
  };
}

/** Reads the billing period end across Stripe API versions. */
function periodEndOf(object: StripeEvent["data"]["object"]): number | null {
  return (
    object.current_period_end ??
    object.items?.data?.[0]?.current_period_end ??
    null
  );
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "canceled",
  incomplete: "past_due",
  incomplete_expired: "canceled",
  paused: "canceled",
};

async function firmFor(event: StripeEvent): Promise<FirmRow | null> {
  const object = event.data.object;
  const db = getDb();

  const firmId =
    object.metadata?.firm_id ??
    object.client_reference_id ??
    null;

  if (firmId) {
    const firm = await db.query.firms.findFirst({
      where: eq(schema.firms.id, firmId),
    });
    if (firm) return firm;
  }

  const subscriptionId = object.subscription ?? object.id;
  if (subscriptionId) {
    const firm = await db.query.firms.findFirst({
      where: eq(schema.firms.stripe_subscription_id, subscriptionId),
    });
    if (firm) return firm;
  }

  if (object.customer) {
    const firm = await db.query.firms.findFirst({
      where: eq(schema.firms.stripe_customer_id, object.customer),
    });
    if (firm) return firm;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const payload = await req.text();

  if (!verifyWebhook(payload, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const firm = await firmFor(event);
  if (!firm) {
    // Acknowledge so Stripe stops retrying events we cannot place.
    return NextResponse.json({ received: true, matched: false });
  }

  const object = event.data.object;

  switch (event.type) {
    case "checkout.session.completed":
      await updateFirm(firm.id, {
        subscription_status: "active",
        stripe_customer_id: object.customer ?? firm.stripe_customer_id,
        stripe_subscription_id: object.subscription ?? firm.stripe_subscription_id,
      });
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const status = STATUS_MAP[object.status ?? ""] ?? firm.subscription_status;
      const periodEnd = periodEndOf(object);
      await updateFirm(firm.id, {
        subscription_status: status,
        stripe_subscription_id: object.id ?? firm.stripe_subscription_id,
        stripe_customer_id: object.customer ?? firm.stripe_customer_id,
        current_period_end: periodEnd
          ? new Date(periodEnd * 1000)
          : firm.current_period_end,
      });
      break;
    }

    case "customer.subscription.deleted":
      await updateFirm(firm.id, {
        subscription_status: "canceled",
        current_period_end: null,
      });
      break;

    default:
      break;
  }

  return NextResponse.json({ received: true, matched: true });
}
