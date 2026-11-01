import { NextResponse, type NextRequest } from "next/server";
import fs from "node:fs/promises";
import { getPdfJob } from "@/lib/data";
import { getSiteById } from "@/lib/data";
import { slugify } from "@/lib/print";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = getPdfJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "queued" || job.status === "rendering") {
    return NextResponse.json({ status: job.status }, { status: 200 });
  }

  if (job.status === "failed") {
    return NextResponse.json({ status: "failed", error: "Rendering failed" }, { status: 500 });
  }

  if (job.status === "completed" && job.file_path) {
    try {
      const pdf = await fs.readFile(job.file_path);
      const site = getSiteById(job.site_id);
      const filename = site
        ? `fire-logbook-${slugify(site.name)}.pdf`
        : `audit-pack-${jobId}.pdf`;

      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (e) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Unexpected state" }, { status: 500 });
}
