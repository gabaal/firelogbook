"use client";

import { useState } from "react";
import { Download } from "@/components/icons";

export default function PdfDownloadButton({
  pdfHref,
  siteName
}: {
  pdfHref: string;
  siteName: string;
}) {
  const [status, setStatus] = useState<"idle" | "queued" | "rendering" | "completed" | "failed">("idle");
  const [jobId, setJobId] = useState<string | null>(null);

  const handleDownload = async () => {
    setStatus("queued");

    try {
      const res = await fetch(pdfHref);
      if (res.status === 202) {
        const data = await res.json();
        setJobId(data.jobId);
        pollStatus(data.jobId);
      } else if (res.ok) {
        // Fallback for existing synchronous PDFs
        window.location.href = pdfHref;
        setStatus("idle");
      } else {
        throw new Error("Request failed");
      }
    } catch (e) {
      console.error(e);
      setStatus("failed");
    }
  };

  const pollStatus = async (id: string) => {
    const pollUrl = `/api/audit/pdf/${id}`;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(pollUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "rendering") {
            setStatus("rendering");
          } else if (data.status === "completed") {
            clearInterval(interval);
            setStatus("completed");
            window.location.href = pollUrl;
          } else if (data.status === "failed") {
            clearInterval(interval);
            setStatus("failed");
          }
        } else if (res.status === 200 && res.headers.get("Content-Type") === "application/pdf") {
          // The poll route now returns the PDF directly when completed
          clearInterval(interval);
          setStatus("completed");
          window.location.href = pollUrl;
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000);

    // Timeout after 1 minute
    setTimeout(() => clearInterval(interval), 60000);
  };

  return (
    <button
      className={`btn btn-primary ${status !== "idle" ? "loading" : ""}`}
      onClick={handleDownload}
      disabled={status === "queued" || status === "rendering"}
    >
      <Download size={16} />
      {status === "idle" && "Download PDF"}
      {status === "queued" && " Queuing..."}
      {status === "rendering" && " Generating..."}
      {status === "completed" && " Ready!"}
      {status === "failed" && " Failed - Retry?"}
    </button>
  );
}
