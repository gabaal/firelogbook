import { NextResponse } from "next/server";
import { requireFirm } from "@/lib/auth";
import { mailMode, sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a one-line email to the signed-in user so the Brevo configuration
 * (key + verified sender) can be checked without touching customer data.
 */
export async function POST() {
  const { user } = await requireFirm();

  try {
    const { mode } = await sendMail({
      to: user.email,
      subject: "FireLogbook test email",
      text: [
        "This is a test from FireLogbook.",
        "",
        "If you can read this, sign-in links and check reminders will send.",
        "",
        "— FireLogbook",
      ].join("\n"),
    });
    return NextResponse.json({ ok: true, mode, to: user.email });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "The test email failed",
        mode: mailMode(),
      },
      { status: 502 },
    );
  }
}
