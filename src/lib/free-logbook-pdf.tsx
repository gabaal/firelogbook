import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { LeadRow } from "./db";
import { CHECKLIST, FREQUENCIES } from "./checklist";
import { fmtLongDate } from "./format";

function short(text: string): string {
  const first = text.split(". ")[0];
  return first.endsWith(".") ? first : `${first}.`;
}

interface Column {
  label: string;
  width: number;
  align?: "left" | "right";
}

function HeaderRow({ columns }: { columns: Column[] }) {
  return (
    <View style={[styles.row, styles.headerRow]} wrap={false}>
      {columns.map((column) => (
        <View
          key={column.label}
          style={[styles.cell, { width: `${column.width}%` }]}
        >
          <Text style={[styles.th, { textAlign: column.align ?? "left" }]}>
            {column.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BlankRows({
  count,
  columns,
  height,
}: {
  count: number;
  columns: Column[];
  height: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[styles.row, { minHeight: height }]}
          wrap={false}
        >
          {columns.map((column) => (
            <View
              key={column.label}
              style={[styles.cell, { width: `${column.width}%` }]}
            />
          ))}
        </View>
      ))}
    </>
  );
}

function Footer({ name }: { name: string }) {
  return (
    <View fixed style={styles.footer}>
      <Text>FireLogbook · {name}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const BULLETS = [
  "Record every check as it is done. Do not fill in the week afterwards.",
  "Write the date, sign it, and note anything that was wrong.",
  "If something fails, note what you did about it — that matters more than the failure.",
  "Keep the contractor certificates with this book.",
  "Review the fire risk assessment at least once a year, or when the premises change.",
];

const ANNUAL = [
  "Fire risk assessment review",
  "Fire alarm system service",
  "Fire extinguisher service",
  "Staff fire safety training",
];

const DAILY_COLUMNS: Column[] = [
  { label: "Date", width: 18 },
  { label: "Final exits open freely", width: 21 },
  { label: "Alarm panel normal", width: 21 },
  { label: "Signed", width: 16 },
  { label: "Notes / faults", width: 24 },
];

const WEEKLY_COLUMNS: Column[] = [
  { label: "Date", width: 18 },
  { label: "Call point tested", width: 22 },
  { label: "Emergency lights lit", width: 22 },
  { label: "Signed", width: 16 },
  { label: "Notes", width: 22 },
];

const MONTHLY_COLUMNS: Column[] = [
  { label: "Month", width: 14 },
  { label: "Extinguishers", width: 19 },
  { label: "Fire doors", width: 19 },
  { label: "Escape routes", width: 19 },
  { label: "Lighting 1 hour", width: 15 },
  { label: "Signed", width: 14 },
];

const DRILL_COLUMNS: Column[] = [
  { label: "Date", width: 16 },
  { label: "Time to evacuate", width: 16 },
  { label: "Issues found and what changed", width: 52 },
  { label: "Signed", width: 16 },
];

const ANNUAL_COLUMNS: Column[] = [
  { label: "Check", width: 30 },
  { label: "Date", width: 14 },
  { label: "Contractor / certificate reference", width: 42 },
  { label: "Signed", width: 14 },
];

const SERVICE_COLUMNS: Column[] = [
  { label: "Date", width: 14 },
  { label: "Contractor", width: 26 },
  { label: "Work carried out / certificate", width: 46 },
  { label: "Signed", width: 14 },
];

function FreeLogbookDocument({ lead, started }: { lead: LeadRow; started: Date }) {
  const address = [lead.address, lead.postcode].filter(Boolean).join(", ");

  return (
    <Document
      title={`Fire safety log book — ${lead.site_name}`}
      author="FireLogbook"
      subject="Blank fire safety log book"
    >
      {/* ------------------------------ cover ------------------------------ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.eyebrow}>Fire safety log book</Text>
          <Text style={styles.title}>{lead.site_name}</Text>
          <Text style={styles.address}>{address || "—"}</Text>
          <View style={styles.rule} />

          <View style={styles.metaGrid}>
            <Meta label="Premises" value={lead.site_name} />
            <Meta
              label="Responsible person"
              value={lead.responsible_person || " "}
            />
            <Meta label="Address" value={address || " "} />
            <Meta label="Book started" value={fmtLongDate(started)} />
            <Meta label="Completed by" value=" " />
            <Meta label="Person signing off" value=" " />
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Keep this book where staff can find it, and take it with you if you
              move premises. An inspector, insurer or fire officer may ask to see
              it. Completed records should be kept for at least three years.
            </Text>
          </View>

          <Text style={styles.disclaimer}>
            This log book records the checks that were carried out. It is not a
            fire risk assessment, and keeping it does not by itself make the
            premises compliant. The responsible person remains responsible for
            fire safety.
          </Text>
        </View>
        <Footer name={lead.site_name} />
      </Page>

      {/* --------------------------- how to use --------------------------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>How to use this book</Text>
        {BULLETS.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Text style={styles.bulletMark}>•</Text>
            <Text style={styles.bullet}>{bullet}</Text>
          </View>
        ))}

        <Text style={[styles.h2, { marginTop: 20 }]}>
          What to check, and how often
        </Text>
        <View style={styles.table}>
          <HeaderRow
            columns={[
              { label: "Check", width: 34 },
              { label: "How often", width: 13 },
              { label: "What good looks like", width: 53 },
            ]}
          />
          {CHECKLIST.map((item) => (
            <View key={item.key} style={styles.row} wrap={false}>
              <View style={[styles.cell, { width: "34%" }]}>
                <Text style={styles.cellStrong}>{item.title}</Text>
              </View>
              <View style={[styles.cell, { width: "13%" }]}>
                <Text style={styles.cell}>
                  {FREQUENCIES[item.frequency].label}
                </Text>
              </View>
              <View style={[styles.cell, { width: "53%" }]}>
                <Text style={styles.cellMuted}>{short(item.guidance)}</Text>
              </View>
            </View>
          ))}
        </View>
        <Footer name={lead.site_name} />
      </Page>

      {/* ----------------------------- daily ------------------------------ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Daily checks</Text>
        <Text style={styles.sub}>
          Once a day, before the premises opens. Initial each column.
        </Text>
        <View style={styles.table}>
          <HeaderRow columns={DAILY_COLUMNS} />
          <BlankRows count={31} columns={DAILY_COLUMNS} height={21} />
        </View>
        <Footer name={lead.site_name} />
      </Page>

      {/* ---------------------------- weekly ------------------------------ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Weekly checks</Text>
        <Text style={styles.sub}>
          Six months per page. Test a different call point each week and write
          down which one. Print a second copy for the other half of the year.
        </Text>
        <View style={styles.table}>
          <HeaderRow columns={WEEKLY_COLUMNS} />
          <BlankRows count={26} columns={WEEKLY_COLUMNS} height={25} />
        </View>
        <Footer name={lead.site_name} />
      </Page>

      {/* ---------------------------- monthly ----------------------------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Monthly checks</Text>
        <Text style={styles.sub}>
          One row per month. Note the result, not just a tick.
        </Text>
        <View style={styles.table}>
          <HeaderRow columns={MONTHLY_COLUMNS} />
          <BlankRows count={12} columns={MONTHLY_COLUMNS} height={24} />
        </View>

        <Text style={[styles.h2, { marginTop: 22 }]}>Quarterly fire drills</Text>
        <Text style={styles.sub}>Vary the assumed location of the fire each time.</Text>
        <View style={styles.table}>
          <HeaderRow columns={DRILL_COLUMNS} />
          <BlankRows count={4} columns={DRILL_COLUMNS} height={27} />
        </View>
        <Footer name={lead.site_name} />
      </Page>

      {/* ----------------------------- annual ----------------------------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Annual checks and servicing</Text>
        <View style={styles.table}>
          <HeaderRow columns={ANNUAL_COLUMNS} />
          {ANNUAL.map((label) => (
            <View key={label} style={[styles.row, { minHeight: 29 }]} wrap={false}>
              <View style={[styles.cell, { width: "30%" }]}>
                <Text style={styles.cellStrong}>{label}</Text>
              </View>
              <View style={[styles.cell, { width: "14%" }]} />
              <View style={[styles.cell, { width: "42%" }]} />
              <View style={[styles.cell, { width: "14%" }]} />
            </View>
          ))}
        </View>

        <Text style={[styles.h2, { marginTop: 22 }]}>Service record</Text>
        <Text style={styles.sub}>
          For any other visit: emergency lighting, fire doors, suppression.
        </Text>
        <View style={styles.table}>
          <HeaderRow columns={SERVICE_COLUMNS} />
          <BlankRows count={8} columns={SERVICE_COLUMNS} height={24} />
        </View>

        <View style={styles.finalNote}>
          <Text style={styles.noteText}>
            Free blank log book from FireLogbook. If you would rather the logbook
            filled itself in, chased what was overdue and produced the audit pack
            for you, that is what the account version does.
          </Text>
        </View>
        <Footer name={lead.site_name} />
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 38,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1b1b1b",
    lineHeight: 1.35,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 38,
    right: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#888",
  },
  cover: { marginTop: 8 },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#666",
  },
  title: { fontSize: 28, fontFamily: "Helvetica-Bold", marginTop: 10 },
  address: { fontSize: 11, color: "#444", marginTop: 5 },
  rule: {
    borderBottomWidth: 1.2,
    borderColor: "#1b1b1b",
    marginTop: 18,
    marginBottom: 20,
  },
  metaGrid: { flexDirection: "row", flexWrap: "wrap" },
  metaCell: { width: "50%", marginBottom: 16, paddingRight: 12 },
  metaLabel: {
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#777",
    marginBottom: 3,
  },
  metaValue: { fontSize: 10 },
  noteBox: {
    borderWidth: 0.7,
    borderColor: "#cfc9bd",
    backgroundColor: "#f6f3ed",
    padding: 12,
    marginTop: 18,
  },
  noteText: { fontSize: 9, color: "#333" },
  disclaimer: { fontSize: 7.5, color: "#777", marginTop: 18, maxWidth: "92%" },
  h2: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  sub: { fontSize: 8.5, color: "#666", marginBottom: 10 },
  bulletRow: { flexDirection: "row", marginBottom: 5 },
  bulletMark: { width: 12, fontSize: 9.5 },
  bullet: { flex: 1, fontSize: 9.5 },
  table: {
    borderWidth: 0.6,
    borderColor: "#bdb7ab",
    marginTop: 2,
  },
  headerRow: { backgroundColor: "#f1eee8", minHeight: 18 },
  row: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#d8d3c9",
  },
  cell: {
    paddingVertical: 3.5,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: "#d8d3c9",
  },
  th: { fontSize: 7.2, fontFamily: "Helvetica-Bold", color: "#4a4a4a" },
  cellStrong: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  cellMuted: { fontSize: 7.4, color: "#444" },
  finalNote: {
    borderWidth: 0.7,
    borderColor: "#cfc9bd",
    backgroundColor: "#f6f3ed",
    padding: 11,
    marginTop: 24,
  },
});

export async function renderFreeLogbookPdf(
  lead: LeadRow,
  started = new Date(),
): Promise<Buffer> {
  return renderToBuffer(<FreeLogbookDocument lead={lead} started={started} />);
}
