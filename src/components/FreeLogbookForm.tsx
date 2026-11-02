"use client";

import { useState } from "react";

export default function FreeLogbookForm() {
  const [values, setValues] = useState({
    siteName: "",
    address: "",
    postcode: "",
    responsiblePerson: "",
    email: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ link: string; emailed: boolean; mailMode: string } | null>(null);

  function set(key: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/free-logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      // A crashed serverless function can return an empty body, which makes
      // res.json() throw "Unexpected end of JSON input". Read text first.
      const raw = await res.text();
      let body: {
        error?: string;
        link?: string;
        emailed?: boolean;
        mailMode?: string;
      } = {};
      try {
        if (raw) body = JSON.parse(raw) as typeof body;
      } catch {
        /* non-JSON error page */
      }
      if (!res.ok) {
        throw new Error(
          body.error ??
            (res.status === 404
              ? "The log book service is not available. Please try again shortly."
              : "Could not build the log book"),
        );
      }
      if (!body.link) {
        throw new Error("The server did not return a log book link. Please try again.");
      }
      setResult({
        link: body.link,
        emailed: Boolean(body.emailed),
        mailMode: body.mailMode ?? "outbox",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="card card-pad stack">
        <p className="eyebrow">Ready</p>
        <h2 className="h-sec" style={{ fontSize: "1.3rem" }}>
          Your log book is built
        </h2>
        <p className="small" style={{ color: "var(--ink-2)" }}>
          Six pages, sized for A4, with your details already filled in. Print it
          and keep it where staff can reach it.
        </p>

        <a className="btn btn-primary btn-lg" href={result.link} target="_blank" rel="noreferrer">
          Open and print the log book
        </a>

        {result.emailed && result.mailMode === "email" && (
          <p className="tiny muted">
            A copy of the link is on its way to {values.email}.
          </p>
        )}
        {result.emailed && result.mailMode !== "email" && (
          <p className="tiny muted">
            No mail provider is configured in this build, so the link was not
            emailed — bookmark this page instead.
          </p>
        )}

        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setResult(null)}
          type="button"
        >
          Make another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card card-pad stack">
      <label className="field">
        <span className="label">Premises name</span>
        <input
          className="input"
          value={values.siteName}
          onChange={(e) => set("siteName", e.target.value)}
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
          placeholder="Who signs it off?"
        />
      </label>

      <label className="field">
        <span className="label">Email (optional)</span>
        <input
          className="input"
          type="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@yourbusiness.co.uk"
        />
        <span className="hint">
          We send you the link so you can print it later. No account, no card.
        </span>
      </label>

      {error && (
        <p className="small" style={{ color: "var(--bad)", fontWeight: 550 }}>
          {error}
        </p>
      )}

      <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
        {busy ? "Building…" : "Create my log book"}
      </button>
      <p className="tiny muted" style={{ textAlign: "center" }}>
        Free, no account. A4 PDF, ready in seconds.
      </p>
    </form>
  );
}
