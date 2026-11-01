"use client";

import { useState } from "react";
import { User, Settings } from "@/components/icons";

export default function SiteDetailsEditor({
  siteId,
  responsiblePerson,
  responsibleEmail,
  workingDays,
}: {
  siteId: string;
  responsiblePerson: string;
  responsibleEmail: string;
  workingDays: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [person, setPerson] = useState(responsiblePerson);
  const [email, setEmail] = useState(responsibleEmail);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsiblePerson: person,
          responsibleEmail: email,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setIsEditing(false);
    } catch (e) {
      alert("Error saving site details. You may not have permission.");
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => setIsEditing(true)}
        style={{ marginLeft: 8, padding: "2px 8px", fontSize: 11 }}
      >
        <Settings size={12} /> Edit
      </button>
    );
  }

  return (
    <div className="card card-pad" style={{ position: "absolute", top: 30, left: 0, zIndex: 10, width: 300, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 13 }}>Edit Site Details</strong>
        <button className="btn-ghost" onClick={() => setIsEditing(false)} style={{ padding: 0 }}>×</button>
      </div>
      <div className="stack-sm">
        <label className="field">
          <span className="label">Responsible Person</span>
          <input
            className="input"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">Contact Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setIsEditing(false)}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
