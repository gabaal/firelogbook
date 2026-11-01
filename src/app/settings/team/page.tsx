import { notFound } from "next/navigation";
import { requireActiveFirm } from "@/lib/auth";
import { listMemberships } from "@/lib/data";
import InviteForm from "@/components/InviteForm";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { firm } = await requireActiveFirm();
  const members = await listMemberships(firm.id);

  return (
    <div className="shell" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <h1>Team</h1>
        <InviteForm firmId={firm.id} />
      </div>

      <div className="table-wrap">
        <table className="rows">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th style={{ textAlign: "right" }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.m.id}>
                <td>{m.name || "—"}</td>
                <td>{m.email}</td>
                <td>
                  <span className={`badge ${m.m.role === "owner" ? "badge-primary" : "badge-muted"}`}>
                    {m.m.role}
                  </span>
                </td>
                <td style={{ textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>
                  {new Date(m.m.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: "20px 0" }}>
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
