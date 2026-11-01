import { randomUUID } from "node:crypto";
import { getDb, type FirmRow, type NotificationRow, type SiteRow } from "./db";
import { baseUrl, sendMail } from "./mail";
import { actionsForSite, listSites, updateFirm } from "./data";
import { itemStatuses } from "./due";
import { fmtDate } from "./format";
import { ITEMS_BY_KEY } from "./checklist";
import { signToken, verifyToken } from "./tokens";

export type Level = 1 | 2 | 3 | 4;

export interface PlannedReminder {
  firmId: string;
  site: SiteRow;
  level: Level;
  recipient: string;
  subject: string;
  body: string;
  weekKey: string;
  overdue: number;
  maxOverdueDays: number;
  reason: string;
}

export interface RunResult {
  ranAt: string;
  dryRun: boolean;
  planned: number;
  sent: number;
  skipped: number;
  failed: number;
  items: Array<{
    site: string;
    level: Level;
    to: string;
    status: "sent" | "outbox" | "skipped" | "failed" | "preview";
    subject: string;
    error?: string;
  }>;
}

/* ------------------------------------------------------------------ */
/* Time helpers (the customer's clock is London's)                     */
/* ------------------------------------------------------------------ */

const LONDON = "Europe/London";

function londonDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function londonIsoWeekday(d: Date): number {
  const [y, m, day] = londonDateKey(d).split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay(); // 0 = Sunday
  return dow === 0 ? 7 : dow;
}

export function londonHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON,
      hour: "2-digit",
      hour12: false,
    }).format(d),
  );
}

