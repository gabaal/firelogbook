"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "@/components/icons";

const DAYS = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [7, "Sun"],
] as const;

export default function SiteDetailsEditor({
  siteId,
  name,
  address,
  postcode,
  responsiblePerson,
  responsibleEmail,
  workingDays,
}: {
  siteId: string;
  name: string;
  address: string;
  postcode: string;
  responsiblePerson: string;
  responsibleEmail: string;
  workingDays: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    name,
    address,
    postcode,
    person: responsiblePerson,
    email: responsibleEmail,
  });
  const [days, setDays] = useState<number[]>(
    workingDays
      .split(",")
      .map(Number)
      .filter((d) => d >= 1 && d <= 7),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  async function save() {
    setError(null);
    if (fields.name.trim().length < 2) {
      setError("A site name is required.");
      return;
    }
    if (fields.person.trim().length < 2) {
      setError("A responsible person is required.");
      return;
    }
    if (days.length === 0) {
      setError("Choose at least one working day.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          address: fields.address,
          postcode: fields.postcode,
          responsiblePerson: fields.person,
          responsibleEmail: fields.email,
          workingDays: days,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save the site details");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the site details");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => setEditing(true)}
        type="button"
      >
        <Settings size={12} /> Edit site details
      </button>
    );
  }

  return (
    <div className="card card-pad stack-sm" style={{ marginTop: 10, maxWidth: 460 }}>
      <div className="row-between" style={{ marginBottom: 4 }}>
        <strong style={{ fontSize: 14 }}>Site details</strong>
        <button
          className="btn-ghost"
          onClick={() => setEditing(false)}
          style={{ padding: 0 }}
          type="button"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label className="field">
        <span className="label">Site name</span>
        <input
          className="input"
          value={fields.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">Address</span>
        <input
          className="input"
          value={fields.address}
          onChange={(e) => setField("address", e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">Postcode</span>
        <input
          className="input"
          value={fields.postcode}
          onChange={(e) => setField("postcode", e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">Responsible person</span>
        <input
          className="input"
          value={fields.person}
          onChange={(e) => setField("person", e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">Reminder email</span>
        <input
          className="input"
          type="email"
          value={fields.email}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="name@company.co.uk"
        />
        <span className="tiny muted">
          Weekly reminders go here unless the site is opted out.
        </span>
      </label>

      <div className="field">
        <span className="label">Working days</span>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {DAYS.map(([day, label]) => (
            <button
              key={day}
              type="button"
              className={`btn btn-sm ${days.includes(day) ? "btn-primary" : ""}`}
              aria-pressed={days.includes(day)}
              onClick={() => toggleDay(day)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="tiny muted">
          Used to work out when monthly and weekly checks fall due.
        </span>
      </div>

      {error && (
        <p className="small" style={{ color: "var(--bad)", fontWeight: 550 }}>
          {error}
        </p>
      )}

      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button
          className="btn btn-sm btn-primary"
          onClick={save}
          disabled={saving}
          type="button"
          style={{ flex: 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          className="btn btn-sm"
          onClick={() => setEditing(false)}
          type="button"
          style={{ flex: 1 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
