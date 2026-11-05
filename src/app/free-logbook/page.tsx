import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Check } from "@/components/icons";
import FreeLogbookForm from "@/components/FreeLogbookForm";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

const TITLE = "Free fire safety log book — print one in a minute";
const DESCRIPTION =
  "A printable fire safety log book with the thirteen checks an inspector asks for. Free, no account, filled in with your premises details.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/free-logbook" },
  openGraph: {
    title: TITLE,
    description:
      "The thirteen checks an inspector asks for, laid out for a full year, with your premises details on the cover. Free A4 PDF.",
    url: "/free-logbook",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function FreeLogbookPage() {
  return (
    <>
      <header className="topbar">
        <div className="shell topbar-in">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Flame size={15} />
            </span>
            FireLogbook
          </Link>
          <nav className="topnav">
            <Link href="/checks" className="hidden-sm">
              The 13 checks
            </Link>
            <Link href="/signin">Sign in</Link>
            <Link href="/" className="btn btn-sm" style={{ marginLeft: 4 }}>
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      <section className="shell section" style={{ paddingTop: 40, maxWidth: 1040 }}>
        <p className="eyebrow">Free · no account · A4 PDF</p>
        <h1 className="h-page" style={{ marginTop: 8, maxWidth: "24ch" }}>
          Print a proper fire safety log book
        </h1>
        <p className="lede" style={{ marginTop: 12, maxWidth: "56ch" }}>
          The thirteen checks an inspector asks for, laid out for a full year,
          with your premises details already printed on the cover. Free to
          download and keep.
        </p>

        <div className="with-aside" style={{ marginTop: 28 }}>
          <FreeLogbookForm />

          <aside className="stack">
            <div className="card card-pad">
              <p className="eyebrow">What is inside</p>
              <ul className="small" style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
                {[
                  "Cover page with the premises and responsible person",
                  "The 13 checks, with what good looks like",
                  "31 days of daily check rows",
                  "Half a year of weekly rows",
                  "Monthly, quarterly and annual grids",
                  "Service record for alarm and extinguisher contractors",
                ].map((line) => (
                  <li
                    key={line}
                    style={{
                      padding: "5px 0",
                      color: "var(--ink-2)",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <Check size={14} style={{ color: "var(--ok)", flex: "none", marginTop: 3 }} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card card-pad" style={{ background: "#fbf9f5" }}>
              <p className="eyebrow">Paper is fine until it isn&rsquo;t</p>
              <p className="small" style={{ color: "var(--ink-2)", marginTop: 8 }}>
                A printed book records what somebody remembered to write down. It
                cannot tell you a check is three weeks late, or produce a dated
                audit pack when an insurer asks.
              </p>
              <Link
                href="/"
                className="btn btn-sm"
                style={{ marginTop: 12, display: "inline-flex" }}
              >
                See the digital logbook →
              </Link>
              <p className="tiny muted" style={{ marginTop: 10 }}>
                Not sure what each check involves?{" "}
                <Link href="/checks" style={{ textDecoration: "underline" }}>
                  Read the 13 check guides
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
