import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Check, Alert } from "@/components/icons";
import { getLead } from "@/lib/leads";
import { verifyLeadUnsubscribeToken } from "@/lib/nurture";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stop fire-safety emails",
  robots: { index: false, follow: false },
};

export default async function LeadUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; done?: string; error?: string }>;
}) {
  const { t, done, error } = await searchParams;
  const confirmed = done === "1";
  const leadId = !confirmed && !error && t ? verifyLeadUnsubscribeToken(t) : null;
  const lead = leadId ? await getLead(leadId) : null;

  return (
    <div className="shell" style={{ maxWidth: 520, paddingTop: 56, paddingBottom: 80 }}>
      <Link href="/" className="brand" style={{ marginBottom: 28 }}>
        <span className="brand-mark">
          <Flame size={15} />
        </span>
        FireLogbook
      </Link>

      {confirmed ? (
        <div className="card card-pad stack">
          <span className="pill pill-ok" style={{ alignSelf: "flex-start" }}>
            <Check size={13} /> Done
          </span>
          <h1 className="h-page" style={{ fontSize: "1.6rem" }}>
            You will not get any more tips
          </h1>
          <p className="small" style={{ color: "var(--ink-2)" }}>
            Your free log book stays available and keeps working. Reminder
            emails for sites you add to an account are separate and are not
            affected by this.
          </p>
          <Link href="/" className="btn" style={{ alignSelf: "flex-start" }}>
            Back to FireLogbook
          </Link>
        </div>
      ) : lead && t ? (
        <div className="card card-pad stack">
          <span className="pill pill-warn" style={{ alignSelf: "flex-start" }}>
            <Alert size={13} /> Confirm
          </span>
          <h1 className="h-page" style={{ fontSize: "1.6rem" }}>
            Stop the fire-safety emails?
          </h1>
          <p className="small" style={{ color: "var(--ink-2)" }}>
            This stops the occasional tips and product updates sent after you
            downloaded a free log book. Your printable log book stays available.
          </p>
          <form method="POST" action="/api/lead-unsubscribe" className="stack-sm">
            <input type="hidden" name="t" value={t} />
            <button
              className="btn btn-primary"
              type="submit"
              style={{ alignSelf: "flex-start" }}
            >
              Yes, stop the emails
            </button>
          </form>
          <Link href="/" className="tiny muted">
            Keep them coming
          </Link>
        </div>
      ) : (
        <div className="card card-pad stack">
          <h1 className="h-page" style={{ fontSize: "1.6rem" }}>
            This link is not valid
          </h1>
          <p className="small muted">
            It may have been cut off by your email client. Reply to any of the
            emails and we will take you off the list.
          </p>
          <Link href="/" className="btn" style={{ alignSelf: "flex-start" }}>
            Back to FireLogbook
          </Link>
        </div>
      )}
    </div>
  );
}
