import { NextResponse, type NextRequest } from "next/server";
import { getInviteByToken, deleteInvite } from "@/lib/data";
import { getDb } from "@/lib/data";
import { createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invite = getInviteByToken(token);

  if (!invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(invite.email) as any;

  let userId = user?.id;
  if (!userId) {
    userId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)")
      .run(userId, invite.email, invite.email.split("@")[0]);
  }

  // Add membership
  db.prepare("INSERT OR IGNORE INTO memberships (id, firm_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), invite.firm_id, userId, invite.role, new Date().toISOString());

  deleteInvite(invite.id);

  // Create session and sign in
  const session = await createSession(userId, invite.firm_id);

  // In a real Next.js App Router route, we'd set the cookie here.
  // Since this is a Route Handler, we return a redirect with a session cookie.

  const response = NextResponse.redirect(new URL("/sites", req.url));
  response.cookies.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
