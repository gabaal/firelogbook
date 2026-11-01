import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFirm } from "@/lib/auth";
import { getNotification } from "@/lib/reminders";
import { getSiteById } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { ArrowLeft } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SentReminderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { firm } = await requireFirm();
  const notification = await getNotification(firm.id, id);
  if (!notification) notFound();

  const site = await getSiteById(notification.site_id);

  return (
    <div className="shell section" style={{ maxWidth: 720 }}>
      <Link href="/reminders" className="row small muted" style={{ gap: 5 }}>
        <ArrowLeft size={15} /> Reminders
      </Link>

      <div className="row-between" style={{ margin: "14px 0 16px" }}>
        <h1 className="h-page" style={{ fontSize: "1.7rem" }}>
          What was sent
        </h1>
        <span className={`pill pill-${notification.status === "failed" ? "bad" : "ok"}`}>
          {notification.status}
        </span>
      </div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: "1px solid var(--line)", background: "#fbf9f5" }}>
          <dl className="stack-sm" style={{ margin: 0 }}>
            <div className="row-between">
              <span className="tiny muted">To</span>
              <span className="small mono">{notification.to_addr}</span>
            </div>
            <div className="row-between">
              <span className="tiny muted">Site</span>
              <span className="small">{site?.name ?? notification.site_id}</span>
            </div>
            <div className="row-between">
              <span className="tiny muted">Sent</span>
              <span className="small">{fmtDateTime(notification.created_at)}</span>
            </div>
            <div className="row-between">
              <span className="tiny muted">Subject</span>
              <span className="small" style={{ fontWeight: 600 }}>
                {notification.subject}
              </span>
            </div>
          </dl>
        </div>

        <pre
          className="card-pad"
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily: "var(--sans)",
            fontSize: 14,
            lineHeight: 1.65,
            color: "var(--ink-2)",
          }}
        >
          {notification.body}
        </pre>
      </div>

      <p className="tiny muted" style={{ marginTop: 12 }}>
        Every reminder is stored verbatim so you can show what was sent and when.
        The unsubscribe link at the bottom works without signing in.
      </p>
    </div>
  );
}
