import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { firmIsActive } from "@/lib/billing";
import { actionOwner, closeAction } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (!firmIsActive(session.firm)) {
    return NextResponse.json({ error: "Subscription required" }, { status: 402 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const note = String(body.note ?? "").slice(0, 1000).trim();
  if (note.length < 3) {
    return NextResponse.json({ error: "Describe what was done" }, { status: 422 });
  }

  const owner = actionOwner(id);
  if (!owner || owner.firmId !== session.firm.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ok = closeAction(id, note);
  if (!ok) return NextResponse.json({ error: "Already closed" }, { status: 409 });

  revalidatePath(`/sites/${owner.siteId}`);
  return NextResponse.json({ ok: true });
}