/** ISO week key, e.g. 2026-W43. One reminder per level per site per week. */
export function isoWeekKey(d: Date): string {
  const [y, m, day] = londonDateKey(d).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

function firstName(person: string): string {
  return person.split(" ")[0] || "there";
}

function listLines(items: string[]): string {
  return items.map((line) => `  • ${line}`).join("\n");
}

const LEVEL_LABEL: Record<Level, string> = {
  1: "Due this week",
  2: "One week overdue",
  3: "Three weeks overdue",
  4: "Thirty days overdue",
};

export function levelFor(maxOverdueDays: number): Level {
  if (maxOverdueDays >= 30) return 4;
  if (maxOverdueDays >= 21) return 3;
  if (maxOverdueDays >= 7) return 2;
  return 1;
}

function compose(input: {
  site: SiteRow;
  level: Level;
  overdue: string[];
  due: string[];
  actions: string[];
  recipientName: string;
  unsubscribe: string;
  logbookUrl: string;
}): { subject: string; body: string } {
  const { site, level, overdue, due, actions, recipientName, unsubscribe, logbookUrl } = input;
  const late = overdue.length;
  const lines: string[] = [];

  const greeting = recipientName && recipientName !== "there" ? ` ${firstName(recipientName)}` : "";
  lines.push(`Morning${greeting},`);

  if (level === 1) {
    const total = late + due.length;
    lines.push("");
    lines.push(
      `${total} check${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} attention at ${site.name} this week.`,
    );
  } else if (level === 2) {
    lines.push("");
    lines.push(
      `${late} check${late === 1 ? "" : "s"} at ${site.name} ${late === 1 ? "is" : "are"} now a week overdue.`,
    );
    lines.push(
      "If an inspector or insurer asked for the logbook today, this is the gap they would see.",
    );
  } else if (level === 3) {
    lines.push("");
    lines.push(
      `${site.name} has had ${late} check${late === 1 ? "" : "s"} outstanding for three weeks.`,
    );
    lines.push(
      `${site.responsible_person} has been reminded twice. This is the point to step in, or to book the work.`,
    );
  } else {
    lines.push("");
    lines.push(
      `${site.name} is now thirty days behind on ${late} check${late === 1 ? "" : "s"}.`,
    );
    lines.push(
      "A fire officer would treat a logbook with a month-long gap as evidence that the checks are not being done, not as an administrative slip.",
    );
  }

  if (overdue.length > 0) {
    lines.push("");
    lines.push("OVERDUE");
    lines.push(listLines(overdue));
  }

  if (due.length > 0 && level === 1) {
    lines.push("");
    lines.push("DUE NOW");
    lines.push(listLines(due));
  }

  if (actions.length > 0) {
    lines.push("");
    lines.push("OPEN ACTIONS");
    lines.push(listLines(actions));
  }

  lines.push("");
  lines.push(`Record them: ${logbookUrl}`);
  lines.push("");
  lines.push(`— FireLogbook · ${site.name}`);
  lines.push("");
  lines.push(`Stop these reminders: ${unsubscribe}`);

  const subject =
    level === 1
      ? `${late + due.length} fire check${late + due.length === 1 ? "" : "s"} due at ${site.name}`
      : level === 2
        ? `Still overdue: ${late} fire check${late === 1 ? "" : "s"} at ${site.name}`
        : level === 3
          ? `Three weeks overdue at ${site.name}`
          : `Thirty days overdue at ${site.name}`;

  return { subject, body: lines.join("\n") };
}

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

export function planSite(
  site: SiteRow,
  weekKey: string,
  fallbackEmail: string,
): PlannedReminder | null {
  if (site.remind_opt_out) return null;

  const statuses = itemStatuses(site.id);
  const late = statuses.filter((s) => s.state === "overdue" || s.state === "never");
  const due = statuses.filter((s) => s.state === "due");
  if (late.length === 0 && due.length === 0) return null;

  const maxOverdueDays = late.reduce((max, s) => Math.max(max, s.overdueDays), 0);
  const level = levelFor(maxOverdueDays);

  const overdueLines = late.map((s) => {
    const title = s.item.title;
    return s.state === "never"
      ? `${title} — never recorded`
      : `${title} — ${s.overdueDays} day${s.overdueDays === 1 ? "" : "s"} late, last done ${fmtDate(s.last!.performed_at)}`;
  });
  const dueLines = due.map((s) => `${s.item.title} (${s.item.frequency})`);
  const actionLines = actionsForSite(site.id)
    .filter((a) => a.status === "open")
    .map((a) => `${a.title}${a.due_date ? ` — due ${fmtDate(a.due_date)}` : ""}`);

  // Escalation 3 and 4 go to the account owner, not the person on site.
  const recipient =
    level >= 3 ? fallbackEmail : site.responsible_email || fallbackEmail;
  if (!recipient) return null;

  const recipientName = level >= 3 ? "there" : site.responsible_person;

  const { subject, body } = compose({
    site,
    level,
    overdue: overdueLines,
    due: dueLines,
    actions: actionLines,
    recipientName,
    unsubscribe: `${baseUrl()}/unsubscribe?t=${unsubscribeToken(site.id)}`,
    logbookUrl: `${baseUrl()}/sites/${site.id}`,
  });

  return {
    firmId: site.firm_id,
    site,
    level,
    recipient,
    subject,
    body,
    weekKey,
    overdue: late.length,
    maxOverdueDays,
    reason: `${late.length} overdue, ${due.length} due — ${LEVEL_LABEL[level]}`,
  };
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

/** Signed, non-expiring opt-out token. Cheap and idempotent. */
export function unsubscribeToken(siteId: string): string {
  return signToken({ s: siteId });
}

export function verifyUnsubscribeToken(token: string): string | null {
  const data = verifyToken<{ s: string }>(token);
  return data?.s ?? null;
}

export async function runReminders(options: {
  firm?: FirmRow;
  now?: Date;
  dryRun?: boolean;
  force?: boolean;
}): Promise<RunResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const weekKey = isoWeekKey(now);

  const firms = options.firm
    ? [options.firm]
    : (getDb().prepare("SELECT * FROM firms").all() as unknown as FirmRow[]);

  const result: RunResult = {
    ranAt: now.toISOString(),
    dryRun,
    planned: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  for (const firm of firms) {
    if (!firm.reminders_enabled) continue;

    // Respect the firm's chosen day and time unless explicitly forced.
    if (!options.force) {
      if (londonIsoWeekday(now) !== firm.reminder_day) continue;
      if (londonHour(now) < firm.reminder_hour) continue;
    }

    const fallbackEmail = ownerEmail(firm.id) ?? "";
    for (const site of listSites(firm.id)) {
      const plan = planSite(site, weekKey, fallbackEmail);
      if (!plan) continue;
      result.planned += 1;

      if (dryRun) {
        result.items.push({
          site: site.name,
          level: plan.level,
          to: plan.recipient,
          status: "preview",
          subject: plan.subject,
        });
        continue;
      }

      const id = randomUUID();
      const inserted = getDb()
        .prepare(
          `INSERT OR IGNORE INTO notifications
             (id, firm_id, site_id, level, week_key, to_addr, subject, body, channel, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        )
        .run(
          id,
          firm.id,
          site.id,
          plan.level,
          weekKey,
          plan.recipient,
          plan.subject,
          plan.body,
          process.env.RESEND_API_KEY ? "email" : "outbox",
          new Date().toISOString(),
        );

      if (inserted.changes === 0) {
        result.skipped += 1;
        result.items.push({
          site: site.name,
          level: plan.level,
          to: plan.recipient,
          status: "skipped",
          subject: plan.subject,
        });
        continue;
      }

      try {
        const { mode } = await sendMail({
          to: plan.recipient,
          subject: plan.subject,
          text: plan.body,
        });
        getDb()
          .prepare("UPDATE notifications SET status = ? WHERE id = ?")
          .run(mode === "email" ? "sent" : "outbox", id);
        result.sent += 1;
        result.items.push({
          site: site.name,
          level: plan.level,
          to: plan.recipient,
          status: mode === "email" ? "sent" : "outbox",
          subject: plan.subject,
        });
      } catch (err) {
        // Remove the row so the next run retries rather than waiting a week.
        getDb().prepare("DELETE FROM notifications WHERE id = ?").run(id);
        result.failed += 1;
        result.items.push({
          site: site.name,
          level: plan.level,
          to: plan.recipient,
          status: "failed",
          subject: plan.subject,
          error: err instanceof Error ? err.message : "send failed",
        });
      }
    }
  }

  return result;
}

function ownerEmail(firmId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT u.email AS email
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.firm_id = ?
       ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.created_at
       LIMIT 1`,
    )
    .get(firmId) as { email: string } | undefined;
  return row?.email ?? null;
}

export function recentNotifications(firmId: string, limit = 20): NotificationRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM notifications WHERE firm_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(firmId, limit) as unknown as NotificationRow[];
}

export function getNotification(
  firmId: string,
  id: string,
): NotificationRow | null {
  const row = getDb()
    .prepare("SELECT * FROM notifications WHERE id = ? AND firm_id = ?")
    .get(id, firmId) as NotificationRow | undefined;
  return row ?? null;
}

export function previewForFirm(firm: FirmRow, now = new Date()): PlannedReminder[] {
  const email = ownerEmail(firm.id) ?? "";
  const weekKey = isoWeekKey(now);
  return listSites(firm.id)
    .map((site) => planSite(site, weekKey, email))
    .filter((p): p is PlannedReminder => Boolean(p));
}

export function updateReminderSettings(
  firmId: string,
  settings: { enabled?: boolean; day?: number; hour?: number },
): void {
  const patch: Partial<FirmRow> = {};
  if (typeof settings.enabled === "boolean") {
    patch.reminders_enabled = settings.enabled ? 1 : 0;
  }
  if (settings.day && settings.day >= 1 && settings.day <= 7) {
    patch.reminder_day = settings.day;
  }
  if (typeof settings.hour === "number" && settings.hour >= 0 && settings.hour <= 23) {
    patch.reminder_hour = settings.hour;
  }
  updateFirm(firmId, patch);
}
