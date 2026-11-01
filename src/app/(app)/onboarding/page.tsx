import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirm } from "@/lib/auth";
import { countSites } from "@/lib/data";
import { CHECKLIST, FREQUENCIES } from "@/lib/checklist";
import OnboardingForm from "@/components/OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { firm } = await requireFirm();
  if (await countSites(firm.id) > 0) redirect("/sites");

  const groups = (["daily", "weekly", "monthly", "quarterly", "annual"] as const).map(
    (frequency) => ({
      frequency,
      items: CHECKLIST.filter((i) => i.frequency === frequency),
    }),
  );

  return (
    <div className="shell section" style={{ maxWidth: 920 }}>
      <div className="row-between" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Step 1 of 1</p>
        <Link href="/sites" className="small muted">
          Skip for now
        </Link>
      </div>

      <div className="with-aside">
        <div>
          <h1 className="h-page">Add your first site</h1>
          <p className="lede" style={{ marginTop: 8, marginBottom: 22 }}>
            Three fields and you have a working logbook. The checklist fills
            itself, and your first audit pack is one click away.
          </p>
          <OnboardingForm defaultFirmName={firm.name} />
        </div>

        <aside className="stack-lg">
          <div className="card card-pad">
            <p className="eyebrow">What gets set up</p>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              {groups.map((g) => (
                <div
                  key={g.frequency}
                  className="row-between"
                  style={{ padding: "5px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <span className="small">{FREQUENCIES[g.frequency].label} checks</span>
                  <span className="small mono muted">{g.items.length}</span>
                </div>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>
              13 checks in total, each with guidance and the standard behind it.
            </p>
          </div>

          <div className="card card-pad">
            <p className="eyebrow">After this</p>
            <p className="small" style={{ marginTop: 8, color: "var(--ink-2)" }}>
              You land on your first audit pack — the document you would hand an
              inspector. It is dated, branded with your firm, and fills as checks
              are recorded.
            </p>
            <p className="small" style={{ marginTop: 10, color: "var(--ink-3)" }}>
              Create the site and the pack is built for you.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
