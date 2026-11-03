import { NextResponse } from "next/server";
import { requireFirm } from "@/lib/auth";
import { mailMode, sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Sends a one-line email so the Brevo configuration (key + verified sender)
 * can be checked without touching customer data. Owners and admins may send
 * it to any address; everyone else only to their own.
 */
export async function POST(req: Request) {
  const { user, membership } = await requireFirm();
  const body = await req.json().catch(() => ({}));

  const requested = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";
  const canChooseRecipient = membership.role === "owner" || membership.role === "admin";
  const to = canChooseRecipient && requested ? requested : user.email;

  if (!EMAIL.test(to) || to.length > 160) {
    return NextResponse.json({ error: "That does not look like an email address" }, { status: 422 });
  }

  try {
    const { mode } = await sendMail({
      to,
      subject: "FireLogbook test email",
      text: [
        "This is a test from FireLogbook.",
        "",
        "If you can read this, sign-in links and check reminders will send.",
        "",
        "— FireLogbook",
      ].join("\n"),
    });
    return NextResponse.json({ ok: true, mode, to });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "The test email failed",
        mode: mailMode(),
        to,
      },
      { status: 502 },
    );
  }
}
