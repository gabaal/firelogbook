import { NextResponse, type NextRequest } from "next/server";
import { createLoginToken } from "@/lib/auth";
import { baseUrl, mailMode, sendMail } from "@/lib/mail";
import { getDb } from "@/lib/db";
import { eq, sql, and } from "drizzle-orm";
import * as schema from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!EMAIL.test(email) || email.length > 160) {
    return NextResponse.json({ error: "That does not look like an email address" }, { status: 422 });
  }

  // Simple throttle: one link per email per minute.
  const db = getDb();
  const results = await db.select({ count: sql<number>`count(*)` })
    .from(schema.login_tokens)
    .where(and(
      eq(schema.login_tokens.email, email),
      sql`${schema.login_tokens.created_at} > ${new Date(Date.now() - 60_000).toISOString()}`
    ));
  const n = Number(results[0]?.count ?? 0);
  if (n > 0) {
    return NextResponse.json(
      { error: "A link was just sent. Wait a minute before asking for another." },
      { status: 429 },
    );
  }

  const { token } = createLoginToken(email);
  const link = `${baseUrl()}/auth/verify?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: email,
    subject: "Your FireLogbook sign-in link",
    text: [
      "Use this link to sign in to FireLogbook. It expires in 20 minutes and works once.",
      "",
      link,
      "",
      "If you did not ask for this, ignore the message.",
    ].join("\n"),
  });

  return NextResponse.json({
    ok: true,
    // Only surfaced when no mail provider is configured (local/outbox mode).
    link: mailMode() === "outbox" ? link : undefined,
  });
}
