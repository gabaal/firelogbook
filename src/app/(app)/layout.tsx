import Link from "next/link";
import type { Metadata } from "next";
import { requireFirm } from "@/lib/auth";
import { isAdminEmail } from "@/lib/analytics";
import { firmIsReadOnly, trialDaysLeft } from "@/lib/billing";
import AppBar from "@/components/AppBar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sends visitors to /signin when there is no session. Pages decide whether
  // the account may write (firmIsActive) — reading is always allowed.
  const { firm, user } = await requireFirm();
  const readOnly = firmIsReadOnly(firm);

  return (
    <>
      <AppBar
        firmName={firm.name}
        email={user.email}
        demo={firm.subscription_status === "demo"}
        trialDays={
          firm.subscription_status === "trialing" ? trialDaysLeft(firm) : null
        }
        pastDue={
          firm.subscription_status === "canceled" ||
          firm.subscription_status === "past_due"
        }
        readOnly={readOnly}
        admin={isAdminEmail(user.email)}
      />

      {readOnly && (
        <div className="readonly-bar no-print">
          <div className="shell readonly-in">
            <span>
              <strong>Read-only.</strong> Your subscription has ended, so your
              records can be viewed, printed and exported — but no new checks can
              be recorded.
            </span>
            <Link href="/billing" className="btn btn-sm">
              Reactivate
            </Link>
          </div>
        </div>
      )}

      <main>{children}</main>
    </>
  );
}
