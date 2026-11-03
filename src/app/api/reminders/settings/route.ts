import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFirm } from "@/lib/auth";
import { updateReminderSettings } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firm, membership } = await requireFirm();
  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const day = Number(body.day);
  const hour = Number(body.hour);

  await updateReminderSettings(firm.id, {
    enabled: Boolean(body.enabled),
    day: Number.isFinite(day) ? day : undefined,
    hour: Number.isFinite(hour) ? hour : undefined,
  });

  revalidatePath("/reminders");
  return NextResponse.json({ ok: true });
}
