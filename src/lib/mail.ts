import { randomUUID } from "node:crypto";
import { ensureSchema, getDb } from "./db";
import { outbox } from "./schema";

export type MailMode = "email" | "outbox";

/**
 * Brevo is the mail provider. Without BREVO_API_KEY the app falls back to
 * outbox mode: messages are written to the `outbox` table so the flows can be
 * exercised without a provider. Outbox mode must never be left on in production.
 */
export function mailMode(): MailMode {
  return process.env.BREVO_API_KEY ? "email" : "outbox";
}

const DEFAULT_FROM = "FireLogbook <hello@firelogbook.local>";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

/** Accepts either `Name <email@example.com>` or a bare address. */
function parseSender(raw: string): { name: string; email: string } {
  const angled = raw.match(/^\s*(?:"?(.+?)"?\s*)?<([^>\s]+)>\s*$/);
  if (angled) {
    return {
      name: angled[1]?.trim() || "FireLogbook",
      email: angled[2].trim(),
    };
  }
  return { name: "FireLogbook", email: raw.trim() };
}

async function sendViaBrevo(input: MailInput): Promise<void> {
  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY as string,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(process.env.MAIL_FROM ?? DEFAULT_FROM),
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.text,
      ...(input.replyTo ? { replyTo: { email: input.replyTo } } : {}),
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string; code?: string };
      detail = body.message ?? body.code ?? "";
    } catch {
      // Brevo occasionally answers with a non-JSON body.
    }
    throw new Error(
      `Brevo rejected the message (${res.status}${detail ? `: ${detail}` : ""})`,
    );
  }
}

/**
 * Sends through Brevo when BREVO_API_KEY is set. Otherwise writes to the
 * outbox table so the flow can be exercised without a mail provider — the
 * sign-in screen surfaces the link in that mode.
 */
export async function sendMail(input: MailInput): Promise<{ mode: MailMode }> {
  if (mailMode() === "email") {
    await sendViaBrevo(input);
    return { mode: "email" };
  }

  await ensureSchema();
  const db = getDb();
  await db.insert(outbox).values({
    id: randomUUID(),
    to_addr: input.to,
    subject: input.subject,
    body: input.text,
    created_at: new Date(),
  });
  return { mode: "outbox" };
}

export function baseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  // On Vercel, derive the public origin when no explicit base URL is set.
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3100";
}
