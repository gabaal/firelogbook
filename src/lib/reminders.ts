import { randomUUID } from "node:crypto";
import { getDb, type FirmRow, type NotificationRow, type SiteRow } from "./db";
import { baseUrl, mailMode, sendMail } from "./mail";
import { actionsForSite, listSites, updateFirm } from "./data";
import { itemStatuses } from "./due";
import { fmtDate } from "./format";
import { ITEMS_BY_KEY } from "./checklist";
import { signToken, verifyToken } from "./tokens";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "./schema";

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

export async function planSite(
  site: SiteRow,
  weekKey: string,
  fallbackEmail: string,
): Promise<PlannedReminder | null> {
  if (site.remind_opt_out) return null;

  const statuses = await itemStatuses(site.id);
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
  const actionLines = (await actionsForSite(site.id))
    .filter((a) => a.status === "open")
    .map((a) => `${a.title}${a.due_date ? ` — due ${fmtDate(a.due_date)}` : ""}`);

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

  const db = getDb();
  const firms = options.firm
    ? [options.firm]
    : await db.query.firms.findMany();

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

    if (!options.force) {
      if (londonIsoWeekday(now) !== firm.reminder_day) continue;
      if (londonHour(now) < firm.reminder_hour) continue;
    }

    const fallbackEmail = await ownerEmail(firm.id) ?? "";
    const sites = await listSites(firm.id);
    for (const site of sites) {
      const plan = await planSite(site, weekKey, fallbackEmail);
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
      // The unique index on (site_id, level, week_key) makes a second pass in
      // the same week a no-op rather than a duplicate send.
      const inserted = await db
        .insert(schema.notifications)
        .values({
          id,
          firm_id: firm.id,
          site_id: site.id,
          level: plan.level,
          week_key: weekKey,
          to_addr: plan.recipient,
          subject: plan.subject,
          body: plan.body,
          channel: mailMode() === "email" ? "email" : "outbox",
          status: "pending",
          created_at: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: schema.notifications.id });

      if (inserted.length === 0) {
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
        await db.update(schema.notifications)
          .set({ status: mode === "email" ? "sent" : "outbox" })
          .where(eq(schema.notifications.id, id));
        result.sent += 1;
        result.items.push({
          site: site.name,
          level: plan.level,
          to: plan.recipient,
          status: mode === "email" ? "sent" : "outbox",
          subject: plan.subject,
        });
      } catch (err) {
        await db.delete(schema.notifications).where(eq(schema.notifications.id, id));
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

async function ownerEmail(firmId: string): Promise<string | null> {
  const db = getDb();
  const res = await db.select({
    email: schema.users.email,
  })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.user_id))
    .where(eq(schema.memberships.firm_id, firmId))
    .orderBy(sql`CASE ${schema.memberships.role} WHEN 'owner' THEN 0 ELSE 1 END, ${schema.memberships.created_at} ASC`)
    .limit(1);

  return res[0]?.email ?? null;
}

export async function recentNotifications(firmId: string, limit = 20): Promise<NotificationRow[]> {
  const db = getDb();
  return await db.query.notifications.findMany({
    where: eq(schema.notifications.firm_id, firmId),
    orderBy: [desc(schema.notifications.created_at)],
    limit: limit,
  });
}

export async function getNotification(
  firmId: string,
  id: string,
): Promise<NotificationRow | null> {
  const db = getDb();
  return await db.query.notifications.findFirst({
    where: and(
      eq(schema.notifications.id, id),
      eq(schema.notifications.firm_id, firmId)
    ),
  }) ?? null;
}

export async function previewForFirm(firm: FirmRow, now = new Date()): Promise<PlannedReminder[]> {
  const fallbackEmail = await ownerEmail(firm.id) ?? "";
  const sites = await listSites(firm.id);
  const plans = await Promise.all(
    sites.map(async (site) => planSite(site, isoWeekKey(now), fallbackEmail))
  );
  return plans.filter((p): p is PlannedReminder => p !== null);
}

export async function updateReminderSettings(
  firmId: string,
  settings: { enabled?: boolean; day?: number; hour?: number },
): Promise<void> {
  const patch: Partial<FirmRow> = {};
  if (typeof settings.enabled === "boolean") {
    patch.reminders_enabled = settings.enabled ? 1 : 0;
  }
  if (settings.day && settings.day >= 1 && settings.day <= 7) {
    patch.reminder_day = settings.day;
  }
  // The daily cron runs at 10:00 UTC, so a later hour could never fire.
  if (typeof settings.hour === "number" && settings.hour >= 0 && settings.hour <= 10) {
    patch.reminder_hour = settings.hour;
  }
  await updateFirm(firmId, patch);
}
