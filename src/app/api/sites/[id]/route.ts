import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { updateSite } from "@/lib/data";
import { requireRole } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owners and admins can edit site details
  await requireRole("admin", session);

  try {
    const body = await req.json();
    const { responsiblePerson, responsibleEmail } = body;

    if (!responsiblePerson) {
      return NextResponse.json({ error: "Responsible person is required" }, { status: 400 });
    }

    updateSite(session.firm.id, id, {
      responsible_person: responsiblePerson,
      responsible_email: responsibleEmail ?? "",
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
