import { NextResponse } from "next/server";
import { consumeLoginToken, createSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/signin?error=missing_token", req.url));
  }

  const email = consumeLoginToken(token);
  if (!email) {
    return NextResponse.redirect(new URL("/signin?error=invalid_token", req.url));
  }

  const { firm, user } = await import("@/lib/auth").then(m => m.ensureAccount(email));
  const sessionToken = await createSession(user.id, firm.id);

  const store = await cookies();
  store.set("flb_session", sessionToken);

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
