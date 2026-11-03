import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { runReminders } from "@/lib/reminders";
import { processNextPdfJob } from "@/lib/pdf-worker";
import { cleanupRateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";

  // Machine call (Vercel Cron, systemd timer, GitHub Actions).
  if (secret && header === `Bearer ${secret}`) {
    return { ok: true as const, firm: undefined };
  }

  // Owner signed in: used by the "Run now" button and for local testing.
  const session = await getSession();
  if (session && session.membership.role === "owner") {
    return { ok: true as const, firm: session.firm };
  }

  return { ok: false as const, firm: undefined };
}

async function handle(req: NextRequest) {
  const auth = await authorized(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const force = req.nextUrl.searchParams.get("force") === "1";

  const result = await runReminders({ firm: auth.firm, dryRun, force });

  // Trigger PDF worker: process one job per cron hit
  await processNextPdfJob(req.nextUrl.origin);

  try {
    await cleanupRateLimits();
  } catch (error) {
    console.error("cron: could not clean rate-limit rows", error);
  }

  revalidatePath("/reminders");
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
