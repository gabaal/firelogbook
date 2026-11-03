import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveFirm } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ArrowLeft, Mail, Send } from "@/components/icons";
import { revalidatePath } from "next/cache";
import { mailMode } from "@/lib/mail";
import { desc } from "drizzle-orm";
import * as schema from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function OutboxPage() {
  const { user, firm } = await requireActiveFirm();
  const db = getDb();

  const emails = await db.query.email_log.findMany({
    where: (email, { eq }) => eq(email.firm_id, firm.id),
    orderBy: [desc(schema.email_log.created_at)],
  });

  return (
    <div className="shell section">
      <Link href="/dashboard" className="row small muted" style={{ marginBottom: 14, gap: 5 }}>
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <div className="row-between" style={{ marginBottom: 24 }}>
        <h1 className="h-page">Email Outbox</h1>
        <p className="small muted">
          {firm.subscription_status === "demo" || mailMode() === "outbox"
            ? "Local mode: Emails are queued here instead of being sent."
            : "Sent emails log."}
        </p>
      </div>

      <div className="stack-lg" style={{ gap: 16 }}>
        {emails.length === 0 ? (
          <div className="card">
            <div className="empty">
              <Mail size={24} style={{ color: "var(--ink-3)", margin: "0 auto 8px" }} />
              No emails in outbox.
            </div>
          </div>
        ) : (
          emails.map((email) => (
            <div key={email.id} className="card card-pad" style={{ borderLeft: `4px solid ${email.status === "sent" ? "var(--ok)" : "var(--line)"}` }}>
              <div className="row-between" style={{ marginBottom: 8 }}>
                <div className="stack-sm">
                  <strong style={{ fontSize: 14 }}>{email.subject}</strong>
                  <p className="tiny muted">To: {email.to_addr} · {new Date(email.created_at).toLocaleString()}</p>
                </div>
                <span className={`pill ${email.status === "sent" ? "pill-ok" : "pill-neutral"}`} style={{ fontSize: 10 }}>
                  {email.status}
                </span>
              </div>
              <div style={{
                backgroundColor: "var(--ink-1)",
                padding: "12px",
                borderRadius: 6,
                fontSize: 13,
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                border: "1px solid var(--line)"
              }}>
                {email.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
