import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getSite, updateSite } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function workingDays(value: unknown, fallback: string): string {
  const raw = Array.isArray(value)
    ? value.map(Number)
    : typeof value === "string"
      ? value.split(",").map(Number)
      : [];
  const days = [...new Set(raw.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort(
    (a, b) => a - b,
  );
  return days.length > 0 ? days.join(",") : fallback;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.membership.role !== "owner" && session.membership.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { id } = await params;
  const site = await getSite(session.firm.id, id);
  if (!site) {
    return NextResponse.json({ error: "Unknown site" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? site.name).trim().slice(0, 120);
  const address = String(body.address ?? site.address).trim().slice(0, 200);
  const postcode = String(body.postcode ?? site.postcode).trim().slice(0, 16);
  const responsiblePerson = String(
    body.responsiblePerson ?? site.responsible_person,
  )
    .trim()
    .slice(0, 80);
  const responsibleEmail = String(
    body.responsibleEmail ?? site.responsible_email,
  )
    .trim()
    .slice(0, 160);

  if (name.length < 2) {
    return NextResponse.json({ error: "A site name is required" }, { status: 422 });
  }
  if (responsiblePerson.length < 2) {
    return NextResponse.json(
      { error: "A responsible person is required" },
      { status: 422 },
    );
  }
  if (responsibleEmail && !EMAIL.test(responsibleEmail)) {
    return NextResponse.json(
      { error: "That does not look like an email address" },
      { status: 422 },
    );
  }

  await updateSite(session.firm.id, id, {
    name,
    address,
    postcode,
    responsible_person: responsiblePerson,
    responsible_email: responsibleEmail,
    working_days: workingDays(body.workingDays, site.working_days),
  });

  revalidatePath(`/sites/${id}`);
  revalidatePath("/sites");
  revalidatePath("/reminders");

  return NextResponse.json({ ok: true });
}
