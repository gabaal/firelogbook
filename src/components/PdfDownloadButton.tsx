"use client";

import { useState } from "react";
import { Download } from "@/components/icons";

function fileSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "site"
  );
}

export default function PdfDownloadButton({
  pdfHref,
  siteName,
}: {
  pdfHref: string;
  siteName: string;
}) {
  const [status, setStatus] = useState<"idle" | "working" | "failed">("idle");

  async function download() {
    setStatus("working");
    try {
      // The route renders the PDF server-side and returns it directly.
      const res = await fetch(pdfHref);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not generate the PDF");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `fire-audit-${fileSlug(siteName)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setStatus("idle");
    } catch (error) {
      console.error(error);
      setStatus("failed");
    }
  }

  return (
    <button
      className={`btn btn-primary ${status === "working" ? "loading" : ""}`}
      onClick={download}
      disabled={status === "working"}
      type="button"
    >
      <Download size={16} />
      {status === "idle" && "Download PDF"}
      {status === "working" && "Generating…"}
      {status === "failed" && "Failed — retry"}
    </button>
  );
}
