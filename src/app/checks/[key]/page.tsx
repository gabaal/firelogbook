import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Doc } from "@/components/icons";
import PublicHeader from "@/components/PublicHeader";
import {
  CHECKLIST,
  DISCLAIMER,
  FREQUENCIES,
  ITEMS_BY_KEY,
} from "@/lib/checklist";
import { CHECK_SEO, FREQUENCY_NOTE } from "@/lib/check-seo";
import { baseUrl } from "@/lib/mail";

export const dynamicParams = false;

export function generateStaticParams() {
  return CHECKLIST.map((item) => ({ key: item.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const item = ITEMS_BY_KEY[key];
  if (!item) return { title: "Check not found" };

  const description = `${item.guidance} How often to do it, what to record, and the standard behind it (${item.ref}).`;
  return {
    title: `${item.title} — how often and what to record`,
    description,
    alternates: { canonical: `/checks/${item.key}` },
    openGraph: {
      title: item.title,
      description,
      url: `${baseUrl()}/checks/${item.key}`,
      type: "article",
    },
  };
}

export default async function CheckLandingPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const item = ITEMS_BY_KEY[key];
  if (!item) notFound();

  const seo = CHECK_SEO[item.key];
  const frequency = FREQUENCIES[item.frequency];
  const related = CHECKLIST.filter(
    (candidate) =>
      candidate.frequency === item.frequency && candidate.key !== item.key,
  ).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: item.title,
        description: item.guidance,
        about: item.ref,
        isPartOf: {
          "@type": "WebSite",
          name: "FireLogbook",
          url: baseUrl(),
        },
        mainEntityOfPage: `${baseUrl()}/checks/${item.key}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "FireLogbook",
            item: baseUrl(),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "The 13 checks",
            item: `${baseUrl()}/checks`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: item.title,
            item: `${baseUrl()}/checks/${item.key}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <PublicHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="shell section" style={{ maxWidth: 980, paddingTop: 36 }}>
        <Link
          href="/checks"
          className="row small muted"
          style={{ marginBottom: 16, gap: 5 }}
        >
          <ArrowLeft size={15} /> All 13 checks
        </Link>

        <p className="eyebrow">
          {frequency.label} · {item.ref}
        </p>
        <h1 className="h-page" style={{ marginTop: 8, maxWidth: "22ch" }}>
          {item.title}
        </h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: "62ch" }}>
          {item.guidance}
        </p>

        <div className="with-aside" style={{ marginTop: 30 }}>
          <div className="stack-lg">
            <section>
              <h2 className="h-sec">Why this check matters</h2>
              <p className="small" style={{ color: "var(--ink-2)", marginTop: 8 }}>
                {seo.why}
              </p>
            </section>

            <section>
              <h2 className="h-sec">How often</h2>
              <p className="small" style={{ color: "var(--ink-2)", marginTop: 8 }}>
                <strong>{frequency.label}.</strong> {FREQUENCY_NOTE[item.frequency]}{" "}
                The check supports <strong>{item.ref}</strong>.
              </p>
            </section>

            <section>
              <h2 className="h-sec">What a good record includes</h2>
              <ul
                className="small"
                style={{
                  margin: "10px 0 0",
                  padding: 0,
                  listStyle: "none",
                  color: "var(--ink-2)",
                }}
              >
                {seo.record.map((line) => (
                  <li
                    key={line}
                    style={{ display: "flex", gap: 8, padding: "5px 0" }}
                  >
                    <Check size={14} style={{ flex: "none", marginTop: 3 }} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <p className="note-box small">{DISCLAIMER}</p>
          </div>

          <aside className="stack-lg aside-sticky no-print">
            <div className="card card-pad">
              <div className="row" style={{ gap: 8 }}>
                <Doc size={16} style={{ color: "var(--ink-3)" }} />
                <p className="eyebrow" style={{ color: "var(--ink-2)" }}>
                  Keep the record
                </p>
              </div>
              <p className="small" style={{ color: "var(--ink-2)", marginTop: 8 }}>
                FireLogbook timestamps every check, ties it to the person who
                recorded it, and builds a dated audit pack for an inspector.
              </p>
              <Link
                href="/signin"
                className="btn btn-primary btn-block"
                style={{ marginTop: 12 }}
              >
                Start a 14-day trial
              </Link>
              <Link
                href="/free-logbook"
                className="btn btn-block"
                style={{ marginTop: 8 }}
              >
                Free printable log book
              </Link>
            </div>

            {related.length > 0 && (
              <div className="card card-pad">
                <p className="eyebrow">Other {frequency.label.toLowerCase()} checks</p>
                <div className="stack-sm" style={{ marginTop: 8 }}>
                  {related.map((candidate) => (
                    <Link
                      key={candidate.key}
                      href={`/checks/${candidate.key}`}
                      className="row"
                      style={{
                        gap: 6,
                        justifyContent: "space-between",
                        padding: "5px 0",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <span className="small">{candidate.title}</span>
                      <ArrowRight size={13} />
                    </Link>
                  ))}
                </div>
                <Link
                  href="/checks"
                  className="small"
                  style={{ display: "inline-block", marginTop: 10, textDecoration: "underline" }}
                >
                  See all 13 checks
                </Link>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
