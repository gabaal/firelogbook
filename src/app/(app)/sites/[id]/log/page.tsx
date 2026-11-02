import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveFirm } from "@/lib/auth";
import { checksForSite, getSite } from "@/lib/data";
import { FREQUENCIES, ITEMS_BY_KEY } from "@/lib/checklist";
import { fmtDate, fmtTime } from "@/lib/format";
import { photoUrl } from "@/lib/photo";
import { ArrowLeft } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function LogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { id } = await params;
  const { key } = await searchParams;
  const { firm } = await requireActiveFirm();
  const site = await getSite(firm.id, id);
  if (!site) notFound();

  const all = await checksForSite(site.id);
  const checks = key ? all.filter((c) => c.item_key === key) : all;

  const groups = new Map<string, typeof checks>();
  for (const c of checks) {
    const day = fmtDate(c.performed_at);
    const list = groups.get(day) ?? [];
    list.push(c);
    groups.set(day, list);
  }

  return (
    <div className="shell section">
      <Link href={`/sites/${site.id}`} className="row small muted" style={{ gap: 5 }}>
        <ArrowLeft size={15} /> {site.name}
      </Link>

      <div className="row-between" style={{ margin: "14px 0 18px" }}>
        <div>
          <h1 className="h-page">Full history</h1>
          <p className="small muted" style={{ marginTop: 4 }}>
            {checks.length} record{checks.length === 1 ? "" : "s"}
            {key ? ` for ${ITEMS_BY_KEY[key]?.title ?? key}` : ""} · {site.name}
          </p>
        </div>
        {key && (
          <Link href={`/sites/${site.id}/log`} className="btn btn-sm">
            Show everything
          </Link>
        )}
      </div>

      {key && (
        <p className="small muted" style={{ marginBottom: 14 }}>
          Filtered to one check.{" "}
          <Link href={`/sites/${site.id}/log`} style={{ textDecoration: "underline" }}>
            Clear
          </Link>
        </p>
      )}

      <div className="stack-lg">
        {[...groups.entries()].slice(0, 60).map(([day, rows]) => (
          <section key={day}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              {day}
            </p>
            <div className="card table-wrap">
              <table className="rows">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Time</th>
                    <th>Check</th>
                    <th>Result</th>
                    <th>By</th>
                    <th>Note</th>
                    <th style={{ width: 60 }}>Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{fmtTime(c.performed_at)}</td>
                      <td>
                        {ITEMS_BY_KEY[c.item_key]?.title ?? c.item_key}
                        <div className="tiny muted">
                          {FREQUENCIES[ITEMS_BY_KEY[c.item_key]?.frequency ?? "monthly"].label}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`pill pill-${
                            c.result === "pass" ? "ok" : c.result === "fail" ? "bad" : "neutral"
                          }`}
                        >
                          {c.result === "pass" ? "Pass" : c.result === "fail" ? "Fail" : "N/A"}
                        </span>
                      </td>
                      <td className="muted">{c.performed_by}</td>
                      <td style={{ maxWidth: 320 }}>
                        {c.note ? (
                          <span className="small">{c.note}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {c.photo ? (
                          <a href={photoUrl(c.photo)} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl(c.photo)}
                              alt="Evidence"
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "1px solid var(--line)",
                              }}
                            />
                          </a>
                        ) : (
                          <span className="muted tiny">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {groups.size > 60 && (
        <p className="small muted" style={{ marginTop: 20 }}>
          Showing the most recent 60 days. Use the audit pack for a full export.
        </p>
      )}
    </div>
  );
}
