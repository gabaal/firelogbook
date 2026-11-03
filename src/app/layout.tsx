import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { DISCLAIMER } from "@/lib/checklist";
import { baseUrl } from "@/lib/mail";

const DESCRIPTION =
  "Record your fire safety checks on a phone, chase what is overdue, and hand an inspector a dated audit pack.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: "FireLogbook — the fire safety logbook for small sites",
    template: "%s · FireLogbook",
  },
  description: DESCRIPTION,
  applicationName: "FireLogbook",
  openGraph: {
    type: "website",
    siteName: "FireLogbook",
    locale: "en_GB",
    title: "FireLogbook — the fire safety logbook for small sites",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "FireLogbook — the fire safety logbook for small sites",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f1eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>
        <main>{children}</main>
        <footer className="footer no-print">
          <div className="shell stack-sm">
            <p>
              <strong>FireLogbook</strong> · fire safety records for small sites.
            </p>
            <p>
              <Link href="/checks" style={{ textDecoration: "underline" }}>
                The 13 checks
              </Link>{" "}
              ·{" "}
              <Link href="/free-logbook" style={{ textDecoration: "underline" }}>
                Free printable log book
              </Link>
            </p>
            <p style={{ maxWidth: "70ch" }}>{DISCLAIMER}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
