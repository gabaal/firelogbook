"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [7, "Sunday"],
] as const;

export default function ReminderSettings({
  enabled,
  day,
  hour,
}: {
  enabled: boolean;
  day: number;
  hour: number;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [d, setD] = useState(day);
  const [h, setH] = useState(hour);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save(next?: Partial<{ enabled: boolean; day: number; hour: number }>) {
    setState("saving");
    const payload = {
      enabled: next?.enabled ?? on,
      day: next?.day ?? d,
      hour: next?.hour ?? h,
    };
    try {
      const res = await fetch("/api/reminders/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="stack">
      <label className="row-between" style={{ gap: 12, cursor: "pointer" }}>
        <span>
          <span style={{ fontWeight: 600, fontSize: 14.5 }}>Weekly reminders</span>
          <span className="small muted" style={{ display: "block" }}>
            Chases overdue checks and escalates if nothing happens.
          </span>
        </span>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
            save({ enabled: e.target.checked });
          }}
          style={{ width: 20, height: 20, accentColor: "var(--ember)" }}
        />
      </label>

      <hr className="divider" />

      <div className="grid-2">
        <label className="field">
          <span className="label">Send on</span>
          <select
            className="select"
            value={d}
            onChange={(e) => {
              const value = Number(e.target.value);
              setD(value);
              save({ day: value });
            }}
            disabled={!on}
          >
            {DAYS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Send after</span>
          <select
            className="select"
            value={h}
            onChange={(e) => {
              const value = Number(e.target.value);
              setH(value);
              save({ hour: value });
            }}
            disabled={!on}
          >
            {[6, 7, 8, 9, 10].map((value) => (
              <option key={value} value={value}>
                {String(value).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="tiny muted">
        {state === "saving"
          ? "Saving…"
          : state === "saved"
            ? "Saved."
            : "Times are UK local. The daily run sends at 10:00 UTC, so this is the earliest a reminder can go out. One email per site per week, per escalation step."}
      </p>
    </div>
  );
}
