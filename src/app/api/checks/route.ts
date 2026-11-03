import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { storePhoto } from "@/lib/photo";
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
  const happenedAt = safeTimestamp(form.get("happenedAt") as string | null);

  const session = await getSession();
  if (!session) return bad("Sign in first", 401);
  if (!firmIsActive(session.firm)) return bad("Subscription required", 402);

  // Attribute the record to the signed-in account, never to a name the client
  // supplies — that is what makes multi-user logs trustworthy.
  const performedBy = session.user.name.trim() || session.user.email;

  const site = await getSite(session.firm.id, siteId);
  if (!site) return bad("Unknown site", 404);

  const checklist = await getChecklistForSite(siteId);
  const item = checklist.find(i => i.key === itemKey);
  if (!item) return bad("Unknown check", 422);
  if (!RESULTS.has(result)) return bad("Unknown result", 422);
  if (result === "fail" && note.length < 5)
    return bad("A failed check needs a note", 422);

  let photo: string | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO) return bad("Photo is too large", 413);
    if (!file.type.startsWith("image/")) return bad("Photo must be an image", 415);
    try {
      photo = await storePhoto(siteId, file);
    } catch (error) {
      // Do not save a record whose evidence photo was silently dropped.
      console.error("Photo upload failed:", error);
      return NextResponse.json(
        {
          error: "The photo could not be stored. Please try again.",
          code: "photo_upload_failed",
        },
        { status: 503 },
      );
    }
  }

  const checkId = await insertCheck({
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
    actionId = await insertAction({
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
