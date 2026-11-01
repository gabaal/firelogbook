"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Camera, Check, Shield, X, Clock } from "./icons";

interface Props {
  siteId: string;
  itemKey: string;
  title: string;
  guidance: string;
  reference: string;
  frequencyLabel: string;
  lastSummary: string | null;
  userName?: string;
}

type Result = "pass" | "fail" | "na";

interface Payload {
  siteId: string;
  itemKey: string;
  result: Result;
  note: string;
  performedBy: string;
  happenedAt: string;
  photo: Blob | null;
  raiseAction: boolean;
  actionDue: string;
}

function toFormData(p: Payload): FormData {
  const fd = new FormData();
  fd.set("siteId", p.siteId);
  fd.set("itemKey", p.itemKey);
  fd.set("result", p.result);
  fd.set("note", p.note);
  fd.set("performedBy", p.performedBy);
  fd.set("happenedAt", p.happenedAt);
  if (p.photo) fd.set("photo", p.photo, "evidence.jpg");
  if (p.result === "fail" && p.raiseAction) {
    fd.set("raiseAction", "1");
    fd.set("actionDue", p.actionDue);
  }
  return fd;
}

async function sendPayload(p: Payload): Promise<boolean> {
  try {
    const res = await fetch("/api/checks", { method: "POST", body: toFormData(p) });
    return res.ok;
  } catch {
    return false;
  }
}

const DB_NAME = "firelogbook";
const STORE = "pending";
const NAME_KEY = "flb.name";

/* ---------------- local offline queue ---------------- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queue(entry: Record<string, unknown>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function drain(send: (entry: Record<string, unknown>) => Promise<boolean>) {
  const db = await openDb();
  const entries = await new Promise<Record<string, unknown>[]>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Record<string, unknown>[]);
      req.onerror = () => reject(req.error);
    },
  );
  for (const entry of entries) {
    const ok = await send(entry);
    if (!ok) break;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(entry.id as number);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  db.close();
}

/* ---------------- photo helper ---------------- */

async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/* ---------------- component ---------------- */

