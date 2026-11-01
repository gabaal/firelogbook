import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

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

  const db = getDb();
  await db.run(sql`
    INSERT INTO outbox (id, to_addr, subject, body, created_at)
    VALUES (${randomUUID()}, ${input.to}, ${input.subject}, ${input.text}, ${new Date()})
  `);
  return { mode: "outbox" };
}

export function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.APP_URL ??
    "http://localhost:3100"
  ).replace(/\/$/, "");
}
