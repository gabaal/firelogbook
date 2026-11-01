import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { CHECKLIST, FREQUENCIES, type CheckItem } from "./checklist";

const DAY = 86_400_000;

/** Deterministic PRNG so the demo data is stable across restarts. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SiteProfile {
  id: string;
  name: string;
  address: string;
  postcode: string;
  responsiblePerson: string;
  responsibleEmail: string;
  checkers: string[];
  /** How often a daily check is skipped, 0–1. */
  skipRate: number;
  /** Days ago the most recent record was made. Anything not listed defaults to a sane value. */
  lastDone: Partial<Record<string, number>>;
  recentFail?: { key: string; ago: number; note: string };
}

const SITES: SiteProfile[] = [
  {
    id: "site-harbour",
    name: "Harbour Lane Dental Practice",
    address: "12 Harbour Lane, Bristol",
    postcode: "BS1 4QA",
    responsiblePerson: "Dr Anya Patel",
    responsibleEmail: "anya@harbourlanedental.example",
    checkers: ["Rosa Nunes", "Dan Whyte", "Anya Patel"],
    skipRate: 0,
    lastDone: {
      "fire-doors": 9,
      "fra-review": 214,
      "drill": 61,
      "alarm-service": 240,
      "extinguisher-service": 240,
      "staff-training": 190,
      "emergency-lighting-duration": 12,
    },
    recentFail: {
      key: "fire-doors",
      ago: 9,
      note: "Rear office door closes to within about 40mm and then stops. Closer arm looks weak. Door is being kept shut and the room is not in use.",
    },
  },
  {
    id: "site-cafe",
    name: "Copper Kettle Café",
    address: "3 Kingsmead Square, Bath",
    postcode: "BA1 2AB",
    responsiblePerson: "Marcus Bell",
    responsibleEmail: "marcus@copperkettle.example",
    checkers: ["Marcus Bell", "Elin Rees"],
    skipRate: 0.05,
    lastDone: {
      "call-point": 7,
      "extinguishers-visual": 42,
      "drill": 118,
      "fire-doors": 5,
      "escape-routes": 6,
      "fra-review": 150,
      "alarm-service": 320,
      "extinguisher-service": 300,
      "staff-training": 300,
    },
  },
  {
    id: "site-kingsdown",
    name: "14 Kingsdown Terrace",
    address: "14 Kingsdown Terrace, Bristol",
    postcode: "BS2 8LT",
    responsiblePerson: "Marsh & Vale Property",
    responsibleEmail: "terry@marshvale.example",
    checkers: ["Terry Okafor", "Marsh & Vale inspections"],
    skipRate: 0.16,
    lastDone: {
      "fra-review": 395,
      "emergency-lighting-duration": 55,
      "drill": 190,
      "extinguishers-visual": 34,
      "call-point": 30,
      "fire-doors": 30,
      "escape-routes": 30,
      "alarm-service": 380,
      "extinguisher-service": 380,
      "staff-training": 400,
    },
  },
];

const NOTES: Record<string, string[]> = {
  "exit-doors": [
    "All final exits opened from the inside without a key. Routes clear.",
    "Front and rear exits checked at opening. Both fine.",
  ],
  "alarm-panel": [
    "Panel normal, no faults or disablements.",
    "Panel showing normal. Battery healthy.",
  ],
  "call-point": [
    "Tested call point CP3, rear corridor. Sounders operated throughout, panel reset and confirmed normal.",
    "Tested call point CP1 by the main entrance. Alarm sounded across both floors. Silenced and reset inside 2 minutes.",
  ],
  "emergency-lighting-flick": [
    "All 9 fittings illuminated on test.",
    "Fittings in the stairwell and rear lobby tested, all lit.",
  ],
  "extinguishers-visual": [
    "6 extinguishers checked. All in place, seals intact, gauges in the green.",
    "Water and CO2 units checked. Nothing to report.",
  ],
  "fire-doors": [
    "All fire doors closed and latched from their own weight. Seals intact, no wedges found.",
    "Doors checked on both floors. Minor scuffing on the stairwell door but no defect.",
  ],
  "escape-routes": [
    "Stairs and corridors clear. No storage found.",
    "Escape route clear, exit signage lit and legible.",
  ],
  "emergency-lighting-duration": [
    "One-hour test completed. All fittings stayed lit for the full hour.",
    "Duration test run with the supply isolated. Two fittings dimmed at 55 minutes — noted for replacement.",
  ],
  drill: [
    "Full evacuation in 2 minutes 10 seconds. All present at the assembly point. No issues.",
    "Evacuation drill run at 14:30. 11 people, 2 minutes 40 seconds. Rear exit used as the primary route.",
  ],
  "fra-review": [
    "Assessment reviewed. No significant changes to the premises or the activities. Next review in 12 months.",
    "Reviewed following the change of use of the first-floor room. No new significant findings.",
  ],
  "alarm-service": [
    "Service by Wessex Fire Protection. Certificate WF-2291 filed.",
    "Annual service completed by the competent person. No defects recorded.",
  ],
  "extinguisher-service": [
    "All extinguishers basic-serviced by Wessex Fire Protection. Certificate WF-2292 filed.",
    "Service completed. One extinguisher replaced (CO2, out of test).",
  ],
  "staff-training": [
    "All staff trained on evacuation, extinguisher use and responsibilities. Register signed.",
    "Refresher session for 4 staff. New starter trained separately.",
  ],
};

