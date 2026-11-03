"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "./icons";

interface Props {
  firmName: string;
  email: string;
  demo: boolean;
  trialDays: number | null;
  pastDue: boolean;
  readOnly: boolean;
  admin: boolean;
}

export default function AppBar({
  firmName,
  email,
  demo,
  trialDays,
  pastDue,
  readOnly,
  admin,
}: Props) {
  const pathname = usePathname() ?? "/";
  const onDashboard = pathname === "/dashboard";
  const onSites = pathname.startsWith("/sites") || pathname.startsWith("/onboarding");
  const onSettings = pathname.startsWith("/settings");
  const onOutbox = pathname.startsWith("/outbox");

  return (
    <header className="topbar no-print">
      <div className="shell topbar-in">
        <Link href="/sites" className="brand" aria-label="FireLogbook">
          <span className="brand-mark">
            <Flame size={15} />
          </span>
          <span className="brand-word">FireLogbook</span>
        </Link>

        <span className="firm-chip" title={firmName}>
          {firmName}
        </span>

        {demo && <span className="demo-pill">Demo</span>}
        {!demo && !readOnly && trialDays !== null && trialDays > 0 && (
          <Link href="/billing" className="demo-pill trial-pill">
            Trial · {trialDays}d
          </Link>
        )}
        {!demo && readOnly && (
          <Link href="/billing" className="demo-pill trial-pill danger">
            Read-only
          </Link>
        )}
        {!demo && !readOnly && (pastDue || trialDays === 0) && (
          <Link href="/billing" className="demo-pill trial-pill danger">
            Action needed
          </Link>
        )}

        <nav className="topnav">
          <Link href="/dashboard" className={onDashboard ? "active" : undefined}>
            Dashboard
          </Link>
          <Link href="/sites" className={onSites ? "active" : undefined}>
            Sites
          </Link>
          <Link
            href="/reminders"
            className={pathname.startsWith("/reminders") ? "active" : undefined}
          >
            <span className="nav-full">Reminders</span>
            <span className="nav-short">Nudges</span>
          </Link>
          <Link
            href="/outbox"
            className={onOutbox ? "active" : undefined}
          >
            Outbox
          </Link>
          {admin && (
            <Link
              href="/analytics"
              className={pathname.startsWith("/analytics") ? "active" : undefined}
            >
              Analytics
            </Link>
          )}
          <Link
            href="/settings"
            className={onSettings ? "active" : undefined}
          >
            Settings
          </Link>
          <Link
            href="/billing"
            className={pathname.startsWith("/billing") ? "active" : undefined}
          >
            Billing
          </Link>
          <form action="/api/auth/signout" method="post" className="signout">
            <button type="submit" className="linkish" title={email}>
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
