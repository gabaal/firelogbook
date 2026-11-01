"use client";

import { useState } from "react";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not send the link");
      setLink(body.link ?? null);
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="card card-pad stack" style={{ textAlign: "center" }}>
        <p className="eyebrow">Check your email</p>
        <p style={{ fontWeight: 600 }}>{email}</p>
        <p className="small muted">
          The link signs you in and expires in 20 minutes.
        </p>

        {link && (
          <div className="note-box" style={{ textAlign: "left" }}>
            <p className="tiny" style={{ fontWeight: 700, marginBottom: 6 }}>
              LOCAL BUILD — no mail provider configured
            </p>
            <p className="tiny" style={{ marginBottom: 10 }}>
              The message was written to the outbox table. Use the link directly:
            </p>
            <a className="btn btn-sm btn-primary" href={link}>
              Open sign-in link
            </a>
          </div>
        )}

        <button className="btn btn-sm btn-ghost" onClick={() => setState("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card card-pad stack">
      <label className="field">
        <span className="label">Work email</span>
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.co.uk"
          autoComplete="email"
        />
      </label>
      {error && (
        <p className="small" style={{ color: "var(--bad)", fontWeight: 550 }}>
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-lg" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>

      <div className="row" style={{ gap: 8, justifyContent: "center" }}>
        <span className="tiny muted">or</span>
        <button
          type="button"
          className="linkish small"
          onClick={async () => {
            await fetch("/api/auth/demo", { method: "POST" });
            window.location.href = "/sites";
          }}
        >
          open the demo account
        </button>
      </div>
    </form>
  );
}
