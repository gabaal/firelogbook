import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Check, Alert } from "@/components/icons";
import { getSiteById } from "@/lib/data";
import { verifyUnsubscribeToken } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; done?: string; error?: string }>;
}) {
  const { t, done, error } = await searchParams;
  const confirmed = done === "1";
  const siteId = !confirmed && !error && t ? verifyUnsubscribeToken(t) : null;
  const site = siteId ? await getSiteById(siteId) : null;

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
            <Check size={13} /> Unsubscribed
          </span>
          <h1 className="h-page" style={{ fontSize: "1.6rem" }}>
            Reminders are off
          </h1>
          <p className="small" style={{ color: "var(--ink-2)" }}>
            This site will no longer receive the weekly reminders. The logbook
            itself keeps working, and the account owner can turn reminders back on
            from the Reminders screen.
          </p>
          <Link href="/signin" className="btn" style={{ alignSelf: "flex-start" }}>
            Sign in
          </Link>
        </div>
      ) : site && t ? (
        <div className="card card-pad stack">
          <span className="pill pill-warn" style={{ alignSelf: "flex-start" }}>
            <Alert size={13} /> Confirm
          </span>
          <h1 className="h-page" style={{ fontSize: "1.6rem" }}>
            Stop reminders for {site.name}?
          </h1>
          <p className="small" style={{ color: "var(--ink-2)" }}>
            {site.responsible_person} will stop receiving the weekly chase for this
            site. The logbook keeps working, and the account owner can turn the
            reminders back on.
          </p>
          <form method="POST" action="/api/unsubscribe" className="stack-sm">
            <input type="hidden" name="t" value={t} />
            <button
              className="btn btn-primary"
              type="submit"
              style={{ alignSelf: "flex-start" }}
            >
              Yes, stop the reminders
            </button>
          </form>
          <Link href="/" className="tiny muted">
            Leave reminders on
          </Link>
        </div>
      ) : (
        <div className="card card-pad stack">
          <h1 className="h-page" style={{ fontSize: "1.6rem" }}>
            This link is not valid
          </h1>
          <p className="small muted">
            It may have been cut off by your email client. Sign in and turn
            reminders off from the Reminders screen instead.
          </p>
          <Link href="/signin" className="btn" style={{ alignSelf: "flex-start" }}>
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