export default function CheckForm(props: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState<Result>("pass");
  const [note, setNote] = useState("");
  const [who, setWho] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [raiseAction, setRaiseAction] = useState(true);
  const [actionDue, setActionDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) {
      setWho(saved);
    } else if (props.userName) {
      setWho(props.userName);
    }
    const inSeven = new Date(Date.now() + 7 * 86_400_000);
    setActionDue(inSeven.toISOString().slice(0, 10));

    // Flush anything recorded while offline.
    if (navigator.onLine) {
      drain(async (entry) => sendPayload(entry.payload as Payload)).catch(() => {});
    }
  }, []);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await compress(file);
    setPhoto({ blob, url: URL.createObjectURL(blob) });
  }

  function buildPayload(): Payload {
    return {
      siteId: props.siteId,
      itemKey: props.itemKey,
      result,
      note: note.trim(),
      performedBy: who.trim(),
      happenedAt: new Date().toISOString(),
      photo: photo?.blob ?? null,
      raiseAction,
      actionDue: actionDue ? new Date(actionDue).toISOString() : "",
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!who.trim()) {
      setError("Add your name so the record shows who checked it.");
      return;
    }
    if (result === "fail" && note.trim().length < 5) {
      setError("A failed check needs a note describing the fault.");
      return;
    }

    setBusy(true);
    if (who.trim()) localStorage.setItem(NAME_KEY, who.trim());

    const payload = buildPayload();
    try {
      const res = await fetch("/api/checks", {
        method: "POST",
        body: toFormData(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save this check");
      }
      router.push(`/sites/${props.siteId}?recorded=1`);
      router.refresh();
    } catch (err) {
      // Network failure: keep the record on the device and move on.
      if (err instanceof TypeError) {
        try {
          await queue({ payload });
          setSavedOffline(true);
          setBusy(false);
          return;
        } catch {
          /* fall through */
        }
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (savedOffline) {
    return (
      <div className="card card-pad stack" style={{ textAlign: "center" }}>
        <Check size={26} style={{ color: "var(--ok)", margin: "6px auto 0" }} />
        <h2 className="h-sec">Saved on this device</h2>
        <p className="small muted">
          There is no connection right now. This check will be uploaded
          automatically next time the app is opened with a signal.
        </p>
        <button className="btn" onClick={() => router.push(`/sites/${props.siteId}`)}>
          Back to the logbook
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack-lg">
      <div className={`card card-pad ${result === "pass" ? "border-ok" : result === "fail" ? "border-bad" : ""}`} style={{
        transition: "border-color 0.2s, background-color 0.2s",
        borderColor: result === "pass" ? "var(--ok)" : result === "fail" ? "var(--bad)" : "var(--line)",
        backgroundColor: result === "pass" ? "var(--ok-tint)" : result === "fail" ? "var(--bad-tint)" : "var(--bg)"
      }}>
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <span className="freq-tag">{props.frequencyLabel}</span>
          <span className="pill pill-neutral">{props.reference}</span>
        </div>
        <h1 className="h-page" style={{ fontSize: "1.75rem" }}>
          {props.title}
        </h1>
        <div className="note-box" style={{ marginTop: 14, padding: 12, background: "var(--ink-1)", borderRadius: 8, borderLeft: "4px solid var(--ink-3)" }}>
          <strong>Guidance:</strong> {props.guidance}
        </div>
        {props.lastSummary && (
          <p className="tiny muted" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={12} /> {props.lastSummary}
          </p>
        )}
      </div>

      <div className="card card-pad stack">
        <div className="field">
          <span className="label">Result</span>
          <div className="segmented">
            <input
              type="radio"
              id="r-pass"
              name="result"
              value="pass"
              checked={result === "pass"}
              onChange={() => setResult("pass")}
            />
            <label htmlFor="r-pass" style={{ color: result === "pass" ? "var(--ok)" : "inherit", fontWeight: result === "pass" ? 600 : 400 }}>
              <Check size={15} /> Pass
            </label>

            <input
              type="radio"
              id="r-fail"
              name="result"
              value="fail"
              checked={result === "fail"}
              onChange={() => setResult("fail")}
            />
            <label htmlFor="r-fail" style={{ color: result === "fail" ? "var(--bad)" : "inherit", fontWeight: result === "fail" ? 600 : 400 }}>
              <Alert size={15} /> Fail
            </label>

            <input
              type="radio"
              id="r-na"
              name="result"
              value="na"
              checked={result === "na"}
              onChange={() => setResult("na")}
            />
            <label htmlFor="r-na" style={{ color: result === "na" ? "var(--ink-3)" : "inherit", fontWeight: result === "na" ? 600 : 400 }}>
              <X size={15} /> N/A
            </label>
          </div>
        </div>

        <label className="field">
          <span className="label">
            Note {result === "fail" ? "(required)" : "(optional)"}
          </span>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              result === "fail"
                ? "What is wrong, where it is, and what you have done about it in the meantime."
                : "Anything worth recording for next time — which call point, which fitting."
            }
          />
        </label>

        {result === "fail" && (
          <div className="card card-pad" style={{ background: "#fdf6f4", borderColor: "#eed0ca", border: "1px solid #eed0ca" }}>
            <label className="row" style={{ gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={raiseAction}
                onChange={(e) => setRaiseAction(e.target.checked)}
                style={{ marginTop: 3, width: 17, height: 17 }}
              />
              <span>
                <span style={{ fontWeight: 600, fontSize: 14.5, color: "#c0392b" }}>
                  Raise a remedial action
                </span>
                <span className="small muted" style={{ display: "block" }}>
                  Puts the fault on the open actions list until someone closes it.
                </span>
              </span>
            </label>
            {raiseAction && (
              <label className="field" style={{ marginTop: 12 }}>
                <span className="label">Due by</span>
                <input
                  type="date"
                  className="input"
                  value={actionDue}
                  onChange={(e) => setActionDue(e.target.value)}
                />
              </label>
            )}
          </div>
        )}

        <div className="field">
          <span className="label">Photo evidence</span>
          {photo ? (
            <div className="photo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Check evidence" />
              <button
                type="button"
                className="btn btn-sm"
                style={{ position: "absolute", top: 8, right: 8 }}
                onClick={() => setPhoto(null)}
              >
                <X size={14} /> Remove
              </button>
            </div>
          ) : (
            <label className="photo-drop">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPickFile}
              />
              <Camera size={22} style={{ color: "var(--ink-3)", margin: "0 auto 6px" }} />
              <span className="small" style={{ fontWeight: 550 }}>
                Take a photo
              </span>
              <span className="tiny muted" style={{ display: "block", marginTop: 2 }}>
                Compressed on the phone. Stored against this record.
              </span>
            </label>
          )}
        </div>

        <label className="field">
          <span className="label">Checked by</span>
          <input
            className="input"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </label>

        {error && (
          <p className="small" style={{ color: "var(--bad)", fontWeight: 550 }}>
            {error}
          </p>
        )}
      </div>

      <div className="sticky-actions">
        <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">
          {busy ? "Saving…" : "Record check"}
        </button>
        <p className="tiny muted" style={{ textAlign: "center", marginTop: 6 }}>
          <Shield size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Timestamped and attributed. Records are not editable after saving.
        </p>
      </div>
    </form>
  );
}
