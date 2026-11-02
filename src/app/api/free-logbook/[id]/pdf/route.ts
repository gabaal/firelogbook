import { NextResponse } from "next/server";
import { getLead } from "@/lib/leads";
import { renderFreeLogbookPdf } from "@/lib/free-logbook-pdf";
import { slugify } from "@/lib/print";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const pdf = await renderFreeLogbookPdf(lead);
    const filename = `fire-safety-log-book-${slugify(lead.site_name) || "premises"}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Free logbook PDF generation failed:", error);
    return NextResponse.json(
      { error: "The PDF could not be generated. Please try again." },
      { status: 500 },
    );
  }
}
