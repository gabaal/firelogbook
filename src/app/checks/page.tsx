import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import PublicHeader from "@/components/PublicHeader";
import { CHECKLIST, FREQUENCIES, type Frequency } from "@/lib/checklist";
import { baseUrl } from "@/lib/mail";

export const metadata: Metadata = {
  title: "The 13 fire safety checks for small sites",
  description:
    "Every fire safety check a small site needs: exit doors and the alarm panel daily, call points and emergency lighting weekly, extinguishers, fire doors and escape routes monthly, drills quarterly, and services and training annually.",
  alternates: { canonical: "/checks" },
  openGraph: {
    title: "The 13 fire safety checks for small sites",
    description:
      "What to check, how often, and what to write down — the full fire safety checklist for small sites.",
    url: `${baseUrl()}/checks`,
    type: "website",
  },
};

const ORDER: Frequency[] = ["daily", "weekly", "monthly", "quarterly", "annual"];

export default function ChecksIndexPage() {
  return (
    <>
      <PublicHeader />

      <section className="shell section" style={{ maxWidth: 980, paddingTop: 44 }}>
        <p className="eyebrow">The checklist</p>
        <h1 className="h-page" style={{ marginTop: 8, maxWidth: "22ch" }}>
          The 13 fire safety checks for a small site
        </h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: "60ch" }}>
          These are the checks an inspector, insurer or landlord will ask to
          see. Each one has its own clock, its own evidence, and a page here
          explaining what to look for.
        </p>

        {ORDER.map((frequency) => {
          const items = CHECKLIST.filter((item) => item.frequency === frequency);
          if (items.length === 0) return null;
          return (
            <section key={frequency} style={{ marginTop: 34 }}>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <h2 className="h-sec">{FREQUENCIES[frequency].label} checks</h2>
                <span className="small muted">
                  {items.length} check{items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="card">
                {items.map((item) => (
                  <Link
                    key={item.key}
                    href={`/checks/${item.key}`}
                    className="item-row"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="item-main">
                      <p className="item-title">{item.title}</p>
                      <div className="item-meta">
                        <span className="freq-tag">
                          {FREQUENCIES[item.frequency].short}
                        </span>
                        <span className="sep" />
                        <span>{item.ref}</span>
                      </div>
                    </div>
                    <span className="small muted row" style={{ gap: 4 }}>
                      Read <ArrowRight size={14} />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <div className="card card-pad" style={{ marginTop: 34 }}>
          <h2 className="h-sec">Put the checklist on a phone</h2>
          <p className="small" style={{ color: "var(--ink-2)", marginTop: 8 }}>
            FireLogbook records each check with a timestamp, your name and an
            optional photo, chases what falls overdue, and builds a dated PDF for
            an inspector. Start with the printable version if you prefer paper.
          </p>
          <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <Link href="/signin" className="btn btn-primary">
              Start a 14-day trial
            </Link>
            <Link href="/free-logbook" className="btn">
              Get the free printable log book
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
