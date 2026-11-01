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
      await fetch("/api/auth/demo", { method: "POST" });
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
