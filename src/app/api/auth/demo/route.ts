import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSession } from "@/lib/auth";
import { demoFirm } from "@/lib/data";
import { getDb } from "@/lib/db";
import { ensureDemoSeed } from "@/lib/seed";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Opens a session for the demo firm, seeding it first if needed. */
export async function POST(req: NextRequest) {
  try {
    await ensureDemoSeed();
  } catch (error) {
    console.error("demo-login: could not seed the demo account", error);
    return NextResponse.redirect(new URL("/signin?error=demo", req.url));
  }

  const firm = await demoFirm();
  if (!firm) {
    return NextResponse.redirect(new URL("/signin?error=nodemo", req.url));
  }

  const db = getDb();
  const membership = await db.query.memberships.findFirst({
    where: eq(schema.memberships.firm_id, firm.id),
  });

  if (!membership) {
    return NextResponse.redirect(new URL("/signin?error=nodemo", req.url));
  }

  const cookieValue = await createSession(membership.user_id, firm.id);
  const res = NextResponse.redirect(new URL("/sites", req.url));
  res.cookies.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86_400,
    secure: req.nextUrl.protocol === "https:",
  });
  return res;
}
