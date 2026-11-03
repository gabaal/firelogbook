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

  // Outbox mode exists for local development only. Returning the link in the
  // response would let anyone sign in as any address, so production fails
  // closed when no mail provider is configured.
  const isProduction = process.env.NODE_ENV === "production";
  if (mailMode() === "outbox" && isProduction) {
    return NextResponse.json(
      { error: "Sign-in email is not configured. Contact the site owner." },
      { status: 503 },
    );
  }

  const { token } = await createLoginToken(email);
  const link = `${baseUrl()}/auth/verify?token=${encodeURIComponent(token)}`;

  try {
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
  } catch (err) {
    // Do not leave a live token behind if the message could not be sent.
    await db
      .delete(schema.login_tokens)
      .where(eq(schema.login_tokens.token, token));
    console.error("signin: could not send the link", err);
    return NextResponse.json(
      { error: "We could not send the email. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    // Only surfaced in a local build with no mail provider configured.
    link: !isProduction && mailMode() === "outbox" ? link : undefined,
  });
}
