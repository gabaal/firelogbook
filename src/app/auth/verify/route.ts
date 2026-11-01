import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  consumeLoginToken,
  ensureAccount,
  createSession,
} from "@/lib/auth";
import { countSites } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/signin?error=expired", req.url));
  }

  const email = await consumeLoginToken(token);
  if (!email) {
    return NextResponse.redirect(new URL("/signin?error=expired", req.url));
  }

  const { user, firm } = await ensureAccount(email);
  const cookieValue = await createSession(user.id, firm.id);
  const destination = countSites(firm.id) === 0 ? "/onboarding" : "/sites";

  const res = NextResponse.redirect(new URL(destination, req.url));
  res.cookies.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86_400,
    secure: req.nextUrl.protocol === "https:",
  });
  return res;
}
