import { NextResponse, type NextRequest } from "next/server";
import { getInviteByToken, deleteInvite } from "@/lib/data";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
  }

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, invite.email),
  });

  let userId = user?.id;
  if (!userId) {
    userId = crypto.randomUUID();
    await db.insert(schema.users).values({
      id: userId,
      email: invite.email,
      name: invite.email.split("@")[0],
      created_at: new Date(),
    });
  }

  // Add membership
  await db.insert(schema.memberships).values({
    id: crypto.randomUUID(),
    firm_id: invite.firm_id,
    user_id: userId,
    role: invite.role,
    created_at: new Date(),
  });

  await deleteInvite(invite.id);

  // Create session and sign in
  const session = await createSession(userId, invite.firm_id);

  const response = NextResponse.redirect(new URL("/sites", req.url));
  response.cookies.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
