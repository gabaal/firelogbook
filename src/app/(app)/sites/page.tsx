import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirm } from "@/lib/auth";
import { countSites, listSites } from "@/lib/data";
import { summaryFor } from "@/lib/due";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  // Readable whether or not the subscription is live; writing is gated elsewhere.
  const { firm } = await requireFirm();
  if (await countSites(firm.id) === 0) redirect("/onboarding");

  const sites = (await listSites(firm.id)).map((site) => ({
    site,
    summary: summaryFor(site.id),
  }));

  const totals = sites.reduce(
    (acc, { summary }) => ({
      overdue: acc.overdue + summary.overdue + summary.never,
      due: acc.due + summary.due,
      actions: acc.actions + summary.openActions,
    }),
    { overdue: 0, due: 0, actions: 0 },
  );

  return (
    <div className="shell section">
      <div className="row-between" style={{ marginBottom: 22 }}>
        <div>
          <p className="eyebrow">{firm.name}</p>
          <h1 className="h-page" style={{ marginTop: 4 }}>
            Sites
          </h1>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <Stat label="Overdue" value={totals.overdue} tone={totals.overdue ? "bad" : "ok"} />
        <Stat label="Due this week" value={totals.due} tone={totals.due ? "warn" : "ok"} />
        <Stat label="Open actions" value={totals.actions} tone={totals.actions ? "warn" : "ok"} />
      </div>

      <div className="stack">
        {sites.map(({ site, summary }) => {
          const total = 13;
          return (
            <Link
              key={site.id}
              href={`/sites/${site.id}`}
              className="card card-hover site-card"
            >
              <div className="site-card-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 9 }}>
                    <span className={`dot dot-${dotFor(summary.health)}`} />
                    <h3>{site.name}</h3>
                  </div>
                  <p className="addr">
                    {site.address} · {site.postcode}
                  </p>
                </div>
                <span className={`pill pill-${pillFor(summary.health)}`}>
                  {summary.headline}
                </span>
              </div>

              <div className="meter" aria-hidden="true">
                {Array.from({ length: total }).map((_, i) => {
                  if (i < summary.overdue + summary.never)
                    return <span key={i} className="m-bad" />;
                  if (i < summary.overdue + summary.never + summary.due)
                    return <span key={i} className="m-due" />;
                  return <span key={i} className="m-ok" />;
                })}
              </div>

              <div className="state-line">
                <span className="small muted">
                  Responsible person · {site.responsible_person}
                </span>
                <span className="small" style={{ fontWeight: 600 }}>
                  Open logbook →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="small muted" style={{ marginTop: 26 }}>
        Sample data for three sites. Every check, photo and action in this build
        is stored locally in SQLite.
      </p>
    </div>
  );
}

function dotFor(health: string) {
  return health === "red" ? "bad" : health === "amber" ? "warn" : "ok";
}

function pillFor(health: string) {
  return health === "red" ? "bad" : health === "amber" ? "warn" : "ok";
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "bad";
}) {
  return (
    <div className="card card-pad">
      <p className="eyebrow">{label}</p>
      <p
        className="serif"
        style={{
          fontSize: 30,
          letterSpacing: "-0.03em",
          marginTop: 2,
          color:
            value === 0
              ? "var(--ok)"
              : tone === "bad"
                ? "var(--bad)"
                : "var(--warn)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
