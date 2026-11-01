"use client";

import { useState } from "react";

export default function SharePack({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button className="btn btn-sm" onClick={copy} type="button" title="Share this pack with an insurer or inspector">
      {copied ? "Link copied ✓" : "Share link"}
    </button>
  );
}
