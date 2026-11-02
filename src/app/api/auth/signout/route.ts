import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, endSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await endSession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch (error) {
    // Still clear the cookie if the database is unreachable.
    console.error("signout: could not delete the session row", error);
  }

  // 303 switches the follow-up request to GET. The default 307 preserves POST,
  // which made the browser POST "/" and fail with 405.
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
