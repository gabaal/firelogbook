import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveFirm } from "@/lib/auth";
import { actionsForSite, checksForSite, getSite } from "@/lib/data";
import { itemStatuses, sortByUrgency, summarise, type ItemStatus } from "@/lib/due";
import { FREQUENCIES, ITEMS_BY_KEY } from "@/lib/checklist";
import { fmtDate, fmtTime, relDays } from "@/lib/format";
import { Alert, ArrowLeft, ArrowRight, Check, Clock, Doc, Shield } from "@/components/icons";
import ActionCard from "@/components/ActionCard";
import SiteDetailsEditor from "@/components/SiteDetailsEditor";

export const dynamic = "force-dynamic";


export default async function SitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { firm } = await requireActiveFirm();
  const site = await getSite(firm.id, id);
  if (!site) notFound();

  const statuses = await itemStatuses(site.id);
  const summary = await summarise(site.id, statuses);
  const sorted = sortByUrgency(statuses);
  const needsAttention = sorted.filter((s) => s.state !== "ok");
  const upcoming = sorted
    .filter((s) => s.state === "ok" && s.daysUntilDue <= 7)
    .slice(0, 4);

  const actions = await actionsForSite(site.id);
  const openActions = actions.filter((a) => a.status === "open");
  const closedActions = actions.filter((a) => a.status === "closed");
  const recent = await checksForSite(site.id, 8);
  const totalChecks = (await checksForSite(site.id)).length;

  return (
    <div className="shell section">
      <Link href="/sites" className="row small muted" style={{ marginBottom: 14, gap: 5 }}>
        <ArrowLeft size={15} /> All sites
      </Link>

      <div className="row-between" style={{ marginBottom: 16, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="h-page">{site.name}</h1>
          <p className="muted" style={{ marginTop: 5 }}>
            {site.address} · {site.postcode}
          </p>
          <p className="small muted" style={{ marginTop: 2 }}>
            Responsible person · {site.responsible_person}
            {site.responsible_email ? ` · reminders to ${site.responsible_email}` : ""}
            {site.remind_opt_out ? " · reminders off" : ""}
            {" "}
            <SiteDetailsEditor
              siteId={site.id}
              responsiblePerson={site.responsible_person}
              responsibleEmail={site.responsible_email ?? ""}
              workingDays={site.working_days}
            />
          </p>
        </div>
          <div className="row" style={{ gap: 8 }}>
            <Link href={`/sites/${site.id}/checklist`} className="btn btn-sm">
              Manage checklist
            </Link>
            <Link href={`/sites/${site.id}/audit`} className="btn btn-primary">
              <Doc size={16} /> Audit pack
            </Link>
          </div>
      </div>

      <div className={`health ${summary.health}`} style={{ marginBottom: 22 }}>
        <span className="health-icon">
          {summary.health === "green" ? <Check size={19} /> : <Alert size={19} />}
        </span>
        <div style={{ flex: 1 }}>
          <h2>{summary.headline}</h2>
          <p className="small" style={{ color: "var(--ink-2)", marginTop: 2 }}>
            {summary.ok} of 13 checks up to date · {totalChecks} records on file
            {openActions.length > 0
              ? ` · ${openActions.length} open action${openActions.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <Link href={`/sites/${site.id}/log`} className="btn btn-sm no-print">
          Full history
        </Link>
      </div>

      <div className="with-aside">
        <div className="stack-lg">
          <section>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <h2 className="h-sec">Due now</h2>
              <span className="small muted">{needsAttention.length} items</span>
            </div>

            {needsAttention.length === 0 ? (
              <div className="card">
                <div className="empty">
                  <Check size={22} style={{ color: "var(--ok)", margin: "0 auto 6px" }} />
                  Everything in this logbook is up to date.
                </div>
              </div>
            ) : (
              <div className="card">
                {needsAttention.map((s) => (
                  <DueRow key={s.item.key} siteId={site.id} status={s} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="h-sec" style={{ marginBottom: 10 }}>
              Open actions
            </h2>
            {openActions.length === 0 && closedActions.length === 0 ? (
              <div className="card">
                <div className="empty">
                  Nothing raised. A failed check creates an action automatically.
                </div>
              </div>
            ) : (
              <div className="card">
                {openActions.map((a) => (
                  <ActionCard key={a.id} action={{ ...a }} />
                ))}
                {openActions.length === 0 && (
                  <div className="empty">No open actions.</div>
                )}
              </div>
            )}
          </section>

          <section>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <h2 className="h-sec">Recent activity</h2>
              <Link href={`/sites/${site.id}/log`} className="small">
                View all →
              </Link>
            </div>
            <div className="card table-wrap">
              <table className="rows">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Check</th>
                    <th>Result</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => {
                    const item = statusLabel(c.item_key);
                    return (
                      <tr key={c.id}>
                        <td className="mono" style={{ whiteSpace: "nowrap" }}>
                          {fmtDate(c.performed_at)}
                        </td>
                        <td>
                          {item.title}
                          {c.photo && (
                            <span className="pill pill-neutral" style={{ marginLeft: 8 }}>
                              photo
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`pill pill-${resultPill(c.result)}`}>
                            {c.result === "pass" ? "Pass" : c.result === "fail" ? "Fail" : "N/A"}
                          </span>
                        </td>
                        <td className="muted">{c.performed_by}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {closedActions.length > 0 && (
            <section>
              <h2 className="h-sec" style={{ marginBottom: 10 }}>
                Closed actions
              </h2>
              <div className="card">
                {closedActions.map((a) => (
                  <div className="action-row" key={a.id}>
                    <Check size={16} style={{ color: "var(--ok)", marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <p className="action-title">{a.title}</p>
                      {a.closed_note && <p className="action-detail">{a.closed_note}</p>}
                      <p className="tiny muted" style={{ marginTop: 4 }}>
                        Closed {a.closed_at ? fmtDate(a.closed_at) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="stack-lg aside-sticky no-print">
          <div className="card card-pad">
            <p className="eyebrow">This logbook</p>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              {(["daily", "weekly", "monthly", "quarterly", "annual"] as const).map(
                (freq) => {
                  const items = statuses.filter((s) => s.item.frequency === freq);
                  const bad = items.filter(
                    (s) => s.state === "overdue" || s.state === "never",
                  ).length;
                  return (
                    <div
                      key={freq}
                      className="row-between"
                      style={{ padding: "5px 0", borderBottom: "1px solid var(--line)" }}
                    >
                      <span className="small">
                        {FREQUENCIES[freq].label} checks
                      </span>
                      <span
                        className="small mono"
                        style={{
                          color: bad ? "var(--bad)" : "var(--ink-3)",
                          fontWeight: 600,
                        }}
                      >
                        {items.length - bad}/{items.length}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
            <Link
              href={`/sites/${site.id}/audit`}
              className="btn btn-primary btn-block"
              style={{ marginTop: 14 }}
            >
              <Doc size={16} /> Generate audit pack
            </Link>
            <p className="tiny muted" style={{ marginTop: 8, textAlign: "center" }}>
              Dated PDF, last 12 months
            </p>
          </div>

          <div className="card card-pad">
            <div className="row" style={{ gap: 8 }}>
              <Shield size={16} style={{ color: "var(--ink-3)" }} />
              <p className="eyebrow" style={{ color: "var(--ink-2)" }}>
                Upcoming
              </p>
            </div>
            {upcoming.length === 0 ? (
              <p className="small muted" style={{ marginTop: 8 }}>
                Nothing else falls due in the next 7 days.
              </p>
            ) : (
              <div className="stack-sm" style={{ marginTop: 10 }}>
                {upcoming.map((s) => (
                  <div key={s.item.key} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                    <Clock size={14} style={{ color: "var(--ink-3)", marginTop: 3 }} />
                    <div>
                      <p className="small">{s.item.title}</p>
                      <p className="tiny muted">{relDays(s.daysUntilDue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DueRow({ siteId, status }: { siteId: string; status: ItemStatus }) {
  const { item, state, last, overdueDays, daysUntilDue } = status;
  const late = state === "overdue" || state === "never";

  return (
    <div className="item-row">
      <div className="item-main">
        <p className="item-title">{item.title}</p>
        <div className="item-meta">
          <span className="freq-tag">{FREQUENCIES[item.frequency].short}</span>
          <span className="sep" />
          {state === "never" ? (
            <span className="overdue-text">Never recorded</span>
          ) : state === "overdue" ? (
            <span className="overdue-text">
              {overdueDays} day{overdueDays === 1 ? "" : "s"} overdue
            </span>
          ) : (
            <span className={state === "due" ? "due-text" : ""}>
              {state === "due" ? "Due now" : relDays(daysUntilDue)}
            </span>
          )}
          {last && (
            <>
              <span className="sep" />
              <span>
                last done {fmtDate(last.performed_at)} at {fmtTime(last.performed_at)}
              </span>
            </>
          )}
        </div>
      </div>
      <Link
        href={`/sites/${siteId}/check/${item.key}`}
        className={`btn btn-sm ${late ? "btn-ember" : ""}`}
      >
        Record <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function resultPill(result: string) {
  return result === "pass" ? "ok" : result === "fail" ? "bad" : "neutral";
}

// Local helper: item metadata lookup.
function statusLabel(key: string) {
  return ITEMS_BY_KEY[key] ?? { title: key, frequency: "monthly" as const };
}
