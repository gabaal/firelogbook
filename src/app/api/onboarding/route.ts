import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFirm } from "@/lib/auth";
import { countSites, createSite, renameFirm } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firm } = await requireFirm();

  if (countSites(firm.id) >= 25) {
    return NextResponse.json(
      { error: "That is a lot of sites — talk to us about a multi-site account." },
      { status: 422 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 120);
  const address = String(body.address ?? "").trim().slice(0, 200);
  const postcode = String(body.postcode ?? "").trim().slice(0, 16).toUpperCase();
  const responsiblePerson = String(body.responsiblePerson ?? "").trim().slice(0, 80);
  const responsibleEmail = String(body.responsibleEmail ?? "").trim().slice(0, 160);
  const firmName = String(body.firmName ?? "").trim().slice(0, 120);

  if (name.length < 2) {
    return NextResponse.json({ error: "Give the site a name" }, { status: 422 });
  }

  if (firmName.length >= 2 && firmName !== firm.name) {
    renameFirm(firm.id, firmName);
  }

  const site = createSite({
    firmId: firm.id,
    name,
    address,
    postcode,
    responsiblePerson: responsiblePerson || firm.name,
    responsibleEmail,
  });

  revalidatePath("/sites");

  return NextResponse.json({
    ok: true,
    siteId: site.id,
    redirect: `/sites/${site.id}/audit?new=1`,
  });
}
