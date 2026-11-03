import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { DISCLAIMER } from "@/lib/checklist";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms for using FireLogbook: trial, subscription, billing, cancellation, acceptable use, liability and governing law.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of service",
    description:
      "The terms for using FireLogbook: trial, subscription, billing, cancellation and liability.",
    url: "/terms",
    type: "website",
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

export default function TermsPage() {
  const operator = LEGAL.address
    ? `${LEGAL.operator}, ${LEGAL.address}`
    : LEGAL.operator;

  return (
    <>
      <PublicHeader />
      <section className="shell section" style={{ maxWidth: 760, paddingTop: 40 }}>
        <p className="eyebrow">Legal</p>
        <h1 className="h-page" style={{ marginTop: 8 }}>
          Terms of service
        </h1>
        <p className="small muted" style={{ marginTop: 8 }}>
          Last updated {LEGAL.updated}
        </p>

        <div className="stack-lg" style={{ marginTop: 26 }}>
          <Section heading="About these terms">
            <P>
              These terms are an agreement between you and {LEGAL.tradingName},
              operated by {operator}. By creating an account, starting a trial or
              using the service, you accept them. If you are a consumer, nothing
              in these terms affects your statutory rights. The service is
              intended for use by businesses, charities and other organisations.
            </P>
          </Section>

          <Section heading="The service">
            <P>
              {LEGAL.tradingName} gives you a digital fire safety logbook: it
              records checks against a checklist, shows what is due or overdue,
              sends reminders, and produces PDF audit packs. It is a record-keeping
              tool, not a fire risk assessment and not a substitute for competent
              advice or for the duties of the responsible person.
            </P>
            <P>
              {DISCLAIMER} We do not warrant that using the service will satisfy
              any particular inspector, insurer, landlord or enforcing authority.
            </P>
          </Section>

          <Section heading="Your account">
            <P>
              You need a working email address. Sign-in is by single-use magic
              link, so keep access to that inbox secure. If you invite other
              people, you are responsible for who you invite and for their use of
              the account. Tell us promptly if you believe someone has accessed it
              without permission.
            </P>
          </Section>

          <Section heading="Free trial">
            <P>
              A new account starts with a 14-day trial and no card. During the
              trial you have full access. If you subscribe before it ends, we save
              your card and start billing when the trial would have ended, so the
              rest of the trial is not lost. If the trial ends without a
              subscription, the account becomes read-only: you can view, print and
              export your records, but no new checks can be recorded until you
              subscribe.
            </P>
            <P>
              We may change or withdraw trial offers in future; that will not
              affect a trial already running.
            </P>
          </Section>

          <Section heading="Plans, prices and billing">
            <List>
              <li>
                The plans are £29 per site per month or £290 per site per year.
                The number of sites on the account sets the quantity billed.
              </li>
              <li>
                Prices and any applicable taxes are shown at Stripe checkout. By
                subscribing you authorise recurring charges to your payment method
                at the start of each billing period until you cancel.
              </li>
              <li>
                Payments are processed by Stripe. We do not store card details.
              </li>
              <li>
                You can cancel at any time in the billing portal. Access continues
                until the end of the period you have paid for; we do not refund
                part-periods except where the law requires it.
              </li>
              <li>
                If a payment fails we may retry it and mark the account past due.
                Recording stops, and your records remain readable, until payment
                is restored.
              </li>
              <li>
                If we change the price, we will give at least 30 days' notice
                before it applies to your next renewal.
              </li>
            </List>
          </Section>

          <Section heading="Cancellation and termination">
            <P>
              You can stop the subscription in the billing portal; the account
              then runs to the end of the paid period. We may suspend or terminate
              an account for non-payment, a serious breach of these terms, or
              unlawful use. On termination your right to use the service ends.
              Your records are handled as described in the privacy policy, so
              export anything you need before you cancel.
            </P>
          </Section>

          <Section heading="Your content and data">
            <P>
              You own the records, photos and other content you put into the
              service. You give us permission to store, process and display that
              content only as needed to run the service for you, including
              producing PDFs and sending reminders. You are responsible for having
              a lawful basis to store information about other people (for example
              staff names or a responsible person's email), and for keeping it
              accurate.
            </P>
          </Section>

          <Section heading="Acceptable use">
            <List>
              <li>Do not use the service unlawfully or to store unlawful material.</li>
              <li>Do not attempt to access another firm's data or another person's account.</li>
              <li>Do not scrape, resell or provide the service to third parties as your own.</li>
              <li>Do not interfere with the service, probe it for vulnerabilities without permission, or overload it.</li>
              <li>Do not upload malware or content you do not have the right to use.</li>
            </List>
          </Section>

          <Section heading="Availability and changes">
            <P>
              We work to keep the service available and to fix problems promptly,
              but it is provided without a service-level guarantee. Maintenance,
              third-party outages or events outside our control may interrupt it.
              We may change or improve features; if we make a material reduction to
              a paid feature, we will give reasonable notice.
            </P>
          </Section>

          <Section heading="Intellectual property">
            <P>
              The software, design and branding of {LEGAL.tradingName} belong to
              us. Your content remains yours. These terms do not transfer either
              party's intellectual property to the other.
            </P>
          </Section>

          <Section heading="Liability">
            <P>
              Nothing in these terms excludes or limits liability for death or
              personal injury caused by negligence, for fraud or fraudulent
              misrepresentation, or for anything else that cannot lawfully be
              excluded. If you are a consumer, your statutory rights are
              unaffected.
            </P>
            <P>
              Subject to that, the service is provided with reasonable care but
              without warranties that it will meet a particular inspection,
              insurance or compliance outcome. To the extent the law allows, we
              are not liable for indirect or consequential loss, loss of profit,
              loss of business or loss of data, and our total liability arising
              from the service in any 12-month period is limited to the greater of
              the fees you paid us in that period and £100.
            </P>
          </Section>

          <Section heading="Governing law">
            <P>
              These terms are governed by the law of {LEGAL.jurisdiction}, and the
              courts of {LEGAL.jurisdiction} have exclusive jurisdiction, except
              where consumer law gives you the right to bring proceedings
              elsewhere.
            </P>
          </Section>

          <Section heading="Contact">
            <P>
              Questions about these terms:{" "}
              <a href={`mailto:${LEGAL.contactEmail}`} style={{ textDecoration: "underline" }}>
                {LEGAL.contactEmail}
              </a>
              .
            </P>
          </Section>
        </div>

        <p className="tiny muted" style={{ marginTop: 26 }}>
          See also our{" "}
          <Link href="/privacy" style={{ textDecoration: "underline" }}>
            privacy policy
          </Link>
          .
        </p>
      </section>
    </>
  );
}
