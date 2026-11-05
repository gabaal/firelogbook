import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import PublicHeader from "@/components/PublicHeader";
import { CHECKLIST, FREQUENCIES, type Frequency } from "@/lib/checklist";
import { baseUrl } from "@/lib/mail";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

const DESCRIPTION =
  "The 13 fire safety checks a small site needs — daily, weekly, monthly, quarterly and annual — with what to look for and what to record.";

export const metadata: Metadata = {
  title: "The 13 fire safety checks for small sites",
  description: DESCRIPTION,
  alternates: { canonical: "/checks" },
  openGraph: {
    title: "The 13 fire safety checks for small sites",
    description: DESCRIPTION,
    url: `${baseUrl()}/checks`,
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "The 13 fire safety checks for small sites",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const ORDER: Frequency[] = ["daily", "weekly", "monthly", "quarterly", "annual"];

export default function ChecksIndexPage() {
  const base = baseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "FireLogbook",
            item: base,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "The 13 checks",
            item: `${base}/checks`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: "The 13 fire safety checks for small sites",
        itemListElement: CHECKLIST.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.title,
          url: `${base}/checks/${item.key}`,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
