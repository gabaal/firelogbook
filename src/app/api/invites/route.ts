import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { insertInvite, logEmail } from "@/lib/data";

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

    insertInvite({
      firmId: session.firm.id,
      email,
      role,
      token,
      expiresAt,
    });

    const inviteUrl = `${new URL(req.url).origin}/auth/invite/${token}`;
    const subject = `Invitation to join ${session.firm.name}`;
    const body = `You have been invited to join ${session.firm.name} as a ${role}.\n\nAccept the invitation here:\n${inviteUrl}`;

    logEmail({
      firmId: session.firm.id,
      toAddr: email,
      subject,
      body,
      status: "outbox",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
