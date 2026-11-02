import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ActionRow, CheckRow, SiteRow } from "./db";
import { CHECKLIST, DISCLAIMER, FREQUENCIES } from "./checklist";
import { fmtDate, fmtLongDate, fmtTime } from "./format";

const DAY = 86_400_000;

function monthKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Europe/London",
  }).format(date);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function titleFor(key: string): string {
  return CHECKLIST.find((i) => i.key === key)?.title ?? key;
}

export interface AuditPdfInput {
  site: SiteRow;
  from: Date;
  to: Date;
  checks: CheckRow[];
  actions: ActionRow[];
  everRecorded: boolean;
  /** check id -> data URI, for photos that could be loaded. */
  photoData: Map<string, string>;
}

interface Column {
  label: string;
  width: number;
  align?: "left" | "right";
}

function Table({ columns, rows }: { columns: Column[]; rows: React.ReactNode[][] }) {
  return (
    <View style={styles.table}>
      <View style={styles.thead} fixed>
        {columns.map((column) => (
          <View key={column.label} style={{ width: `${column.width}%` }}>
            <Text style={[styles.th, { textAlign: column.align ?? "left" }]}>
              {column.label}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.tr} wrap={false}>
          {row.map((cell, cellIndex) => (
            <View
              key={cellIndex}
              style={{ width: `${columns[cellIndex]?.width ?? 0}%`, paddingRight: 3 }}
            >
              {typeof cell === "string" || typeof cell === "number" ? (
                <Text style={styles.td}>{cell}</Text>
              ) : (
                cell
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "24%" }}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function AuditDocument(input: AuditPdfInput) {
  const { site, from, to, checks, actions, everRecorded, photoData } = input;
  const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY) + 1);

  const summaryRows = CHECKLIST.map((item) => {
    const recs = checks.filter((c) => c.item_key === item.key);
    const expected = Math.max(1, Math.round(periodDays / FREQUENCIES[item.frequency].days));
    return {
      item,
      expected,
      recorded: recs.length,
      missed: Math.max(0, expected - recs.length),
      failures: recs.filter((r) => r.result === "fail").length,
      last: recs[recs.length - 1] ?? null,
    };
  });

  const dailyItems = CHECKLIST.filter((i) => i.frequency === "daily");
  const monthKeys = [...new Set(checks.map((c) => monthKey(c.performed_at)))].sort();
  const scheduledChecks = checks
    .filter((c) => c.item_key !== "exit-doors" && c.item_key !== "alarm-panel")
    .reverse();
  const failures = checks.filter((c) => c.result === "fail");
  const photos = [...failures, ...checks]
    .filter((c) => c.photo)
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .slice(0, 12);
  const failedOrNa = checks.filter((c) => c.result !== "pass").length;
  const address = [site.address, site.postcode].filter(Boolean).join(" · ");

  return (
    <Document
      title={`Audit pack — ${site.name}`}
      author="FireLogbook"
      subject={`Fire safety logbook, ${fmtDate(from)} to ${fmtDate(to)}`}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headRow}>
          <View style={{ width: "66%" }}>
            <Text style={styles.eyebrow}>Fire safety logbook</Text>
            <Text style={styles.h1}>{site.name}</Text>
            <Text style={styles.sub}>{address || "—"}</Text>
          </View>
          <View style={{ width: "32%", alignItems: "flex-end" }}>
            <Text style={styles.headingSmall}>Audit pack</Text>
            <Text style={styles.muted}>
              {fmtDate(from)} — {fmtDate(to)}
            </Text>
            <Text style={styles.muted}>Generated {fmtDate(new Date())}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Meta label="Responsible person" value={site.responsible_person || "—"} />
          <Meta
            label="Record period"
            value={
              everRecorded
                ? `${fmtLongDate(from)} to ${fmtLongDate(to)}`
                : `Since ${fmtLongDate(site.created_at)}`
            }
          />
          <Meta label="Checks recorded" value={String(checks.length)} />
          <Meta label="Failed or not applicable" value={String(failedOrNa)} />
        </View>

        {!everRecorded ? (
          <View style={{ marginTop: 22 }}>
            <Text style={styles.h2}>1. Summary of scheduled checks</Text>
            <Text style={styles.body}>
              This logbook was opened on {fmtLongDate(site.created_at)}. No checks
              have been recorded yet, so nothing is overdue. As soon as the first
              check is recorded, this section fills in with what was expected, what
              was recorded and what was missed for each of the thirteen checks.
            </Text>
            <Text style={styles.bodyMuted}>
              An inspector will want the record for the period since the last
              assessment. A logbook that starts empty and fills in is the normal
              starting position, not a gap.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.h2}>1. Summary of scheduled checks</Text>
            <Table
              columns={[
                { label: "Check", width: 33 },
                { label: "Frequency", width: 10 },
                { label: "Expected", width: 9, align: "right" },
                { label: "Recorded", width: 9, align: "right" },
                { label: "Missed", width: 9, align: "right" },
                { label: "Failures", width: 9, align: "right" },
                { label: "Last recorded", width: 21 },
              ]}
              rows={summaryRows.map((row) => [
                <Text key="check" style={styles.tdStrong}>
                  {row.item.title}
                </Text>,
                FREQUENCIES[row.item.frequency].label,
                String(row.expected),
                String(row.recorded),
                String(row.missed),
                String(row.failures),
                row.last ? fmtDate(row.last.performed_at) : "— none —",
              ])}
            />

            {dailyItems.length > 0 && monthKeys.length > 0 && (
              <>
                <Text style={styles.h2}>2. Daily checks by month</Text>
                <Table
                  columns={[
                    { label: "Month", width: 24 },
                    { label: "Check", width: 40 },
                    { label: "Days recorded", width: 18, align: "right" },
                    { label: "Failures", width: 18, align: "right" },
                  ]}
                  rows={monthKeys.flatMap((mk) =>
                    dailyItems.map((item) => {
                      const recs = checks.filter(
                        (c) => c.item_key === item.key && monthKey(c.performed_at) === mk,
                      );
                      const days = new Set(recs.map((r) => fmtDate(r.performed_at))).size;
                      return [
                        monthLabel(mk),
                        item.title,
                        String(days),
                        String(recs.filter((r) => r.result === "fail").length),
                      ];
                    }),
                  )}
                />
              </>
            )}

            <Text style={styles.h2}>3. Record of scheduled checks</Text>
            {scheduledChecks.length === 0 ? (
              <Text style={styles.bodyMuted}>
                No scheduled checks recorded in this period.
              </Text>
            ) : (
              <Table
                columns={[
                  { label: "Date", width: 17 },
                  { label: "Check", width: 28 },
                  { label: "Result", width: 9 },
                  { label: "Recorded by", width: 17 },
                  { label: "Note", width: 29 },
                ]}
                rows={scheduledChecks.map((c) => [
                  `${fmtDate(c.performed_at)} ${fmtTime(c.performed_at)}`,
                  titleFor(c.item_key),
                  c.result === "pass" ? "Pass" : c.result === "fail" ? "Fail" : "N/A",
                  c.performed_by,
                  c.note ?? "",
                ])}
              />
            )}

            <Text style={styles.h2}>4. Failures and remedial actions</Text>
            {actions.length === 0 ? (
              <Text style={styles.bodyMuted}>
                No remedial actions raised in this period.
              </Text>
            ) : (
              <Table
                columns={[
                  { label: "Raised", width: 12 },
                  { label: "Action", width: 43 },
                  { label: "Due", width: 10 },
                  { label: "Status", width: 9 },
                  { label: "Outcome", width: 26 },
                ]}
                rows={actions.map((a) => [
                  fmtDate(a.created_at),
                  <View key="action">
                    <Text style={styles.tdStrong}>{a.title}</Text>
                    {a.detail ? <Text style={styles.tdMuted}>{a.detail}</Text> : null}
                  </View>,
                  a.due_date ? fmtDate(a.due_date) : "—",
                  a.status === "open" ? "Open" : "Closed",
                  a.closed_note ?? "",
                ])}
              />
            )}

            {photos.length > 0 && (
              <>
                <Text style={styles.h2}>5. Photo evidence</Text>
                {chunk(photos, 3).map((group, groupIndex) => (
                  <View key={groupIndex} style={styles.photoRow} wrap={false}>
                    {group.map((c, index) => {
                      const uri = photoData.get(c.id);
                      return (
                        <View
                          key={c.id}
                          style={{ width: 168, marginRight: index < 2 ? 9 : 0 }}
                        >
                          {uri ? (
                            <Image src={uri} style={styles.photo} />
                          ) : (
                            <View style={styles.photoMissing}>
                              <Text style={styles.muted}>Photo unavailable</Text>
                            </View>
                          )}
                          <Text style={styles.caption}>
                            {fmtDate(c.performed_at)} · {titleFor(c.item_key)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        <View style={styles.signRow} wrap={false}>
          <View style={{ width: "48%" }}>
            <View style={styles.signLine} />
            <Text style={styles.caption}>Signed — responsible person</Text>
          </View>
          <View style={{ width: "30%" }}>
            <View style={styles.signLine} />
            <Text style={styles.caption}>Date</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

        <View fixed style={styles.footer}>
          <Text>FireLogbook · {site.name}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 46,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#1b1b1b",
    lineHeight: 1.35,
  },
  headRow: { flexDirection: "row", justifyContent: "space-between" },
  eyebrow: {
    fontSize: 7.5,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#6b6b6b",
  },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 5 },
  sub: { fontSize: 9, color: "#555", marginTop: 3 },
  headingSmall: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b6b6b", fontSize: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 8,
    paddingBottom: 9,
    borderTopWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: "#d8d3c9",
  },
  metaLabel: {
    fontSize: 6.8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#777",
    marginBottom: 2,
  },
  metaValue: { fontSize: 8.4 },
  h2: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 6,
  },
  body: { fontSize: 9, color: "#333", marginTop: 6, maxWidth: "92%" },
  bodyMuted: { fontSize: 8.6, color: "#777", marginTop: 6, maxWidth: "92%" },
  table: { marginBottom: 4 },
  thead: {
    flexDirection: "row",
    backgroundColor: "#f1eee8",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  th: { fontSize: 7.2, fontFamily: "Helvetica-Bold", color: "#4a4a4a" },
  tr: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e1d9",
  },
  td: { fontSize: 8 },
  tdStrong: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  tdMuted: { fontSize: 7.6, color: "#666", marginTop: 1 },
  photoRow: { flexDirection: "row", marginTop: 6 },
  photo: {
    width: 168,
    height: 126,
    objectFit: "cover",
    borderRadius: 3,
    borderWidth: 0.6,
    borderColor: "#ddd",
  },
  photoMissing: {
    width: 168,
    height: 126,
    borderRadius: 3,
    backgroundColor: "#f2f0eb",
    alignItems: "center",
    justifyContent: "center",
  },
  caption: { fontSize: 7.2, color: "#777", marginTop: 3 },
  signRow: { flexDirection: "row", marginTop: 28, gap: 36 },
  signLine: {
    borderBottomWidth: 0.8,
    borderColor: "#555",
    height: 22,
  },
  disclaimer: { fontSize: 7, color: "#777", marginTop: 22, maxWidth: "94%" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#888",
  },
});

export async function renderAuditPdf(input: AuditPdfInput): Promise<Buffer> {
  return renderToBuffer(<AuditDocument {...input} />);
}
