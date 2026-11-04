import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { insertInvite, logEmail } from "@/lib/data";
import { baseUrl, sendMail } from "@/lib/mail";

export async function POST(
  req: NextRequest,
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owners can invite others
  if (session.membership.role !== "owner") {
    return NextResponse.json({ error: "Only owners can invite members" }, { status: 403 });
  }

  try {
    const { email, role } = await req.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    if (role !== "admin" && role !== "member") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await insertInvite({
      firmId: session.firm.id,
      email,
      role,
      token,
      expiresAt,
    });

    const inviteUrl = `${baseUrl()}/auth/invite/${token}`;
    const inviter = session.user.name?.trim() || session.user.email;
    const roleLabel = role === "admin" ? "an administrator" : "a member";
    const subject = `You have been invited to join ${session.firm.name}`;
    const body = [
      `${inviter} invited you to join ${session.firm.name} on FireLogbook as ${roleLabel}.`,
      "",
      "FireLogbook records fire safety checks on a phone, chases what falls overdue and builds the audit pack.",
      "",
      "Accept the invitation and sign in:",
      inviteUrl,
      "",
      "The link is valid for seven days. It signs you in to your firm; there is no password to set up.",
      "",
      "If you were not expecting this email, ignore it.",
    ].join("\n");

    let status: "sent" | "outbox" = "outbox";
    try {
      const result = await sendMail({
        to: email,
        subject,
        text: body,
        replyTo: session.user.email,
      });
      status = result.mode === "email" ? "sent" : "outbox";
    } catch (sendError) {
      // Keep the invitation and its link visible in the Outbox so the owner can
      // still pass it on by hand.
      await logEmail({
        firmId: session.firm.id,
        toAddr: email,
        subject,
        body,
        status: "failed",
      });
      console.error("Invitation email failed", sendError);
      return NextResponse.json(
        {
          error:
            "The invitation was created but the email could not be sent. Try again, or copy the link from the Outbox.",
        },
        { status: 502 },
      );
    }

    await logEmail({
      firmId: session.firm.id,
      toAddr: email,
      subject,
      body,
      status,
    });

    return NextResponse.json({ ok: true, mode: status === "sent" ? "email" : "outbox" }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
