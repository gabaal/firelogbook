import Link from "next/link";
import { requireFirm } from "@/lib/auth";
import { PLANS, firmIsActive, statusCopy, trialDaysLeft, type PlanInterval } from "@/lib/billing";
import { countSites } from "@/lib/data";
import { stripeConfigured } from "@/lib/stripe";
import { Alert, Check, Doc } from "@/components/icons";
import BillingActions from "@/components/BillingActions";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paywall?: string; activated?: string; cancelled?: string }>;
}) {
  const { firm, user } = await requireFirm();
  const params = await searchParams;
  const sites = await countSites(firm.id);
  const status = statusCopy(firm);
  const active = firmIsActive(firm);
  // A trialing subscription created by checkout has a Stripe subscription id,
  // so the card is already saved and "subscribed" means manage, not buy again.
  const subscribed = Boolean(firm.stripe_subscription_id);
  const demo = firm.subscription_status === "demo";
  const live = stripeConfigured();

  return (
    <div className="shell section" style={{ maxWidth: 900 }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <div>
          <p className="eyebrow">{firm.name}</p>
          <h1 className="h-page" style={{ marginTop: 4 }}>
            Billing
          </h1>
        </div>
        <span className={`pill pill-${status.tone}`}>{status.label}</span>
      </div>
      <p className="lede" style={{ marginBottom: 22 }}>
        {status.detail}
      </p>

      {params.paywall === "1" && !active && (
        <div className="card card-pad" style={{ background: "var(--bad-wash)", borderColor: "#eed0ca", marginBottom: 18 }}>
          <p style={{ fontWeight: 650 }}>Start a subscription to keep recording</p>
          <p className="small" style={{ color: "var(--ink-2)", marginTop: 4 }}>
            Your sites and records are safe. Everything becomes available again
            the moment a subscription starts.
          </p>
        </div>
      )}

      {params.activated === "1" && (
        <p className="note-box" style={{ marginBottom: 18 }}>
          <Check size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          {firm.subscription_status === "trialing" && trialDaysLeft(firm) > 0
            ? `Payment method saved. Your trial continues for ${trialDaysLeft(firm)} more day${
                trialDaysLeft(firm) === 1 ? "" : "s"
              }, then billing starts automatically.`
            : "Subscription started. Thank you — your logbooks are live."}
        </p>
      )}

      <div className="grid-2">
        <div className="card card-pad">
          <p className="eyebrow">Plan</p>
          <p className="price" style={{ marginTop: 4 }}>
            {PLANS.month.display}
            <span className="small muted"> {PLANS.month.cadence}</span>
          </p>
          <p className="small muted" style={{ marginTop: 2 }}>
            or {PLANS.year.display} per site per year — two months free
          </p>

          <hr className="divider" style={{ margin: "16px 0" }} />

          <div className="row-between">
            <span className="small">Sites on this account</span>
            <span className="mono" style={{ fontWeight: 650 }}>{sites}</span>
          </div>
          <div className="row-between" style={{ marginTop: 6 }}>
            <span className="small">
              {subscribed ? "Monthly total" : "Monthly total once subscribed"}
            </span>
            <span className="mono" style={{ fontWeight: 650 }}>
              £{((sites || 1) * 29).toLocaleString("en-GB")}
            </span>
          </div>

          <p className="tiny muted" style={{ marginTop: 12 }}>
            Billed per site. Add or remove sites at any time; the quantity on
            your subscription follows.
          </p>

          {!demo && (
            <div style={{ marginTop: 16 }}>
              <BillingActions
                subscribed={subscribed}
                hasCustomer={Boolean(firm.stripe_customer_id)}
                stripeLive={live}
                interval={(firm.plan_interval ?? "month") as PlanInterval}
              />
            </div>
          )}

          {demo && (
            <p className="note-box" style={{ marginTop: 16 }}>
              This is the demo account. Billing is disabled — nothing is charged.
            </p>
          )}
        </div>

        <div className="stack">
          <div className="card card-pad">
            <p className="eyebrow">Account</p>
            <p className="small" style={{ marginTop: 8 }}>
              <span className="muted">Signed in as</span>
              <br />
              <strong>{user.email}</strong>
            </p>
            {firm.subscription_status === "trialing" && (
              <p className="small" style={{ marginTop: 10 }}>
                Trial ends in <strong>{trialDaysLeft(firm)} days</strong>.
                {firm.stripe_customer_id
                  ? " Your card is saved; the first payment is taken then."
                  : " Subscribe before then to keep recording."}
              </p>
            )}
            {firm.current_period_end && firm.subscription_status === "active" && (
              <p className="small" style={{ marginTop: 10 }}>
                Current period ends{" "}
                <strong>
                  {new Date(firm.current_period_end).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                .
              </p>
            )}
          </div>

          <div className="card card-pad">
            <div className="row" style={{ gap: 8 }}>
              <Doc size={15} style={{ color: "var(--ink-3)" }} />
              <p className="eyebrow" style={{ color: "var(--ink-2)" }}>Your data</p>
            </div>
            <p className="small" style={{ color: "var(--ink-2)", marginTop: 8 }}>
              Records, photos and audit packs stay yours. Cancelling never deletes
              them, and a full export is available on request.
            </p>
            <Link href="/sites" className="btn btn-sm" style={{ marginTop: 12 }}>
              Back to sites
            </Link>
          </div>

          {!live && (
            <div className="card card-pad" style={{ background: "#fbf9f5" }}>
              <div className="row" style={{ gap: 8 }}>
                <Alert size={15} style={{ color: "var(--warn)" }} />
                <p className="eyebrow" style={{ color: "var(--warn)" }}>Test mode</p>
              </div>
              <p className="tiny" style={{ color: "var(--ink-2)", marginTop: 8 }}>
                Stripe keys are not set, so checkout runs against a local
                simulator. Set <code>STRIPE_SECRET_KEY</code>,{" "}
                <code>STRIPE_PRICE_MONTHLY</code> and{" "}
                <code>STRIPE_WEBHOOK_SECRET</code> to go live.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
