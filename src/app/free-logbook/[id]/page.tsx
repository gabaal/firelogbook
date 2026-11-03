import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLead } from "@/lib/leads";
import { CHECKLIST, FREQUENCIES } from "@/lib/checklist";
import { fmtLongDate } from "@/lib/format";
import { ArrowLeft, Download } from "@/components/icons";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your fire safety log book",
  robots: { index: false, follow: false },
};

function short(text: string): string {
  const first = text.split(". ")[0];
  return first.endsWith(".") ? first : `${first}.`;
}

function Rows({ count, cells }: { count: number; cells: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, row) => (
        <tr key={row}>
          {Array.from({ length: cells }).map((__, cell) => (
            <td key={cell} />
          ))}
        </tr>
      ))}
    </>
  );
}

export default async function BlankLogbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const address = [lead.address, lead.postcode].filter(Boolean).join(", ");
  const started = fmtLongDate(new Date());

  return (
    <div className="shell" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="no-print row-between" style={{ marginBottom: 16 }}>
        <Link href="/free-logbook" className="row small muted" style={{ gap: 5 }}>
          <ArrowLeft size={15} /> Free log book
        </Link>
        <div className="row" style={{ gap: 8 }}>
          <PrintButton />
          <a className="btn btn-primary" href={`/api/free-logbook/${lead.id}/pdf`} download>
            <Download size={16} /> Download PDF
          </a>
        </div>
      </div>

      <article className="logbook">
        {/* ------------------------------ cover ------------------------------ */}
        <section className="lb-cover">
          <p className="eyebrow">Fire safety log book</p>
          <h1>{lead.site_name}</h1>
          <p style={{ color: "#444", marginTop: 4 }}>{address || "—"}</p>

          <hr className="lb-rule" />

          <dl className="lb-meta">
            <div>
              <dt>Premises</dt>
              <dd>{lead.site_name}</dd>
            </div>
            <div>
              <dt>Responsible person</dt>
              <dd>{lead.responsible_person || ""}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{address}</dd>
            </div>
            <div>
              <dt>Book started</dt>
              <dd>{started}</dd>
            </div>
            <div>
              <dt>Completed by</dt>
              <dd />
            </div>
            <div>
              <dt>Person signing off</dt>
              <dd />
            </div>
          </dl>

          <div className="lb-note">
            Keep this book where staff can find it, and take it with you if you
            move premises. An inspector, insurer or fire officer may ask to see
            it. Completed records should be kept for at least three years.
          </div>

          <p style={{ fontSize: 10.5, color: "#666", marginTop: 18 }}>
            This log book records the checks that were carried out. It is not a
            fire risk assessment, and keeping it does not by itself make the
            premises compliant. The responsible person remains responsible for
            fire safety.
          </p>
        </section>

        {/* --------------------------- how to use --------------------------- */}
        <section className="lb-page">
          <h2 className="lb-h2">How to use this book</h2>
          <ul className="lb-list">
            <li>Record every check as it is done. Do not fill in the week afterwards.</li>
            <li>Write the date, sign it, and note anything that was wrong.</li>
            <li>If something fails, note what you did about it — that matters more than the failure.</li>
            <li>Keep the contractor certificates with this book.</li>
            <li>Review the fire risk assessment at least once a year, or when the premises change.</li>
          </ul>

          <h2 className="lb-h2" style={{ marginTop: 18 }}>
            What to check, and how often
          </h2>
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: "34%" }}>Check</th>
                <th style={{ width: "13%" }}>How often</th>
                <th>What good looks like</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLIST.map((item) => (
                <tr key={item.key}>
                  <td style={{ color: "#111" }}>{item.title}</td>
                  <td>{FREQUENCIES[item.frequency].label}</td>
                  <td style={{ color: "#444" }}>{short(item.guidance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ----------------------------- daily ------------------------------ */}
        <section className="lb-page">
          <h2 className="lb-h2">Daily checks</h2>
          <p className="lb-sub">
            Once a day, before the premises opens. Initial each column.
          </p>
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: "18%" }}>Date</th>
                <th>Final exits open freely</th>
                <th>Alarm panel normal</th>
                <th style={{ width: "16%" }}>Signed</th>
                <th style={{ width: "22%" }}>Notes / faults</th>
              </tr>
            </thead>
            <tbody>
              <Rows count={31} cells={5} />
            </tbody>
          </table>
        </section>

        {/* ---------------------------- weekly ------------------------------ */}
        <section className="lb-page">
          <h2 className="lb-h2">Weekly checks</h2>
          <p className="lb-sub">
            Six months per page. Test a different call point each week and write
            down which one. Print a second copy for the other half of the year.
          </p>
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: "18%" }}>Date</th>
                <th style={{ width: "22%" }}>Call point tested</th>
                <th>Emergency lights lit</th>
                <th style={{ width: "16%" }}>Signed</th>
                <th style={{ width: "20%" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              <Rows count={26} cells={5} />
            </tbody>
          </table>
        </section>

        {/* ---------------------------- monthly ----------------------------- */}
        <section className="lb-page">
          <h2 className="lb-h2">Monthly checks</h2>
          <p className="lb-sub">One row per month. Note the result, not just a tick.</p>
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: "14%" }}>Month</th>
                <th>Extinguishers</th>
                <th>Fire doors</th>
                <th>Escape routes</th>
                <th>Lighting<br />1 hour</th>
                <th style={{ width: "14%" }}>Signed</th>
              </tr>
            </thead>
            <tbody>
              <Rows count={12} cells={6} />
            </tbody>
          </table>

          <h2 className="lb-h2" style={{ marginTop: 22 }}>
            Quarterly fire drills
          </h2>
          <p className="lb-sub">
            Vary the assumed location of the fire each time.
          </p>
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: "16%" }}>Date</th>
                <th style={{ width: "16%" }}>Time to evacuate</th>
                <th>Issues found and what changed</th>
                <th style={{ width: "16%" }}>Signed</th>
              </tr>
            </thead>
            <tbody>
              <Rows count={4} cells={4} />
            </tbody>
          </table>
        </section>

        {/* ----------------------------- annual ----------------------------- */}
        <section className="lb-page">
          <h2 className="lb-h2">Annual checks and servicing</h2>
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Check</th>
                <th style={{ width: "14%" }}>Date</th>
                <th>Contractor / certificate reference</th>
                <th style={{ width: "14%" }}>Signed</th>
              </tr>
            </thead>
            <tbody>
              {[
                "Fire risk assessment review",
                "Fire alarm system service",
                "Fire extinguisher service",
                "Staff fire safety training",
              ].map((label) => (
                <tr key={label} className="tall">
                  <td style={{ color: "#111" }}>{label}</td>
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="lb-h2" style={{ marginTop: 22 }}>
            Service record
          </h2>
          <p className="lb-sub">
            For any other visit: emergency lighting, fire doors, suppression.
          </p>
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: "14%" }}>Date</th>
                <th style={{ width: "26%" }}>Contractor</th>
                <th>Work carried out / certificate</th>
                <th style={{ width: "14%" }}>Signed</th>
              </tr>
            </thead>
            <tbody>
              <Rows count={8} cells={4} />
            </tbody>
          </table>

          <div className="lb-note lb-sign" style={{ marginTop: 24 }}>
            Free blank log book from FireLogbook. If you would rather the logbook
            filled itself in, chased what was overdue and produced the audit pack
            for you, that is what the account version does.
          </div>
        </section>
      </article>
    </div>
  );
}
