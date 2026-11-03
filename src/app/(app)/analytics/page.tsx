import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireFirm } from "@/lib/auth";
import { isAdminEmail } from "@/lib/analytics";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { fmtDateTime } from "@/lib/format";
import { ArrowLeft, Doc } from "@/components/icons";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

const LABELS: Record<string, string> = {
  signup: "Sign-up",
  site_created: "Site created",
  check_recorded: "Check recorded",
  audit_pdf: "Audit PDF",
  free_logbook_lead: "Free log book lead",
  free_logbook_pdf: "Free log book PDF",
  lead_nurture_sent: "Nurture email sent",
  lead_nurture_unsubscribed: "Nurture unsubscribe",
  lead_converted: "Lead converted",
  checkout_started: "Checkout started",
  checkout_completed: "Checkout completed",
  subscription_status: "Subscription status",
  reminder_sent: "Reminder sent",
  unsubscribed: "Unsubscribed",
  member_joined: "Member joined",
};

const STATUS_LABEL: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Cancelled",
  demo: "Demo",
};

function tile(label: string, value: number | string, detail?: string) {
  return (
    <div className="card card-pad" key={label}>
      <p className="eyebrow">{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>
        {value}
      </p>
      {detail && <p className="tiny muted">{detail}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const { user } = await requireFirm();
  // Cross-firm numbers are operator-only; set ADMIN_EMAILS to enable.
  if (!isAdminEmail(user.email)) notFound();

  const since30 = new Date(Date.now() - 30 * DAY);
  const since14 = new Date(Date.now() - 13 * DAY);

  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    days.push(new Date(Date.now() - i * DAY).toISOString().slice(0, 10));
  }

  const [counts, checkRows, leadRows, statusRows, recent] = await Promise.all([
    db
      .select({
        name: schema.events.name,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.events)
      .where(gte(schema.events.created_at, since30))
      .groupBy(schema.events.name),
    db
      .select({ created_at: schema.events.created_at })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.name, "check_recorded"),
          gte(schema.events.created_at, since14),
        ),
      ),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.leads),
    db
      .select({
        status: schema.firms.subscription_status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.firms)
      .groupBy(schema.firms.subscription_status),
    db
      .select({
        name: schema.events.name,
        created_at: schema.events.created_at,
        props: schema.events.props,
        firm_name: schema.firms.name,
      })
      .from(schema.events)
      .leftJoin(schema.firms, eq(schema.events.firm_id, schema.firms.id))
      .orderBy(desc(schema.events.created_at))
      .limit(40),
  ]);

  const byName = new Map(counts.map((row) => [row.name, Number(row.count)]));
  const statusMap = new Map(
    statusRows.map((row) => [row.status, Number(row.count)]),
  );
  const totalFirms = statusRows.reduce((sum, row) => sum + Number(row.count), 0);

  const perDay = new Map(days.map((day) => [day, 0]));
  for (const row of checkRows) {
    const key = new Date(row.created_at).toISOString().slice(0, 10);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const maxDay = Math.max(1, ...perDay.values());

  return (
    <div className="shell section" style={{ maxWidth: 1000 }}>
      <Link
        href="/dashboard"
        className="row small muted"
        style={{ marginBottom: 14, gap: 5 }}
      >
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Operator</p>
          <h1 className="h-page" style={{ marginTop: 4 }}>
            Analytics
          </h1>
        </div>
        <span className="pill pill-neutral">Last 30 days</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {tile("Sign-ups", byName.get("signup") ?? 0, "new accounts")}
        {tile("Checks recorded", byName.get("check_recorded") ?? 0, "last 30 days")}
        {tile("Checkouts started", byName.get("checkout_started") ?? 0, "last 30 days")}
        {tile("Free log books", Number(leadRows[0]?.count ?? 0), "all time")}
        {tile("Nurture emails", byName.get("lead_nurture_sent") ?? 0, "last 30 days")}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          marginBottom: 26,
        }}
      >
        {tile("Active subscriptions", statusMap.get("active") ?? 0)}
        {tile("Trials running", statusMap.get("trialing") ?? 0)}
        {tile("Past due", statusMap.get("past_due") ?? 0)}
        {tile("Firms", totalFirms, "all statuses")}
      </div>

      <section style={{ marginBottom: 26 }}>
        <h2 className="h-sec" style={{ marginBottom: 10 }}>
          Checks recorded — 14 days
        </h2>
        <div className="card card-pad">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 5,
              height: 120,
            }}
          >
            {days.map((day) => {
              const value = perDay.get(day) ?? 0;
              return (
                <div
                  key={day}
                  style={{ flex: 1, textAlign: "center" }}
                  title={`${day}: ${value} check${value === 1 ? "" : "s"}`}
                >
                  <div
                    style={{
                      height: Math.max(2, Math.round((value / maxDay) * 88)),
                      background: "var(--primary)",
                      borderRadius: 3,
                    }}
                  />
                  <span className="tiny muted" style={{ display: "block", marginTop: 4 }}>
                    {day.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid-2" style={{ gap: 18, marginBottom: 26 }}>
        <div className="card card-pad">
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            Firms by status
          </p>
          <div className="stack-sm">
            {["active", "trialing", "past_due", "canceled", "demo"].map((status) => (
              <div
                key={status}
                className="row-between"
                style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}
              >
                <span className="small">{STATUS_LABEL[status] ?? status}</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {statusMap.get(status) ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <Doc size={15} style={{ color: "var(--ink-3)" }} />
            <p className="eyebrow" style={{ color: "var(--ink-2)" }}>
              Funnel, last 30 days
            </p>
          </div>
          <div className="stack-sm">
            {[
              ["Sign-ups", byName.get("signup") ?? 0],
              ["Sites created", byName.get("site_created") ?? 0],
              ["Checks recorded", byName.get("check_recorded") ?? 0],
              ["Checkouts started", byName.get("checkout_started") ?? 0],
              ["Checkouts completed", byName.get("checkout_completed") ?? 0],
              ["Audit PDFs", byName.get("audit_pdf") ?? 0],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="row-between"
                style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}
              >
                <span className="small">{label}</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h2 className="h-sec" style={{ marginBottom: 10 }}>
          Recent events
        </h2>
        <div className="card table-wrap">
          <table className="rows">
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Firm</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((event, index) => (
                <tr key={`${event.created_at.toISOString()}-${index}`}>
                  <td className="mono tiny" style={{ whiteSpace: "nowrap" }}>
                    {fmtDateTime(event.created_at)}
                  </td>
                  <td className="small">{LABELS[event.name] ?? event.name}</td>
                  <td className="small muted">{event.firm_name ?? "—"}</td>
                  <td className="mono tiny muted" style={{ maxWidth: 320 }}>
                    {event.props ? event.props.slice(0, 100) : ""}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted small">
                    No events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          Events are stored in Postgres without emails, names or notes. Access is
          limited to the addresses in <code>ADMIN_EMAILS</code>.
        </p>
      </section>
    </div>
  );
}
