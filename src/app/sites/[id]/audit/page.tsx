import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveFirm, signShareToken, verifyShareToken } from "@/lib/auth";
import { checksBetween, checksForSite, getSite, getSiteById, actionsForSite } from "@/lib/data";
import { CHECKLIST, DISCLAIMER, FREQUENCIES } from "@/lib/checklist";
import {
  endOfDayIso,
  fmtDate,
  fmtLongDate,
  fmtTime,
  inputDate,
  startOfDayIso,
} from "@/lib/format";
import { ArrowLeft, Download } from "@/components/icons";
import PrintTrigger from "@/components/PrintTrigger";
import SharePack from "@/components/SharePack";
import PdfDownloadButton from "@/components/PdfDownloadButton";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

function monthKey(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Europe/London",
  }).format(date);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function parseDay(value: string | undefined, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    print?: string;
    new?: string;
    k?: string;
  }>;
}) {
  const { id } = await params;
  const { from: fromParam, to: toParam, print, new: isNew, k } = await searchParams;

  // Two ways in: a signed-in owner, or a share link handed to an inspector.
  const shared = Boolean(k && verifyShareToken(k, id));
  let site = null;

  if (shared) {
    site = await getSiteById(id);
  } else {
    const { firm } = await requireActiveFirm();
    site = await getSite(firm.id, id);
  }
  if (!site) notFound();

  const shareToken = shared ? (k as string) : signShareToken(site.id);

  const to = parseDay(toParam, new Date());
  const siteCreated = new Date(site.created_at);
  const oneYearAgo = new Date(Date.now() - 365 * DAY);
  const earliestPossibleFrom = siteCreated < oneYearAgo ? oneYearAgo : siteCreated;
  const from = parseDay(fromParam, earliestPossibleFrom);

  // Cap the period at 365 days, but only if the user didn't explicitly provide a custom range
  if (!fromParam && !toParam) {
    const minFrom = new Date(to.getTime() - 365 * DAY);
    if (from < minFrom) from.setTime(minFrom.getTime());
  }

  if (from > to) from.setTime(to.getTime() - 365 * DAY);

  const fromIso = startOfDayIso(from);
  const toIso = endOfDayIso(to);
  const checks = await checksBetween(site.id, fromIso, toIso);
  const everRecorded = (await checksForSite(site.id, 1)).length > 0;
  const actions = (await actionsForSite(site.id)).filter(
    (a) => new Date(a.created_at) <= to || a.status === "open",
  );

  const periodDays = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / DAY) + 1,
  );

  const summaryRows = CHECKLIST.map((item) => {
    const recs = checks.filter((c) => c.item_key === item.key);
    const expected = Math.max(
      1,
      Math.round(periodDays / FREQUENCIES[item.frequency].days),
    );
    return {
      item,
      expected,
      recorded: recs.length,
      missed: Math.max(0, expected - recs.length),
      failures: recs.filter((r) => r.result === "fail").length,
      last: recs[recs.length - 1] ?? null,
    };
  });

  const dailyItems = CHECKLIST.filter((i) => i.frequency === "daily");
  const monthKeys = [...new Set(checks.map((c) => monthKey(c.performed_at)))].sort();

  const scheduledChecks = checks
    .filter((c) => c.item_key !== "exit-doors" && c.item_key !== "alarm-panel")
    .reverse();

  const failures = checks.filter((c) => c.result === "fail");
  const photos = [...failures, ...checks]
    .filter((c) => c.photo)
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .slice(0, 12);

  const failedOrNa = checks.filter((c) => c.result !== "pass").length;
  const pdfHref = `/api/audit/${site.id}/pdf?from=${inputDate(from)}&to=${inputDate(to)}${
    shared ? `&k=${encodeURIComponent(k as string)}` : ""
  }`;

  return (
    <div className="shell" style={{ paddingTop: 18, paddingBottom: 40 }}>
      <div className="no-print row-between" style={{ marginBottom: 16 }}>
        {shared ? (
          <span className="row small muted" style={{ gap: 6 }}>
            <Download size={14} /> Shared logbook · {site.name}
          </span>
        ) : (
          <Link href={`/sites/${site.id}`} className="row small muted" style={{ gap: 5 }}>
            <ArrowLeft size={15} /> {site.name}
          </Link>
        )}
        <form className="row" method="get" style={{ gap: 8 }}>
          {shared && <input type="hidden" name="k" value={k} />}
          <label className="tiny muted" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            className="input"
            style={{ width: 158, padding: "8px 10px" }}
            defaultValue={inputDate(from)}
          />
          <label className="tiny muted" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            className="input"
            style={{ width: 158, padding: "8px 10px" }}
            defaultValue={inputDate(to)}
          />
          <button className="btn btn-sm" type="submit">
            Update
          </button>
        </form>
        {!shared && <SharePack path={`/sites/${site.id}/audit?k=${shareToken}`} />}
        <PdfDownloadButton
          pdfHref={pdfHref}
          siteName={site.name}
        />
      </div>

      {isNew === "1" && !shared && (
        <div className="note-box no-print" style={{ marginBottom: 16 }}>
          <strong>This is your first audit pack.</strong> It is dated and already
          looks like the document an inspector asks for — now it needs checks
          recording against it.{" "}
          <Link href={`/sites/${site.id}`} style={{ textDecoration: "underline" }}>
            Open the logbook
          </Link>
          .
        </div>
      )}

      <article className="audit">
        {print === "1" && (
          <div className="no-print">
            <PrintTrigger />
          </div>
        )}
        <header className="audit-head">
          <div>
            <p className="eyebrow" style={{ color: "var(--ink-3)" }}>
              Fire safety logbook
            </p>
            <h1 style={{ marginTop: 6 }}>{site.name}</h1>
            <p style={{ color: "var(--ink-2)", marginTop: 4 }}>
              {site.address} · {site.postcode}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-3)" }}>
            <p style={{ fontWeight: 650, color: "var(--ink)" }}>Audit pack</p>
            <p>
              {fmtDate(from)} — {fmtDate(to)}
            </p>
            <p>Generated {fmtDate(new Date())}</p>
          </div>
        </header>

        <dl className="audit-grid">
          <div>
            <dt>Responsible person</dt>
            <dd>{site.responsible_person}</dd>
          </div>
          <div>
            <dt>Record period</dt>
            <dd>
              {everRecorded
                ? `${fmtLongDate(from)} to ${fmtLongDate(to)}`
                : `Since ${fmtLongDate(site.created_at)}`}
            </dd>
          </div>
          <div>
            <dt>Checks recorded</dt>
            <dd>{checks.length}</dd>
          </div>
          <div>
            <dt>Failed or not applicable</dt>
            <dd>{failedOrNa}</dd>
          </div>
        </dl>

        {!everRecorded ? (
          <div style={{ margin: "26px 0 8px" }}>
            <h2 style={{ marginTop: 0 }}>1. Summary of scheduled checks</h2>
            <p style={{ color: "var(--ink-2)", marginTop: 10, maxWidth: "62ch" }}>
              This logbook was opened on {fmtLongDate(site.created_at)}. No checks
              have been recorded yet, so nothing is overdue. As soon as the first
              check is recorded, this section fills in with what was expected,
              what was recorded and what was missed for each of the thirteen
              checks.
            </p>
            <p style={{ color: "var(--ink-3)", marginTop: 10, maxWidth: "62ch", fontSize: 13 }}>
              An inspector will want the record for the period since the last
              assessment. A logbook that starts empty and fills in is the normal
              starting position, not a gap.
            </p>
          </div>
        ) : (
          <>
        <h2>1. Summary of scheduled checks</h2>
        <div className="table-wrap">
          <table className="rows">
            <thead>
              <tr>
                <th>Check</th>
                <th>Frequency</th>
                <th>Expected</th>
                <th>Recorded</th>
                <th>Missed</th>
                <th>Failures</th>
                <th>Last recorded</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.item.key}>
                  <td style={{ fontWeight: 550 }}>{row.item.title}</td>
                  <td>{FREQUENCIES[row.item.frequency].label}</td>
                  <td className="mono">{row.expected}</td>
                  <td className="mono">{row.recorded}</td>
                  <td
                    className="mono"
                    style={{ color: row.missed > 0 ? "var(--bad)" : "var(--ink)" }}
                  >
                    {row.missed}
                  </td>
                  <td
                    className="mono"
                    style={{ color: row.failures > 0 ? "var(--bad)" : "var(--ink)" }}
                  >
                    {row.failures}
                  </td>
                  <td>
                    {row.last ? fmtDate(row.last.performed_at) : "— none —"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dailyItems.length > 0 && monthKeys.length > 0 && (
          <>
            <h2>2. Daily checks by month</h2>
            <div className="table-wrap">
              <table className="rows">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Check</th>
                    <th>Days recorded</th>
                    <th>Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {monthKeys.map((mk) =>
                    dailyItems.map((item) => {
                      const recs = checks.filter(
                        (c) => c.item_key === item.key && monthKey(c.performed_at) === mk,
                      );
                      const days = new Set(recs.map((r) => fmtDate(r.performed_at))).size;
                      return (
                        <tr key={`${mk}-${item.key}`}>
                          <td>{monthLabel(mk)}</td>
                          <td>{item.title}</td>
                          <td className="mono">{days}</td>
                          <td className="mono">{recs.filter((r) => r.result === "fail").length}</td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2>3. Record of scheduled checks</h2>
        <div className="table-wrap">
          <table className="rows">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Date</th>
                <th>Check</th>
                <th>Result</th>
                <th>Recorded by</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {scheduledChecks.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ whiteSpace: "nowrap" }}>
                    {fmtDate(c.performed_at)}
                    <span className="muted"> {fmtTime(c.performed_at)}</span>
                  </td>
                  <td>{CHECKLIST.find((i) => i.key === c.item_key)?.title ?? c.item_key}</td>
                  <td>
                    {c.result === "pass" ? "Pass" : c.result === "fail" ? "Fail" : "N/A"}
                  </td>
                  <td>{c.performed_by}</td>
                  <td style={{ maxWidth: 300 }}>{c.note ?? ""}</td>
                </tr>
              ))}
              {scheduledChecks.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--ink-3)" }}>
                    No scheduled checks recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2>4. Failures and remedial actions</h2>
        <div className="table-wrap">
          <table className="rows">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Raised</th>
                <th>Action</th>
                <th style={{ width: 90 }}>Due</th>
                <th style={{ width: 90 }}>Status</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{fmtDate(a.created_at)}</td>
                  <td>
                    <strong>{a.title}</strong>
                    {a.detail && (
                      <div style={{ color: "var(--ink-2)", marginTop: 2 }}>{a.detail}</div>
                    )}
                  </td>
                  <td className="mono">{a.due_date ? fmtDate(a.due_date) : "—"}</td>
                  <td>{a.status === "open" ? "Open" : "Closed"}</td>
                  <td>{a.closed_note ?? ""}</td>
                </tr>
              ))}
              {actions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--ink-3)" }}>
                    No remedial actions raised in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {photos.length > 0 && (
          <>
            <h2>5. Photo evidence</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {photos.map((c) => (
                <figure key={c.id} style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/uploads/${c.photo}`}
                    alt={`Evidence for ${c.item_key}`}
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      objectFit: "cover",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                    }}
                  />
                  <figcaption style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 3 }}>
                    {fmtDate(c.performed_at)} ·{" "}
                    {CHECKLIST.find((i) => i.key === c.item_key)?.title ?? c.item_key}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}

          </>
        )}

        <div className="sign-block">
          <div>
            <div className="sign-line" />
            <p className="tiny muted" style={{ marginTop: 4 }}>
              Signed — responsible person
            </p>
          </div>
          <div>
            <div className="sign-line" />
            <p className="tiny muted" style={{ marginTop: 4 }}>
              Date
            </p>
          </div>
        </div>

        <p className="tiny" style={{ marginTop: 26, color: "var(--ink-3)" }}>
          {DISCLAIMER}
        </p>
      </article>
    </div>
  );
}
setTime(to.getTime() - 365 * DAY);

  const fromIso = startOfDayIso(from);
  const toIso = endOfDayIso(to);
  const checks = checksBetween(site.id, fromIso, toIso);
  const everRecorded = checksForSite(site.id, 1).length > 0;
  const actions = actionsForSite(site.id).filter(
    (a) => new Date(a.created_at) <= to || a.status === "open",
  );

  const periodDays = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / DAY) + 1,
  );

  const summaryRows = CHECKLIST.map((item) => {
    const recs = checks.filter((c) => c.item_key === item.key);
    const expected = Math.max(
      1,
      Math.round(periodDays / FREQUENCIES[item.frequency].days),
    );
    return {
      item,
      expected,
      recorded: recs.length,
      missed: Math.max(0, expected - recs.length),
      failures: recs.filter((r) => r.result === "fail").length,
      last: recs[recs.length - 1] ?? null,
    };
  });

  const dailyItems = CHECKLIST.filter((i) => i.frequency === "daily");
  const monthKeys = [...new Set(checks.map((c) => monthKey(c.performed_at)))].sort();

  const scheduledChecks = checks
    .filter((c) => c.item_key !== "exit-doors" && c.item_key !== "alarm-panel")
    .reverse();

  const failures = checks.filter((c) => c.result === "fail");
  const photos = [...failures, ...checks]
    .filter((c) => c.photo)
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .slice(0, 12);

  const failedOrNa = checks.filter((c) => c.result !== "pass").length;
  const pdfHref = `/api/audit/${site.id}/pdf?from=${inputDate(from)}&to=${inputDate(to)}${
    shared ? `&k=${encodeURIComponent(k as string)}` : ""
  }`;

  return (
    <div className="shell" style={{ paddingTop: 18, paddingBottom: 40 }}>
      <div className="no-print row-between" style={{ marginBottom: 16 }}>
        {shared ? (
          <span className="row small muted" style={{ gap: 6 }}>
            <Download size={14} /> Shared logbook · {site.name}
          </span>
        ) : (
          <Link href={`/sites/${site.id}`} className="row small muted" style={{ gap: 5 }}>
            <ArrowLeft size={15} /> {site.name}
          </Link>
        )}
        <form className="row" method="get" style={{ gap: 8 }}>
          {shared && <input type="hidden" name="k" value={k} />}
          <label className="tiny muted" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            className="input"
            style={{ width: 158, padding: "8px 10px" }}
            defaultValue={inputDate(from)}
          />
          <label className="tiny muted" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            className="input"
            style={{ width: 158, padding: "8px 10px" }}
            defaultValue={inputDate(to)}
          />
          <button className="btn btn-sm" type="submit">
            Update
          </button>
        </form>
        {!shared && <SharePack path={`/sites/${site.id}/audit?k=${shareToken}`} />}
        <PdfDownloadButton
          pdfHref={pdfHref}
          siteName={site.name}
        />
      </div>

      {isNew === "1" && !shared && (
        <div className="note-box no-print" style={{ marginBottom: 16 }}>
          <strong>This is your first audit pack.</strong> It is dated and already
          looks like the document an inspector asks for — now it needs checks
          recording against it.{" "}
          <Link href={`/sites/${site.id}`} style={{ textDecoration: "underline" }}>
            Open the logbook
          </Link>
          .
        </div>
      )}

      <article className="audit">
        {print === "1" && (
          <div className="no-print">
            <PrintTrigger />
          </div>
        )}
        <header className="audit-head">
          <div>
            <p className="eyebrow" style={{ color: "var(--ink-3)" }}>
              Fire safety logbook
            </p>
            <h1 style={{ marginTop: 6 }}>{site.name}</h1>
            <p style={{ color: "var(--ink-2)", marginTop: 4 }}>
              {site.address} · {site.postcode}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-3)" }}>
            <p style={{ fontWeight: 650, color: "var(--ink)" }}>Audit pack</p>
            <p>
              {fmtDate(from)} — {fmtDate(to)}
            </p>
            <p>Generated {fmtDate(new Date())}</p>
          </div>
        </header>

        <dl className="audit-grid">
          <div>
            <dt>Responsible person</dt>
            <dd>{site.responsible_person}</dd>
          </div>
          <div>
            <dt>Record period</dt>
            <dd>
              {everRecorded
                ? `${fmtLongDate(from)} to ${fmtLongDate(to)}`
                : `Since ${fmtLongDate(site.created_at)}`}
            </dd>
          </div>
          <div>
            <dt>Checks recorded</dt>
            <dd>{checks.length}</dd>
          </div>
          <div>
            <dt>Failed or not applicable</dt>
            <dd>{failedOrNa}</dd>
          </div>
        </dl>

        {!everRecorded ? (
          <div style={{ margin: "26px 0 8px" }}>
            <h2 style={{ marginTop: 0 }}>1. Summary of scheduled checks</h2>
            <p style={{ color: "var(--ink-2)", marginTop: 10, maxWidth: "62ch" }}>
              This logbook was opened on {fmtLongDate(site.created_at)}. No checks
              have been recorded yet, so nothing is overdue. As soon as the first
              check is recorded, this section fills in with what was expected,
              what was recorded and what was missed for each of the thirteen
              checks.
            </p>
            <p style={{ color: "var(--ink-3)", marginTop: 10, maxWidth: "62ch", fontSize: 13 }}>
              An inspector will want the record for the period since the last
              assessment. A logbook that starts empty and fills in is the normal
              starting position, not a gap.
            </p>
          </div>
        ) : (
          <>
        <h2>1. Summary of scheduled checks</h2>
        <div className="table-wrap">
          <table className="rows">
            <thead>
              <tr>
                <th>Check</th>
                <th>Frequency</th>
                <th>Expected</th>
                <th>Recorded</th>
                <th>Missed</th>
                <th>Failures</th>
                <th>Last recorded</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.item.key}>
                  <td style={{ fontWeight: 550 }}>{row.item.title}</td>
                  <td>{FREQUENCIES[row.item.frequency].label}</td>
                  <td className="mono">{row.expected}</td>
                  <td className="mono">{row.recorded}</td>
                  <td
                    className="mono"
                    style={{ color: row.missed > 0 ? "var(--bad)" : "var(--ink)" }}
                  >
                    {row.missed}
                  </td>
                  <td
                    className="mono"
                    style={{ color: row.failures > 0 ? "var(--bad)" : "var(--ink)" }}
                  >
                    {row.failures}
                  </td>
                  <td>
                    {row.last ? fmtDate(row.last.performed_at) : "— none —"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dailyItems.length > 0 && monthKeys.length > 0 && (
          <>
            <h2>2. Daily checks by month</h2>
            <div className="table-wrap">
              <table className="rows">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Check</th>
                    <th>Days recorded</th>
                    <th>Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {monthKeys.map((mk) =>
                    dailyItems.map((item) => {
                      const recs = checks.filter(
                        (c) => c.item_key === item.key && monthKey(c.performed_at) === mk,
                      );
                      const days = new Set(recs.map((r) => fmtDate(r.performed_at))).size;
                      return (
                        <tr key={`${mk}-${item.key}`}>
                          <td>{monthLabel(mk)}</td>
                          <td>{item.title}</td>
                          <td className="mono">{days}</td>
                          <td className="mono">{recs.filter((r) => r.result === "fail").length}</td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2>3. Record of scheduled checks</h2>
        <div className="table-wrap">
          <table className="rows">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Date</th>
                <th>Check</th>
                <th>Result</th>
                <th>Recorded by</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {scheduledChecks.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ whiteSpace: "nowrap" }}>
                    {fmtDate(c.performed_at)}
                    <span className="muted"> {fmtTime(c.performed_at)}</span>
                  </td>
                  <td>{CHECKLIST.find((i) => i.key === c.item_key)?.title ?? c.item_key}</td>
                  <td>
                    {c.result === "pass" ? "Pass" : c.result === "fail" ? "Fail" : "N/A"}
                  </td>
                  <td>{c.performed_by}</td>
                  <td style={{ maxWidth: 300 }}>{c.note ?? ""}</td>
                </tr>
              ))}
              {scheduledChecks.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--ink-3)" }}>
                    No scheduled checks recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2>4. Failures and remedial actions</h2>
        <div className="table-wrap">
          <table className="rows">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Raised</th>
                <th>Action</th>
                <th style={{ width: 90 }}>Due</th>
                <th style={{ width: 90 }}>Status</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{fmtDate(a.created_at)}</td>
                  <td>
                    <strong>{a.title}</strong>
                    {a.detail && (
                      <div style={{ color: "var(--ink-2)", marginTop: 2 }}>{a.detail}</div>
                    )}
                  </td>
                  <td className="mono">{a.due_date ? fmtDate(a.due_date) : "—"}</td>
                  <td>{a.status === "open" ? "Open" : "Closed"}</td>
                  <td>{a.closed_note ?? ""}</td>
                </tr>
              ))}
              {actions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--ink-3)" }}>
                    No remedial actions raised in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {photos.length > 0 && (
          <>
            <h2>5. Photo evidence</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {photos.map((c) => (
                <figure key={c.id} style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/uploads/${c.photo}`}
                    alt={`Evidence for ${c.item_key}`}
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      objectFit: "cover",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                    }}
                  />
                  <figcaption style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 3 }}>
                    {fmtDate(c.performed_at)} ·{" "}
                    {CHECKLIST.find((i) => i.key === c.item_key)?.title ?? c.item_key}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}

          </>
        )}

        <div className="sign-block">
          <div>
            <div className="sign-line" />
            <p className="tiny muted" style={{ marginTop: 4 }}>
              Signed — responsible person
            </p>
          </div>
          <div>
            <div className="sign-line" />
            <p className="tiny muted" style={{ marginTop: 4 }}>
              Date
            </p>
          </div>
        </div>

        <p className="tiny" style={{ marginTop: 26, color: "var(--ink-3)" }}>
          {DISCLAIMER}
        </p>
      </article>
    </div>
  );
}
