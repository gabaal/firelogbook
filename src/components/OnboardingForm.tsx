"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingForm({ defaultFirmName }: { defaultFirmName: string }) {
  const router = useRouter();
  const [values, setValues] = useState({
    firmName: defaultFirmName,
    name: "",
    address: "",
    postcode: "",
    responsiblePerson: "",
    responsibleEmail: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create the site");
      router.push(body.redirect ?? `/sites/${body.siteId}/audit?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card card-pad stack">
      <label className="field">
        <span className="label">Business name</span>
        <input
          className="input"
          value={values.firmName}
          onChange={(e) => set("firmName", e.target.value)}
          placeholder="Marsh & Vale Property"
          required
        />
        <span className="hint">Appears on the audit pack and in emails.</span>
      </label>

      <hr className="divider" />

      <label className="field">
        <span className="label">Site name</span>
        <input
          className="input"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Harbour Lane Dental Practice"
          required
          autoFocus
        />
      </label>

      <div className="grid-2">
        <label className="field">
          <span className="label">Address</span>
          <input
            className="input"
            value={values.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="12 Harbour Lane, Bristol"
          />
        </label>
        <label className="field">
          <span className="label">Postcode</span>
          <input
            className="input"
            value={values.postcode}
            onChange={(e) => set("postcode", e.target.value)}
            placeholder="BS1 4QA"
          />
        </label>
      </div>

      <label className="field">
        <span className="label">Responsible person</span>
        <input
          className="input"
          value={values.responsiblePerson}
          onChange={(e) => set("responsiblePerson", e.target.value)}
          placeholder="Who signs the logbook off?"
        />
        <span className="hint">
          The person the weekly reminders go to. You can change this later.
        </span>
      </label>

      <label className="field">
        <span className="label">Their email</span>
        <input
          className="input"
          type="email"
          value={values.responsibleEmail}
          onChange={(e) => set("responsibleEmail", e.target.value)}
          placeholder="them@yourbusiness.co.uk"
        />
        <span className="hint">
          Reminders are useless if this is wrong. It can be the same as yours.
        </span>
      </label>

      {error && (
        <p className="small" style={{ color: "var(--bad)", fontWeight: 550 }}>
          {error}
        </p>
      )}

      <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
        {busy ? "Setting up…" : "Create logbook and build first audit pack"}
      </button>
      <p className="tiny muted" style={{ textAlign: "center" }}>
        Nothing is charged during the trial.
      </p>
    </form>
  );
}
