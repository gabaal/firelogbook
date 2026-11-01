import Link from "next/link";
import { Flame } from "@/components/icons";
import DemoButton from "@/components/DemoButton";

export default function Home() {
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
            <Link href="/free-logbook" className="hidden-sm">
              Free log book
            </Link>
            <Link href="/signin">Sign in</Link>
            <Link href="/signin" className="btn btn-sm" style={{ marginLeft: 4 }}>
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="shell">
          <p className="eyebrow">Fire safety records for small sites</p>
          <h1 className="h-display" style={{ marginTop: 10 }}>
            The logbook an inspector will actually accept.
          </h1>
          <p className="lede" style={{ marginTop: 18, maxWidth: "52ch" }}>
            Record every fire safety check on a phone, in ten seconds. Chase what
            falls overdue. Hand over a dated audit pack instead of a ring binder
            of loose paper.
          </p>
          <div className="row" style={{ marginTop: 26, gap: 10 }}>
            <DemoButton className="btn btn-primary btn-lg">
              Open the demo logbook
            </DemoButton>
            <Link href="/signin" className="btn btn-lg">
              Start a 14-day trial
            </Link>
          </div>
          <p className="tiny muted" style={{ marginTop: 14 }}>
            No card for the trial · £29 per site per month after
          </p>
        </div>
      </section>

      <section className="section">
        <div className="shell grid-3">
          {[
            {
              t: "Record in the building",
              d: "The checklist, a photo and a timestamp. Works on a phone, in a plant room, with no signal.",
            },
            {
              t: "Chase what is late",
              d: "Daily, weekly, monthly and annual checks each have their own clock. Overdue items surface before an inspector does.",
            },
            {
              t: "Export the evidence",
              d: "One click builds a dated PDF: every check, every failure, every action, with a signature block. Share it with a link.",
            },
          ].map((f) => (
            <div className="card card-pad" key={f.t}>
              <h3 className="h-sec">{f.t}</h3>
              <p className="small" style={{ color: "var(--ink-2)", marginTop: 8 }}>
                {f.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="shell grid-2">
          <div>
            <p className="eyebrow">What is in the logbook</p>
            <h2 className="h-page" style={{ marginTop: 8, fontSize: "1.9rem" }}>
              Thirteen checks. The ones that get asked for.
            </h2>
            <p className="lede" style={{ marginTop: 14 }}>
              Exit doors and alarm panel daily. Call points and emergency
              lighting weekly. Extinguishers, fire doors and escape routes
              monthly. Drills quarterly. The risk assessment, system services and
              training annually.
            </p>
            <p className="small muted" style={{ marginTop: 14 }}>
              Built around the duties in the Regulatory Reform (Fire Safety)
              Order 2005 and the relevant British standards for alarm,
              extinguisher and emergency lighting testing.
            </p>
          </div>
          <div className="card card-pad">
            <p className="eyebrow">Pricing</p>
            <p className="price" style={{ marginTop: 4 }}>
              £29<span className="small muted"> / site / month</span>
            </p>
            <ul className="small" style={{ margin: "14px 0 0", padding: 0, listStyle: "none" }}>
              {[
                "Unlimited checks and photos",
                "Unlimited audit packs and share links",
                "Email reminders when a check falls due",
                "Multi-site dashboard",
                "14-day trial, cancel any time, export everything",
              ].map((li) => (
                <li key={li} style={{ padding: "5px 0", color: "var(--ink-2)" }}>
                  ✓ {li}
                </li>
              ))}
            </ul>
            <Link href="/signin" className="btn btn-ember btn-block" style={{ marginTop: 18 }}>
              Start free trial
            </Link>
            <p className="tiny muted" style={{ marginTop: 8, textAlign: "center" }}>
              Or{" "}
              <Link href="/signin" style={{ textDecoration: "underline" }}>
                sign in
              </Link>{" "}
              to an existing account
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
