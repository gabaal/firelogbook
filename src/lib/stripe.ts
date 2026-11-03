import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanInterval } from "./billing";
import type { FirmRow } from "./db";

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY);
}

function priceIdFor(interval: PlanInterval): string {
  if (interval === "year" && process.env.STRIPE_PRICE_ANNUAL) {
    return process.env.STRIPE_PRICE_ANNUAL;
  }
  return process.env.STRIPE_PRICE_MONTHLY as string;
}

async function stripePost(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.set(key, String(value));
  }

  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      (json.error as { message?: string } | undefined)?.message ??
      `Stripe request failed (${res.status})`;
    throw new Error(message);
  }
  return json;
}

export async function createCheckoutSession(input: {
  firm: FirmRow;
  quantity: number;
  interval: PlanInterval;
  email: string;
  baseUrl: string;
  trialDays?: number;
}): Promise<string> {
  const session = await stripePost("/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": priceIdFor(input.interval),
    "line_items[0][quantity]": Math.max(1, input.quantity),
    success_url: `${input.baseUrl}/billing?activated=1`,
    cancel_url: `${input.baseUrl}/billing?cancelled=1`,
    customer_email: input.email,
    client_reference_id: input.firm.id,
    "metadata[firm_id]": input.firm.id,
    "subscription_data[metadata][firm_id]": input.firm.id,
    // Carry whatever is left of the app trial into Stripe so an early
    // subscriber's card is saved now but not charged until the trial ends.
    ...(input.trialDays && input.trialDays > 0
      ? { "subscription_data[trial_period_days]": Math.ceil(input.trialDays) }
      : {}),
    allow_promotion_codes: "true",
  });

  const url = session.url as string | undefined;
  if (!url) throw new Error("Stripe did not return a checkout URL");
  return url;
}

export async function createPortalSession(input: {
  customerId: string;
  baseUrl: string;
}): Promise<string> {
  const session = await stripePost("/billing_portal/sessions", {
    customer: input.customerId,
    return_url: `${input.baseUrl}/billing`,
  });
  const url = session.url as string | undefined;
  if (!url) throw new Error("Stripe did not return a portal URL");
  return url;
}

/** Verify a Stripe webhook signature without the SDK. */
export function verifyWebhook(
  payload: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  let timestamp = "";
  const signatures: string[] = [];

  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  // Five minute tolerance, as Stripe recommends.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return signatures.some((candidate) => {
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
