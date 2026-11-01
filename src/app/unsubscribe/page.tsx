import Link from "next/link";
import { Flame, Check } from "@/components/icons";
import { getSiteById, setSiteOptOut } from "@/lib/data";
import { verifyUnsubscribeToken } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const siteId = t ? verifyUnsubscribeToken(t) : null;
  const site = siteId ? getSiteById(siteId) : null;

  if (site) setSiteOptOut(site.id, true);

  return (
    <div className="shell" style={{ maxWidth: 520, paddingTop: 56, paddingBottom: 80 }}>
      <Link href="/" className="brand" style={{ marginBottom: 28 }}>
        <span className="brand-mark">
          <Flame size={15} />
        </span>
        FireLogbook
      </Link>

      {site ? (
        <div className="card card-pad stack">
          <span className="pill pill-ok" style={{ alignSelf: "flex-start" }}>
            <Check size={13} /> Unsubscribed
          </span>
          <h1 className="h-page" style={{ fontSize: "1.6rem" }}>
            Reminders for {site.name} are off
          </h1>
          <p className="small" style={{ color: "var(--ink-2)" }}>
            {site.responsible_person} will no longer receive the weekly reminders
            for this site. The logbook itself keeps working, and the account owner
            can turn reminders back on from the Reminders screen.
          </p>
          <p className="tiny muted">
            If this was a mistake, sign in and open Reminders to switch them back
            on.
          </p>
          <Link href="/signin" className="btn" style={{ alignSelf: "flex-start" }}>
            Sign in
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
