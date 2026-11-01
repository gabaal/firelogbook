import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { getLead } from "@/lib/leads";
import { exportDir, findBrowser, printToPdf, slugify } from "@/lib/print";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pageUrl = `${req.nextUrl.origin}/free-logbook/${lead.id}`;
  const browser = findBrowser();

  if (!browser) {
    // No headless browser here: the page prints cleanly from the browser.
    return NextResponse.redirect(pageUrl);
  }

  const outDir = exportDir();
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `logbook-${randomUUID()}.pdf`);

  const ok = await printToPdf(browser, pageUrl, outFile);
  if (!ok) {
    return NextResponse.redirect(pageUrl);
  }

  const pdf = await fs.readFile(outFile);
  await fs.rm(outFile, { force: true }).catch(() => {});

  const filename = `fire-safety-log-book-${slugify(lead.site_name) || "premises"}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
