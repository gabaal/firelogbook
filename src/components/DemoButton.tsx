"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DemoButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      // The endpoint redirects to /sites on success and back to /signin on
      // failure, so use wherever it actually landed.
      if (new URL(res.url).pathname.startsWith("/signin")) {
        setBusy(false);
        window.location.href = res.url;
        return;
      }
      router.push("/sites");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button className={className} onClick={open} disabled={busy} type="button">
      {busy ? "Opening…" : children}
    </button>
  );
}
