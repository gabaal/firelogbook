import test from "node:test";
import assert from "node:assert/strict";
import {
  firmIsActive,
  firmIsReadOnly,
  statusCopy,
  trialDaysLeft,
} from "../src/lib/billing";
import type { FirmRow } from "../src/lib/db";

function firm(overrides: Partial<FirmRow> = {}): FirmRow {
  return {
    id: "firm-test",
    name: "Test Firm",
    created_at: new Date("2026-01-01T00:00:00Z"),
    subscription_status: "trialing",
    plan_interval: null,
    trial_ends_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
    reminders_enabled: 1,
    reminder_day: 1,
    reminder_hour: 7,
    ...overrides,
  };
}

const DAY = 86_400_000;

test("demo accounts are always active", () => {
  assert.equal(firmIsActive(firm({ subscription_status: "demo" })), true);
});

test("active subscriptions are active regardless of dates", () => {
  assert.equal(firmIsActive(firm({ subscription_status: "active" })), true);
});

test("an unexpired trial is active, an expired one is not", () => {
  const now = Date.now();
  const running = firm({ trial_ends_at: new Date(now + 5 * DAY) });
  const expired = firm({ trial_ends_at: new Date(now - DAY) });
  assert.equal(firmIsActive(running), true);
  assert.equal(firmIsActive(expired), false);
  assert.equal(firmIsReadOnly(running), false);
  assert.equal(firmIsReadOnly(expired), true);
});

test("a trial without an end date is not active", () => {
  assert.equal(firmIsActive(firm()), false);
});

test("a cancelled subscription keeps access until the paid period ends", () => {
  const now = Date.now();
  const stillPaid = firm({
    subscription_status: "canceled",
    current_period_end: new Date(now + 3 * DAY),
  });
  const finished = firm({
    subscription_status: "canceled",
    current_period_end: new Date(now - DAY),
  });
  assert.equal(firmIsActive(stillPaid), true);
  assert.equal(firmIsActive(finished), false);
  assert.equal(firmIsActive(firm({ subscription_status: "canceled" })), false);
});

test("past due accounts are read-only", () => {
  const pastDue = firm({ subscription_status: "past_due" });
  assert.equal(firmIsActive(pastDue), false);
  assert.equal(firmIsReadOnly(pastDue), true);
});

test("trialDaysLeft rounds up and never goes negative", () => {
  const now = Date.now();
  assert.equal(trialDaysLeft(firm({ trial_ends_at: new Date(now + 9.2 * DAY) })), 10);
  assert.equal(trialDaysLeft(firm({ trial_ends_at: new Date(now - DAY) })), 0);
  assert.equal(trialDaysLeft(firm()), 0);
});

test("statusCopy labels each state", () => {
  assert.equal(statusCopy(firm({ subscription_status: "demo" })).label, "Demo account");
  assert.equal(statusCopy(firm({ subscription_status: "active" })).label, "Active");
  assert.equal(statusCopy(firm({ subscription_status: "past_due" })).label, "Payment failed");
  assert.match(
    statusCopy(
      firm({
        subscription_status: "trialing",
        trial_ends_at: new Date(Date.now() + 5 * DAY),
      }),
    ).label,
    /^Trial · 5 days left$/,
  );
});
