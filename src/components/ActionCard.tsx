"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Check } from "./icons";
import { fmtDate } from "@/lib/format";
import type { ActionRow } from "@/lib/db";

export default function ActionCard({ action }: { action: ActionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overdue =
    action.due_date && new Date(action.due_date).getTime() < Date.now();

  async function resolve() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${action.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Could not close this action");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="action-row" style={{ display: "block" }}>
      <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
        <Alert
          size={17}
          style={{ color: overdue ? "var(--bad)" : "var(--warn)", marginTop: 2, flex: "none" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="action-title">{action.title}</p>
          {action.detail && <p className="action-detail">{action.detail}</p>}
          <div className="row" style={{ gap: 8, marginTop: 7 }}>
            <span className={`pill ${overdue ? "pill-bad" : "pill-warn"}`}>
              {overdue ? "Past due" : "Due"} {action.due_date ? fmtDate(action.due_date) : ""}
            </span>
            <span className="tiny muted">
              raised {fmtDate(action.created_at)}
            </span>
          </div>
        </div>
      </div>

      {open ? (
        <div className="stack-sm" style={{ marginTop: 12 }}>
          <label className="field">
            <span className="label">What was done?</span>
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contractor replaced the closer arm on 14 Oct. Door now closes and latches."
            />
          </label>
          {error && <p className="small" style={{ color: "var(--bad)" }}>{error}</p>}
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn-sm btn-primary"
              onClick={resolve}
              disabled={saving || note.trim().length < 3}
            >
              <Check size={15} /> {saving ? "Saving…" : "Mark resolved"}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-sm"
          style={{ marginTop: 10, marginLeft: 27 }}
          onClick={() => setOpen(true)}
        >
          Mark resolved
        </button>
      )}
    </div>
  );
}
