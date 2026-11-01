"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReminderRunner({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/cron/reminders?force=1", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not run the reminders");
      const parts = [`${data.sent} sent`];
      if (data.skipped) parts.push(`${data.skipped} already sent this week`);
      if (data.failed) parts.push(`${data.failed} failed`);
      if (data.planned === 0) parts.push("nothing to chase");
      setSummary(parts.join(" · "));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-sm">
      <button className="btn btn-primary" onClick={run} disabled={busy}>
        {busy ? "Running…" : count > 0 ? `Send ${count} reminder${count === 1 ? "" : "s"} now` : "Run the reminder pass"}
      </button>
      {summary && <p className="tiny muted">{summary}</p>}
      {error && (
        <p className="tiny" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
