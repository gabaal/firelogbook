import Link from "next/link";
import { requireActiveFirm } from "@/lib/auth";
import { listSites } from "@/lib/data";
import { summaryFor } from "@/lib/due";
import { Shield, Plus, AlertTriangle } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { firm } = await requireActiveFirm();
  const sites = await listSites(firm.id);

  // Calculate aggregate health for the firm
  const siteSummaries = await Promise.all(
    sites.map(async (site) => {
      const summary = await summaryFor(site.id);
      return { site, summary };
    })
  );

  const totalOverdue = siteSummaries.reduce((sum, s) => sum + s.summary.overdue, 0);
  const totalDue = siteSummaries.reduce((sum, s) => sum + s.summary.due, 0);
  const totalNever = siteSummaries.reduce((sum, s) => sum + s.summary.never, 0);
  const totalOpenActions = siteSummaries.reduce((sum, s) => sum + s.summary.openActions, 0);

  return (
    <div className="shell section">
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 className="h-page">{firm.name}</h1>
          <Link href="/settings" className="btn btn-ghost btn-sm">
            Settings
          </Link>
        </div>
        <Link href={`/sites/new`} className="btn btn-primary">
          <Plus size={16} /> Add Site
        </Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div className="card card-pad" style={{ textAlign: "center" }}>
          <span className="eyebrow">Overdue</span>
          <p className="h-page" style={{ color: "var(--bad)", margin: "8px 0" }}>{totalOverdue}</p>
          <span className="tiny muted">Checks needing attention</span>
        </div>
        <div className="card card-pad" style={{ textAlign: "center" }}>
          <span className="eyebrow">Due Now</span>
          <p className="h-page" style={{ color: "var(--amber)", margin: "8px 0" }}>{totalDue}</p>
          <span className="tiny muted">Checks due this week</span>
        </div>
        <div className="card card-pad" style={{ textAlign: "center" }}>
          <span className="eyebrow">Never Recorded</span>
          <p className="h-page" style={{ color: "var(--bad)", margin: "8px 0" }}>{totalNever}</p>
          <span className="tiny muted">Missing baseline checks</span>
        </div>
        <div className="card card-pad" style={{ textAlign: "center" }}>
          <span className="eyebrow">Open Actions</span>
          <p className="h-page" style={{ margin: "8px 0" }}>{totalOpenActions}</p>
          <span className="tiny muted">Pending remedial work</span>
        </div>
      </div>

      <h2 className="h-sec" style={{ marginBottom: 16 }}>Site Status</h2>
      <div className="stack-lg" style={{ gap: 12 }}>
        {sites.length === 0 ? (
          <div className="card card-pad empty">
            No sites added yet. Add your first site to start tracking.
          </div>
        ) : (
          siteSummaries.map(({ site, summary }) => (
            <Link
              key={site.id}
              href={`/sites/${site.id}`}
              className="card card-pad row-between"
              style={{
                textDecoration: "none",
                color: "inherit",
                borderLeft: `4px solid var(--${summary.health})`
              }}
            >
              <div>
                <p style={{ fontWeight: 600 }}>{site.name}</p>
                <p className="tiny muted">{site.address}</p>
              </div>
              <div className="row" style={{ gap: 16, alignItems: "center" }}>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span className={`pill pill-sm pill-${summary.health}`}>
                    {summary.health === "green" ? "Healthy" : summary.health === "amber" ? "Warning" : "Critical"}
                  </span>
                  <span className="tiny muted">{summary.overdue} overdue</span>
                </div>
                <span className="muted">→</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
