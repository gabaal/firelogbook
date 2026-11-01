"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  subscribed: boolean;
  hasCustomer: boolean;
  stripeLive: boolean;
  interval: "month" | "year";
}

export default function BillingActions({ subscribed, hasCustomer, stripeLive, interval }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"month" | "year">(interval);

  async function post(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data as { mode?: string; url?: string };
  }

  async function checkout() {
    setBusy("checkout");
    setError(null);
    try {
      const data = await post("/api/billing/checkout", { interval: plan });
      if (data.mode === "stripe" && data.url) {
        window.location.href = data.url;
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("portal");
    setError(null);
    try {
      const data = await post("/api/billing/portal");
      if (data.mode === "stripe" && data.url) {
        window.location.href = data.url;
        return;
      }
      // Simulator: no portal to open.
      setBusy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing");
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    setError(null);
    try {
      await post("/api/billing/cancel");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setBusy(null);
    }
  }

  if (subscribed) {
    return (
      <div className="stack-sm">
        <button className="btn btn-block" onClick={manage} disabled={busy !== null}>
          {busy === "portal" ? "Opening…" : "Manage billing"}
        </button>
        {stripeLive && hasCustomer && (
          <p className="tiny muted" style={{ textAlign: "center" }}>
            Invoices, payment method and cancellation live in the Stripe portal.
          </p>
        )}
        {!stripeLive && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={cancel}
            disabled={busy !== null}
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel subscription (test mode)"}
          </button>
        )}
        {error && <p className="small" style={{ color: "var(--bad)" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="stack-sm">
      <div className="segmented two" style={{ marginBottom: 6 }}>
        <input
          type="radio"
          id="plan-month"
          name="plan"
          checked={plan === "month"}
          onChange={() => setPlan("month")}
        />
        <label htmlFor="plan-month">
          Monthly £29
        </label>
        <input
          type="radio"
          id="plan-year"
          name="plan"
          checked={plan === "year"}
          onChange={() => setPlan("year")}
        />
        <label htmlFor="plan-year">
          Annual £290
        </label>
      </div>

      <button className="btn btn-primary btn-block btn-lg" onClick={checkout} disabled={busy !== null}>
        {busy === "checkout" ? "Starting…" : "Start subscription"}
      </button>
      <p className="tiny muted" style={{ textAlign: "center" }}>
        {stripeLive
          ? "Secure checkout by Stripe. Cancel any time."
          : "Test mode: this activates a simulated subscription, no card needed."}
      </p>
      {error && <p className="small" style={{ color: "var(--bad)" }}>{error}</p>}
    </div>
  );
}
