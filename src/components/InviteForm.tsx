"use client";

import { useState } from "react";
import { Users } from "@/components/icons";

export default function InviteForm({ firmId }: { firmId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send invitation");
      }

      setEmail("");
      alert("Invitation sent successfully!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="row" style={{ gap: 8, alignItems: "center" }}>
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
        style={{ width: 200 }}
        required
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="input"
        style={{ width: 120 }}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
        {loading ? "Sending..." : (
          <>
            <Users size={14} /> Invite
          </>
        )}
      </button>
      {error && <span style={{ color: "var(--bad)", fontSize: 12, marginLeft: 8 }}>{error}</span>}
    </form>
  );
}
