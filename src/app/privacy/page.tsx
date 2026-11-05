import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { LEGAL } from "@/lib/legal";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

const DESCRIPTION =
  "What FireLogbook collects, why, who processes it, how long we keep it, and how to exercise your UK data rights.";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy policy",
    description: DESCRIPTION,
    url: "/privacy",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy policy",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="h-sec">{heading}</h2>
      <div className="stack-sm" style={{ marginTop: 8 }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="small" style={{ color: "var(--ink-2)" }}>
      {children}
    </p>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul
      className="small"
      style={{
        margin: "4px 0 0",
        paddingLeft: 20,
        color: "var(--ink-2)",
        display: "grid",
        gap: 6,
      }}
    >
      {children}
    </ul>
  );
}

export default function PrivacyPage() {
  const operator = LEGAL.address
    ? `${LEGAL.operator}, ${LEGAL.address}`
    : LEGAL.operator;

  return (
    <>
      <PublicHeader />
      <section className="shell section" style={{ maxWidth: 760, paddingTop: 40 }}>
        <p className="eyebrow">Legal</p>
        <h1 className="h-page" style={{ marginTop: 8 }}>
          Privacy policy
        </h1>
        <p className="small muted" style={{ marginTop: 8 }}>
          Last updated {LEGAL.updated}
        </p>

        <div className="stack-lg" style={{ marginTop: 26 }}>
          <Section heading="Who we are">
            <P>
              {LEGAL.tradingName} is a fire safety logbook service operated by{" "}
              {operator}. For the purposes of UK data protection law, that
              operator is the data controller for the information described
              below. Contact us at{" "}
              <a href={`mailto:${LEGAL.contactEmail}`} style={{ textDecoration: "underline" }}>
                {LEGAL.contactEmail}
              </a>
              .
            </P>
            <P>
              This policy covers the website, the signed-in logbook, the free
              printable log book and the emails we send. It does not cover a
              third-party site you reach from a link.
            </P>
          </Section>

          <Section heading="What we collect">
            <P>
              <strong>Account and firm details:</strong> your email address, the
              name you choose to show, your firm or organisation name, and the
              role of people you invite.
            </P>
            <P>
              <strong>Logbook content:</strong> site names, addresses, postcodes,
              the responsible person and their email; the checks recorded
              (result, note, date and time, who recorded it), photos you attach,
              and any remedial actions.
            </P>
            <P>
              <strong>Free log book leads:</strong> the premises details you type
              into the form, the email address if you give one, and whether you
              ticked the box to receive occasional tips.
            </P>
            <P>
              <strong>Billing:</strong> Stripe customer and subscription
              identifiers, plan and status. Card details are entered on Stripe's
              checkout and are never seen or stored by us.
            </P>
            <P>
              <strong>Technical and security data:</strong> the session cookie
              described below, server logs held by our host (including IP address
              and user agent), an IP-based key in our rate-limit table, and
              product events such as "check recorded" or "checkout started".
              Product events deliberately exclude emails, names and notes and use
              only account/site identifiers, statuses and results.
            </P>
          </Section>

          <Section heading="Why we use it, and our lawful basis">
            <List>
              <li>
                <strong>To provide the service</strong> — running your logbook,
                sending sign-in links and reminders, producing PDFs. Lawful basis:
                performance of our contract with you.
              </li>
              <li>
                <strong>To take payment</strong> — subscriptions are handled by
                Stripe. Lawful basis: contract, and legal obligations for tax and
                accounting records.
              </li>
              <li>
                <strong>To keep the service secure and improve it</strong> —
                rate limiting, abuse prevention, aggregate product analytics.
                Lawful basis: our legitimate interests in a safe, working service.
              </li>
              <li>
                <strong>To send fire-safety tips and product updates</strong> —
                only where you ticked the marketing box. Lawful basis: consent,
                which you can withdraw at any time.
              </li>
              <li>
                <strong>To meet legal duties</strong> — for example responding to
                a lawful request or keeping billing records.
              </li>
            </List>
          </Section>

          <Section heading="Cookies">
            <P>
              We use one essential cookie, <code>flb_session</code>, to keep you
              signed in. It is HTTP-only, lasts up to 30 days and is deleted when
              you sign out. We do not use advertising cookies, cross-site
              tracking, or third-party analytics scripts. Our host may set
              infrastructure cookies strictly necessary to serve the site.
            </P>
          </Section>

          <Section heading="Who processes it">
            <P>
              We use a small number of service providers who act on our
              instructions under data-processing terms:
            </P>
            <List>
              <li><strong>Vercel</strong> — hosting and server logs.</li>
              <li><strong>Neon</strong> — the Postgres database holding accounts and logbook records (hosted in the United States, US East).</li>
              <li><strong>Vercel Blob</strong> — storage for check photos.</li>
              <li><strong>Brevo</strong> — delivery of sign-in links, reminders and lead emails.</li>
              <li><strong>Stripe</strong> — checkout, subscriptions, invoices and the billing portal.</li>
            </List>
            <P>
              Some of these providers process data outside the UK. Where they do,
              transfers rely on appropriate safeguards such as the UK
              International Data Transfer Addendum or standard contractual
              clauses. We do not sell personal data.
            </P>
          </Section>

          <Section heading="How long we keep it">
            <P>
              Logbook records and account details are kept while your account is
              open. If you close your account, contact us and we will delete or
              anonymise the account data, except records we must keep for tax,
              accounting or legal reasons. Export anything you need first.
            </P>
            <P>
              Free-log-book leads are kept until you unsubscribe or ask us to
              delete them; an opt-out flag is retained so we do not email you
              again. Rate-limit keys are deleted after about seven days, and
              server logs follow our host's retention period.
            </P>
          </Section>

          <Section heading="Your rights">
            <P>
              Under UK GDPR you can ask for a copy of your data, correct it, ask
              us to delete it, restrict or object to certain processing, or
              receive it in a portable format. Where we rely on consent, you can
              withdraw it at any time. Email{" "}
              <a href={`mailto:${LEGAL.contactEmail}`} style={{ textDecoration: "underline" }}>
                {LEGAL.contactEmail}
              </a>{" "}
              and we will respond within one month.
            </P>
            <P>
              You can also complain to the Information Commissioner's Office at{" "}
              <a href="https://ico.org.uk" style={{ textDecoration: "underline" }}>
                ico.org.uk
              </a>
              , though we would appreciate the chance to put things right first.
            </P>
          </Section>

          <Section heading="Marketing emails">
            <P>
              Tips and product updates are sent only to leads who ticked the
              marketing box. Every such email includes an unsubscribe link, and
              unsubscribing stops the sequence. Sign-in links, reminders for your
              own sites, receipts and service messages are transactional and are
              not affected by that choice.
            </P>
          </Section>

          <Section heading="Security">
            <P>
              Data is encrypted in transit. Sessions use signed, HTTP-only
              cookies; sign-in links are single-use and time-limited. Access to
              the production environment is restricted. No service can promise
              perfect security, but we take these steps seriously and will tell
              you if a breach affects your data where the law requires it.
            </P>
          </Section>

          <Section heading="Children">
            <P>
              The service is intended for people running premises in the course of
              a business or organisation, not for children. We do not knowingly
              collect data from anyone under 18.
            </P>
          </Section>

          <Section heading="Changes">
            <P>
              If this policy changes we will update the date above. Material
              changes that affect your rights will be notified by email or on the
              site before they take effect.
            </P>
          </Section>
        </div>

        <p className="tiny muted" style={{ marginTop: 26 }}>
          See also our{" "}
          <Link href="/terms" style={{ textDecoration: "underline" }}>
            terms of service
          </Link>
          .
        </p>
      </section>
    </>
  );
}
