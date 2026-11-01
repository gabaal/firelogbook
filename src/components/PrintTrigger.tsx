"use client";

import { useEffect } from "react";

/**
 * Fallback for browsers/agents that could not render the PDF server-side:
 * opens the print dialog so the page can be saved as a PDF.
 */
export default function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <p className="small muted" style={{ marginBottom: 12 }}>
      Your browser will open the print dialog — choose “Save as PDF”.
    </p>
  );
}
