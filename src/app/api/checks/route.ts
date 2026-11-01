import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { UPLOAD_DIR } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { firmIsActive } from "@/lib/billing";
import { getSite, insertAction, insertCheck, getChecklistForSite } from "@/lib/data";
import { ITEMS_BY_KEY } from "@/lib/checklist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO = 8 * 1024 * 1024;
const RESULTS = new Set(["pass", "fail", "na"]);

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Accept a client timestamp only if it is plausible; otherwise stamp now. */
function safeTimestamp(raw: string | null): string {
  const now = Date.now();
  if (!raw) return new Date(now).toISOString();
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return new Date(now).toISOString();
  if (t > now + 5 * 60_000) return new Date(now).toISOString();
  if (t < now - 30 * 86_400_000) return new Date(now).toISOString();
  return new Date(t).toISOString();
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Expected a form upload");
  }

  const siteId = String(form.get("siteId") ?? "");
  const itemKey = String(form.get("itemKey") ?? "");
  const result = String(form.get("result") ?? "");
  const note = String(form.get("note") ?? "").slice(0, 2000).trim();
  const performedBy = String(form.get("performedBy") ?? "").slice(0, 80).trim();
  const happenedAt = safeTimestamp(form.get("happenedAt") as string | null);

  const session = await getSession();
  if (!session) return bad("Sign in first", 401);
  if (!firmIsActive(session.firm)) return bad("Subscription required", 402);

  const site = getSite(session.firm.id, siteId);
  if (!site) return bad("Unknown site", 404);

  const checklist = getChecklistForSite(siteId);
  const item = checklist.find(i => i.key === itemKey);
  if (!item) return bad("Unknown check", 422);
  if (!RESULTS.has(result)) return bad("Unknown result", 422);
  if (!performedBy) return bad("A name is required", 422);
  if (result === "fail" && note.length < 5)
    return bad("A failed check needs a note", 422);

  let photo: string | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO) return bad("Photo is too large", 413);
    if (!file.type.startsWith("image/")) return bad("Photo must be an image", 415);
    const name = `${randomUUID()}.jpg`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, name), bytes);
    photo = name;
  }

  const checkId = insertCheck({
    siteId,
    itemKey,
    performedAt: happenedAt,
    performedBy,
    result: result as "pass" | "fail" | "na",
    note: note || null,
    photo,
  });

  let actionId: string | null = null;
  if (result === "fail" && form.get("raiseAction") === "1") {
    const rawDue = String(form.get("actionDue") ?? "");
    const due = rawDue ? new Date(rawDue) : null;
    actionId = insertAction({
      siteId,
      checkId,
      title: `${ITEMS_BY_KEY[itemKey].title} failed`,
      detail: note,
      dueDate:
        due && !Number.isNaN(due.getTime())
          ? due.toISOString()
          : new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
  }

  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/sites");
  revalidatePath(`/sites/${siteId}/log`);

  return NextResponse.json({ ok: true, id: checkId, actionId });
}
