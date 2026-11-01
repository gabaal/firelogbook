import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DISCLAIMER } from "@/lib/checklist";

export const metadata: Metadata = {
  title: {
    default: "FireLogbook — the fire safety logbook for small sites",
    template: "%s · FireLogbook",
  },
  description:
    "Record your fire safety checks on a phone, chase what is overdue, and hand an inspector a dated audit pack.",
  applicationName: "FireLogbook",
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
            <p style={{ maxWidth: "70ch" }}>{DISCLAIMER}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