function noteFor(item: CheckItem, rand: () => number): string {
  const pool = NOTES[item.key];
  if (!pool) return "Checked, nothing to report.";
  return pool[Math.floor(rand() * pool.length)];
}

function defaultLastDone(item: CheckItem): number {
  const period = FREQUENCIES[item.frequency].days;
  // Most items are recently done; daily ones a few hours to a day back.
  if (item.frequency === "daily") return 0;
  return Math.round(period * 0.35);
}

function isoAt(daysAgo: number, hour: number, minute: number): string {  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * Guarantees the demo firm has a user and membership, so the sample data can be
 * signed into. Runs on every boot; safe to repeat.
 */
export function ensureDemoAccount(db: DatabaseSync): void {
  const firm = db
    .prepare("SELECT id FROM firms WHERE subscription_status = 'demo' LIMIT 1")
    .get() as { id: string } | undefined;
  if (!firm) return;

  const now = new Date().toISOString();
  const email = "anya@marshvale.example";

  let user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
    | { id: string }
    | undefined;

  if (!user) {
    const id = "user-demo";
    db.prepare(
      "INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)",
    ).run(id, email, "Anya Patel", now);
    user = { id };
  }

  const membership = db
    .prepare("SELECT id FROM memberships WHERE user_id = ? AND firm_id = ?")
    .get(user.id, firm.id);

  if (!membership) {
    db.prepare(
      "INSERT INTO memberships (id, user_id, firm_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)",
    ).run(`membership-demo-${firm.id}`, user.id, firm.id, now);
  }
}

export function seedIfEmpty(db: DatabaseSync): void {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM sites")
    .get() as { n: number };
  if (row.n > 0) return;

  const now = new Date().toISOString();
  const firmId = "firm-marshvale";

  db.prepare(
    "INSERT INTO firms (id, name, created_at, subscription_status) VALUES (?, ?, ?, 'demo')",
  ).run(firmId, "Marsh & Vale Property", now);

  ensureDemoAccount(db);

  const insertSite = db.prepare(
    `INSERT INTO sites (id, firm_id, name, address, postcode, responsible_person, responsible_email, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertCheck = db.prepare(
    `INSERT INTO checks (id, site_id, item_key, performed_at, performed_by, result, note, photo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  );

  SITES.forEach((site, siteIndex) => {
    insertSite.run(
      site.id,
      firmId,
      site.name,
      site.address,
      site.postcode,
      site.responsiblePerson,
      site.responsibleEmail,
      now,
    );

    const rand = mulberry32(9001 + siteIndex * 137);

    for (const item of CHECKLIST) {
      const period = FREQUENCIES[item.frequency].days;
      const lastAgo = site.lastDone[item.key] ?? defaultLastDone(item);
      const horizon = 400;

      let ago = lastAgo;
      let first = true;

      while (ago <= horizon) {
        // Daily checks run on a strict calendar; everything else drifts a little.
        if (item.frequency === "daily" && ago > 3 && rand() < site.skipRate) {
          ago += 1;
          first = false;
          continue;
        }

        const isFail =
          site.recentFail &&
          site.recentFail.key === item.key &&
          first &&
          Math.abs(ago - site.recentFail.ago) < 0.5;

        const hour =
          item.frequency === "daily" ? 7 + Math.floor(rand() * 3) : 8 + Math.floor(rand() * 8);
        const minute = Math.floor(rand() * 60);

        insertCheck.run(
          randomUUID(),
          site.id,
          item.key,
          isoAt(ago, hour, minute),
          site.checkers[Math.floor(rand() * site.checkers.length)],
          isFail ? "fail" : "pass",
          isFail ? site.recentFail!.note : noteFor(item, rand),
          now,
        );

        // A little irregularity, the way real logbooks look.
        if (item.frequency === "daily") {
          ago += 1;
        } else {
          const jitter = 0.9 + rand() * 0.35;
          ago += Math.max(1, period * jitter);
        }
        first = false;
      }
    }
  });

  const insertAction = db.prepare(
    `INSERT INTO actions (id, site_id, check_id, title, detail, due_date, status, created_at, closed_at, closed_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  insertAction.run(
    "action-door",
    "site-harbour",
    null,
    "Rear office fire door does not self-close",
    "Door closes to within 40mm and stops — likely a failed closer arm. Door kept shut and the room taken out of use. Contractor booked.",
    new Date(Date.now() + 2 * DAY).toISOString(),
    "open",
    new Date(Date.now() - 9 * DAY).toISOString(),
    null,
    null,
  );

  insertAction.run(
    "action-fra",
    "site-kingsdown",
    null,
    "Fire risk assessment overdue — book assessor",
    "Last assessment is more than 12 months old. Insurer has asked for a current copy.",
    new Date(Date.now() - 6 * DAY).toISOString(),
    "open",
    new Date(Date.now() - 40 * DAY).toISOString(),
    null,
    null,
  );

  insertAction.run(
    "action-blocked",
    "site-cafe",
    null,
    "Extinguisher at the servery blocked by a fridge",
    "Fridge had been pushed across the extinguisher. Moved back and the area was marked out.",
    new Date(Date.now() - 24 * DAY).toISOString(),
    "closed",
    new Date(Date.now() - 31 * DAY).toISOString(),
    new Date(Date.now() - 20 * DAY).toISOString(),
    "Fridge relocated, floor marking added, staff briefed.",
  );
}
