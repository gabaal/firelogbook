"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReminderRunner({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [testSummary, setTestSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

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

  async function sendTest() {
    setTesting(true);
    setTestError(null);
    setTestSummary(null);
    try {
      const res = await fetch("/api/reminders/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The test email could not be sent");
      setTestSummary(
        data.mode === "email"
          ? `Sent to ${data.to}.`
          : "No mail provider configured — written to the outbox instead.",
      );
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setTesting(false);
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
      <button className="btn btn-ghost btn-sm" onClick={sendTest} disabled={testing}>
        {testing ? "Sending…" : "Send a test email"}
      </button>
      {testSummary && <p className="tiny muted">{testSummary}</p>}
      {testError && (
        <p className="tiny" style={{ color: "var(--bad)" }}>
          {testError}
        </p>
      )}
    </div>
  );
}
