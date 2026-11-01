import Link from "next/link";
import { requireFirm } from "@/lib/auth";import { listSites } from "@/lib/data";
import {
  previewForFirm,
  recentNotifications,
  type Level,
} from "@/lib/reminders";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Alert, Check, Clock } from "@/components/icons";
import ReminderSettings from "@/components/ReminderSettings";
import ReminderRunner from "@/components/ReminderRunner";

export const dynamic = "force-dynamic";

const LEVEL_COPY: Record<Level, { label: string; tone: string; who: string }> = {
  1: { label: "Due this week", tone: "warn", who: "Responsible person" },
  2: { label: "1 week overdue", tone: "warn", who: "Responsible person" },
  3: { label: "3 weeks overdue", tone: "bad", who: "Account owner" },
  4: { label: "30 days overdue", tone: "bad", who: "Account owner" },
};

const STATUS_TONE: Record<string, string> = {
  sent: "ok",
  outbox: "neutral",
  failed: "bad",
  pending: "neutral",
  skipped: "neutral",
};

export default async function RemindersPage() {
  const { firm } = await requireFirm();
  const preview = await previewForFirm(firm);
  const notifications = await recentNotifications(firm.id, 12);
  const sites = await listSites(firm.id);
  const siteName = new Map(sites.map((s) => [s.id, s.name]));
  const on = Boolean(firm.reminders_enabled);

  return (
    <div className="shell section" style={{ maxWidth: 980 }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <div>
          <p className="eyebrow">{firm.name}</p>
          <h1 className="h-page" style={{ marginTop: 4 }}>
            Reminders
          </h1>
        </div>
        <span className={`pill pill-${on ? "ok" : "neutral"}`}>
          {on ? "On" : "Off"}
        </span>
      </div>
      <p className="lede" style={{ marginBottom: 22 }}>
        This is what keeps the subscription alive: the logbook chases the person
        who is meant to record the checks, and escalates when nothing happens.
      </p>

      <div className="grid-2">
        <div className="card card-pad">
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            Schedule
          </p>
          <ReminderSettings
            enabled={on}
            day={firm.reminder_day}
            hour={firm.reminder_hour}
          />
        </div>

        <div className="card card-pad">
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            Escalation
          </p>
          <div className="stack-sm">
            {([1, 2, 3, 4] as Level[]).map((level) => (
              <div
                key={level}
                className="row-between"
                style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}
              >
                <span className="row" style={{ gap: 8 }}>
                  <span className={`pill pill-${LEVEL_COPY[level].tone}`}>
                    {LEVEL_COPY[level].label}
                  </span>
                </span>
                <span className="tiny muted">{LEVEL_COPY[level].who}</span>
              </div>
            ))}
          </div>
          <p className="tiny muted" style={{ marginTop: 10 }}>
            One message per site per week, at the highest level reached. Level 3
            and 4 go to the account owner, not the person on site.
          </p>
        </div>
      </div>

      <section style={{ marginTop: 26 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h2 className="h-sec">What would send now</h2>
          <span className="small muted">
            {preview.length} site{preview.length === 1 ? "" : "s"}
          </span>
        </div>

        {preview.length === 0 ? (
          <div className="card">
            <div className="empty">
              <Check size={22} style={{ color: "var(--ok)", margin: "0 auto 6px" }} />
              Nothing needs chasing. Every site is inside its intervals.
            </div>
          </div>
        ) : (
          <div className="card table-wrap">
            <table className="rows">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Level</th>
                  <th>To</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((plan) => (
                  <tr key={plan.site.id}>
                    <td style={{ fontWeight: 550 }}>{plan.site.name}</td>
                    <td>
                      <span className={`pill pill-${LEVEL_COPY[plan.level].tone}`}>
                        {LEVEL_COPY[plan.level].label}
                      </span>
                    </td>
                    <td className="mono small">{plan.recipient}</td>
                    <td className="small">{plan.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="row" style={{ marginTop: 14, gap: 14, alignItems: "flex-start" }}>
          <div style={{ minWidth: 220 }}>
            <ReminderRunner count={preview.length} />
          </div>
          <p className="tiny muted" style={{ flex: 1, minWidth: 220 }}>
            In production a daily cron calls{" "}
            <code>POST /api/cron/reminders</code> with{" "}
            <code>Authorization: Bearer $CRON_SECRET</code>. It only sends on the
            chosen day and time. This button forces a pass for the current week.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h2 className="h-sec">Recent sends</h2>
        </div>

        {notifications.length === 0 ? (
          <div className="card">
            <div className="empty">
              <Clock size={20} style={{ margin: "0 auto 6px" }} />
              No reminders sent yet. Run a pass above to see one.
            </div>
          </div>
        ) : (
          <div className="card table-wrap">
            <table className="rows">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Site</th>
                  <th>Level</th>
                  <th>To</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>
                      <Link href={`/reminders/${n.id}`} style={{ textDecoration: "underline" }}>
                        {fmtDateTime(n.created_at)}
                      </Link>
                    </td>
                    <td>{siteName.get(n.site_id) ?? n.site_id}</td>
                    <td>
                      <span
                        className={`pill pill-${LEVEL_COPY[n.level as Level]?.tone ?? "neutral"}`}
                      >
                        {LEVEL_COPY[n.level as Level]?.label ?? n.level}
                      </span>
                    </td>
                    <td className="mono small">{n.to_addr}</td>
                    <td>
                      <span className={`pill pill-${STATUS_TONE[n.status] ?? "neutral"}`}>
                        {n.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="tiny muted" style={{ marginTop: 10 }}>
          Last pass:{" "}
          {notifications[0] ? fmtDateTime(notifications[0].created_at) : "never"}.
          Messages are stored in <code>notifications</code> and, without a mail
          provider, in <code>outbox</code>.
        </p>
      </section>

      <p className="note-box" style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <Alert size={16} style={{ flex: "none", marginTop: 2 }} />
        <span>
          Reminders only work if the responsible person&rsquo;s email is right.
          Check it on each site page — a bounced reminder is the same as no
          reminder.
        </span>
      </p>
    </div>
  );
}
