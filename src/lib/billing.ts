import type { FirmRow } from "./db";

export const TRIAL_DAYS = 14;

export const PLANS = {
  month: { label: "Monthly", price: 2900, display: "£29", cadence: "per site / month" },
  year: { label: "Annual", price: 29000, display: "£290", cadence: "per site / year" },
} as const;

export type PlanInterval = keyof typeof PLANS;

export function firmIsActive(firm: FirmRow, now = Date.now()): boolean {
  if (firm.subscription_status === "demo") return true;
  if (firm.subscription_status === "active") return true;
  if (firm.subscription_status === "trialing" && firm.trial_ends_at) {
    return new Date(firm.trial_ends_at).getTime() > now;
  }
  if (firm.subscription_status === "canceled" && firm.current_period_end) {
    return new Date(firm.current_period_end).getTime() > now;
  }
  return false;
}

/**
 * Lapsed accounts keep their records: everything stays readable and exportable,
 * but nothing new can be recorded until the subscription is live again.
 */
export function firmIsReadOnly(firm: FirmRow, now = Date.now()): boolean {
  return !firmIsActive(firm, now);
}

export function trialDaysLeft(firm: FirmRow, now = Date.now()): number {
  if (!firm.trial_ends_at) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(firm.trial_ends_at).getTime() - now) / 86_400_000),
  );
}

export function statusCopy(firm: FirmRow): {
  label: string;
  tone: "ok" | "warn" | "bad" | "neutral";
  detail: string;
} {
  if (firm.subscription_status === "demo") {
    return {
      label: "Demo account",
      tone: "neutral",
      detail: "Sample data. Nothing is charged and nothing is sent.",
    };
  }
  if (firm.subscription_status === "active") {
    return {
      label: "Active",
      tone: "ok",
      detail: firm.current_period_end
        ? `Renews ${new Date(firm.current_period_end).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}.`
        : "Subscription active.",
    };
  }
  if (firm.subscription_status === "trialing") {
    const days = trialDaysLeft(firm);
    return {
      label: days > 0 ? `Trial · ${days} day${days === 1 ? "" : "s"} left` : "Trial ended",
      tone: days > 0 ? "warn" : "bad",
      detail:
        days > 0
          ? "Add a payment method before the trial ends to keep recording checks."
          : "Your trial has ended. Start a subscription to keep recording.",
    };
  }
  if (firm.subscription_status === "past_due") {
    return {
      label: "Payment failed",
      tone: "bad",
      detail: "Update your card to restore access. Your records are safe.",
    };
  }
  return {
    label: "Cancelled",
    tone: "neutral",
    detail: "Your records are kept. Reactivate to start recording again.",
  };
}

export function sitePricePence(interval: PlanInterval): number {
  return PLANS[interval].price;
}
