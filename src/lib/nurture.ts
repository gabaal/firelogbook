import { randomUUID } from "node:crypto";
import { and, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { ensureSchema, getDb, type LeadRow } from "./db";
import { baseUrl, sendMail } from "./mail";
import { signToken, verifyToken } from "./tokens";
import { trackEvent } from "./analytics";
import * as schema from "./schema";

const DAY = 86_400_000;

export function leadUnsubscribeToken(leadId: string): string {
  return signToken({ l: leadId });
}

export function verifyLeadUnsubscribeToken(token: string): string | null {
  const data = verifyToken<{ l: string }>(token);
  return data?.l ?? null;
}

interface NurtureStep {
  step: number;
  afterDays: number;
  subject: (lead: LeadRow) => string;
  body: (lead: LeadRow, unsubscribe: string) => string;
}

/**
 * Four short emails after a free log book is downloaded. Only leads that
 * ticked the marketing box are eligible, and only while they are not an
 * account and have not opted out.
 */
export const NURTURE_STEPS: NurtureStep[] = [
  {
    step: 1,
    afterDays: 2,
    subject: () => "Three fire checks that quietly get skipped",
    body: (lead, unsubscribe) => [
      "Hi,",
      "",
      `You downloaded a fire safety log book for ${lead.site_name}. Most small sites get the obvious checks right and miss these:`,
      "",
      "1. Final exit doors. They must open from the inside without a key, every day. A door that needs a key, or a route with a chair in it, fails the first thing a fire officer looks at.",
      "2. Fire doors. A wedge is the classic one, but a door that will not latch, or has lost its smoke seals, is not doing the job either.",
      "3. Emergency lighting. Press the test button each week. The annual one-hour test only tells you something if the lamps still work.",
      "",
      "Your printed log book has a line for each of them:",
      `${baseUrl()}/free-logbook/${lead.id}`,
      "",
      "If you would rather the checks chased you, FireLogbook sends a reminder when one falls due and builds a dated audit pack when an inspector asks:",
      `${baseUrl()}/signin`,
      "",
      "— FireLogbook",
      "",
      `Stop these emails: ${unsubscribe}`,
    ].join("\n"),
  },
  {
    step: 2,
    afterDays: 7,
    subject: () => "What an inspector will ask to see",
    body: (_lead, unsubscribe) => [
      "Hi,",
      "",
      "When an inspector asks for the fire safety logbook, they are usually looking for three things:",
      "",
      "• Dates. Not just that a check was done, but when, and whether the gaps match the frequency you claim.",
      "• Failures and actions. A failed check with no follow-up is worse than no record at all.",
      "• Who did it. A name against each entry, not just a tick.",
      "",
      "A paper book can hold all of that. What it cannot do is tell you the fire doors were last checked three weeks ago, or produce a clean PDF with the photos attached.",
      "",
      "FireLogbook keeps the same log with a timestamp, a photo if you took one, and the person who recorded it. The audit pack is one click.",
      "",
      `Start a 14-day trial: ${baseUrl()}/signin`,
      "",
      "— FireLogbook",
      "",
      `Stop these emails: ${unsubscribe}`,
    ].join("\n"),
  },
  {
    step: 3,
    afterDays: 14,
    subject: () => "The gap a paper logbook hides",
    body: (_lead, unsubscribe) => [
      "Hi,",
      "",
      "Here is the failure mode paper hides best. The log book sits by the door, someone does the daily checks, and then a busy week means nobody writes anything down. Nothing looks wrong, because the empty pages are not shouting at anyone.",
      "",
      "Three weeks later an inspector sees a gap. It does not matter that the checks were probably done; the record does not show it.",
      "",
      "FireLogbook surfaces what is due, reminds the person responsible when it is late, and escalates to the account owner if nothing happens. The point is not a nicer form; it is closing the gap before anyone asks.",
      "",
      `${baseUrl()}/signin`,
      "",
      "— FireLogbook",
      "",
      `Stop these emails: ${unsubscribe}`,
    ].join("\n"),
  },
  {
    step: 4,
    afterDays: 21,
    subject: () => "Keep the paper, or put the logbook on a phone",
    body: (_lead, unsubscribe) => [
      "Hi,",
      "",
      "A last, practical note. The free log book you downloaded is not a trial that stops working — keep it, print it, use it.",
      "",
      "FireLogbook is for the part paper cannot do: reminding the right person, showing what is overdue, and producing a dated PDF for an insurer or fire officer. It is £29 per site per month after 14 days, and you can export everything if you leave.",
      "",
      "If that is not useful yet, ignore this and the emails will stop.",
      "",
      `Start a trial: ${baseUrl()}/signin`,
      `Free printable version: ${baseUrl()}/free-logbook`,
      "",
      "— FireLogbook",
      "",
      `Stop these emails: ${unsubscribe}`,
    ].join("\n"),
  },
];

export interface NurtureItem {
  leadId: string;
  site: string;
  step: number;
  to: string;
  status: "sent" | "outbox" | "failed" | "preview";
  subject: string;
  error?: string;
}

export interface NurtureResult {
  ranAt: string;
  dryRun: boolean;
  considered: number;
  sent: number;
  failed: number;
  skipped: number;
  items: NurtureItem[];
}

export async function runLeadNurture(
  options: { now?: Date; dryRun?: boolean; limit?: number } = {},
): Promise<NurtureResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const limit = options.limit ?? 50;

  await ensureSchema();
  const db = getDb();

  const result: NurtureResult = {
    ranAt: now.toISOString(),
    dryRun,
    considered: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    items: [],
  };

  const candidates = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        eq(schema.leads.marketing_consent, 1),
        eq(schema.leads.nurture_opt_out, 0),
        isNull(schema.leads.converted_at),
        isNotNull(schema.leads.email),
        lte(schema.leads.created_at, new Date(now.getTime() - 2 * DAY)),
      ),
    )
    .limit(500);

  // Belt and braces: an account with the same address also stops the sequence.
  const accountRows = await db
    .select({ email: schema.users.email })
    .from(schema.users);
  const accountEmails = new Set(accountRows.map((row) => row.email.toLowerCase()));

  for (const lead of candidates) {
    if (result.items.length >= limit) break;
    if (!lead.email) continue;

    if (accountEmails.has(lead.email.toLowerCase())) {
      if (!dryRun) {
        await db
          .update(schema.leads)
          .set({ converted_at: now })
          .where(eq(schema.leads.id, lead.id));
      }
      continue;
    }

    const [last] = await db
      .select({ step: schema.lead_nurture.step })
      .from(schema.lead_nurture)
      .where(eq(schema.lead_nurture.lead_id, lead.id))
      .orderBy(desc(schema.lead_nurture.step))
      .limit(1);

    const next = NURTURE_STEPS.find((step) => step.step === (last?.step ?? 0) + 1);
    if (!next) {
      result.skipped += 1;
      continue;
    }

    const due = new Date(
      new Date(lead.created_at).getTime() + next.afterDays * DAY,
    );
    if (due > now) {
      result.skipped += 1;
      continue;
    }

    result.considered += 1;
    const unsubscribe = `${baseUrl()}/lead-unsubscribe?t=${encodeURIComponent(
      leadUnsubscribeToken(lead.id),
    )}`;
    const subject = next.subject(lead);
    const body = next.body(lead, unsubscribe);

    if (dryRun) {
      result.items.push({
        leadId: lead.id,
        site: lead.site_name,
        step: next.step,
        to: lead.email,
        status: "preview",
        subject,
      });
      continue;
    }

    const id = randomUUID();
    const inserted = await db
      .insert(schema.lead_nurture)
      .values({
        id,
        lead_id: lead.id,
        step: next.step,
        status: "pending",
        created_at: now,
      })
      .onConflictDoNothing()
      .returning({ id: schema.lead_nurture.id });

    if (inserted.length === 0) {
      result.skipped += 1;
      continue;
    }

    try {
      const { mode } = await sendMail({
        to: lead.email,
        subject,
        text: body,
      });
      await db
        .update(schema.lead_nurture)
        .set({ status: mode === "email" ? "sent" : "outbox" })
        .where(eq(schema.lead_nurture.id, id));
      await trackEvent("lead_nurture_sent", { props: { step: next.step } });
      result.sent += 1;
      result.items.push({
        leadId: lead.id,
        site: lead.site_name,
        step: next.step,
        to: lead.email,
        status: mode === "email" ? "sent" : "outbox",
        subject,
      });
    } catch (error) {
      // Delete the row so the next pass retries rather than skipping a step.
      await db
        .delete(schema.lead_nurture)
        .where(eq(schema.lead_nurture.id, id));
      result.failed += 1;
      result.items.push({
        leadId: lead.id,
        site: lead.site_name,
        step: next.step,
        to: lead.email,
        status: "failed",
        subject,
        error: error instanceof Error ? error.message : "send failed",
      });
    }
  }

  return result;
}
