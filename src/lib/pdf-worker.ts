import path from "node:path";
import fs from "node:fs/promises";
import { findBrowser, printToPdf } from "@/lib/print";
import { getNextPdfJob, updatePdfJob, getSiteById } from "@/lib/data";
import { signShareToken } from "@/lib/auth";

export async function processNextPdfJob(origin: string) {
  const job = await getNextPdfJob();
  if (!job) return null;

  await updatePdfJob(job.id, { status: "rendering" });

  try {
    const site = await getSiteById(job.site_id);
    if (!site) {
      await updatePdfJob(job.id, { status: "failed" });
      return null;
    }

    const params = new URLSearchParams(job.params);
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";

    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    query.set("k", signShareToken(site.id, 10 * 60_000));

    const browser = findBrowser();
    if (!browser) {
      throw new Error("Browser not found");
    }

    const printUrl = `${origin}/sites/${site.id}/audit?${query.toString()}`;
    const outDir = path.join(process.cwd(), "data", "exports", "pdf");
    await fs.mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, `audit-${site.id}-${job.id}.pdf`);

    const ok = await printToPdf(browser, printUrl, outFile);

    if (!ok) {
      throw new Error("Printing failed");
    }

    await updatePdfJob(job.id, {
      status: "completed",
      file_path: outFile,
      completed_at: new Date(),
    });

    return job.id;
  } catch (e: any) {
    console.error(`PDF Job ${job.id} failed:`, e);
    await updatePdfJob(job.id, { status: "failed" });
    return null;
  }
}
