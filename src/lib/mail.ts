import { randomUUID } from "node:crypto";
import { ensureSchema, getDb } from "./db";
import { outbox } from "./schema";

export type MailMode = "email" | "outbox";

export function mailMode(): MailMode {
  return process.env.RESEND_API_KEY ? "email" : "outbox";
}

const FROM = process.env.MAIL_FROM ?? "FireLogbook <hello@firelogbook.local>";

export interface MailInput {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends through Resend when RESEND_API_KEY is set. Otherwise writes to the
 * local outbox table so the flow can be exercised without a mail provider —
 * the sign-in screen surfaces the link in that mode.
 */
export async function sendMail(input: MailInput): Promise<{ mode: MailMode }> {
  if (mailMode() === "email") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Mail provider rejected the message (${res.status})`);
    }
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
