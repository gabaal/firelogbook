import { CHECKLIST, FREQUENCIES, type CheckItem } from "./checklist";
import { ensureSchema, getDb } from "./db";
import * as schema from "./schema";
import { asc, eq } from "drizzle-orm";

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

function dateAt(daysAgo: number, hour: number, minute: number): Date {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const DEMO_FIRM_ID = "firm-marshvale";
const DEMO_EMAIL = "anya@marshvale.example";

let seeding: Promise<void> | null = null;

/**
 * Creates the demo firm, its user and the sample logbooks if they are missing.
 * Idempotent and safe to call on every demo sign-in; the work happens once per
 * process, and every insert tolerates a concurrent caller.
 */
export function ensureDemoSeed(): Promise<void> {
  if (!seeding) {
    seeding = seedDemo().catch((error) => {
      seeding = null;
      throw error;
    });
  }
  return seeding;
}

async function seedDemo(): Promise<void> {
  await ensureSchema();
  const db = getDb();
  const now = new Date();

  const firm = await db.query.firms.findFirst({
    where: eq(schema.firms.id, DEMO_FIRM_ID),
  });
  if (!firm) {
    await db
      .insert(schema.firms)
      .values({
        id: DEMO_FIRM_ID,
        name: "Marsh & Vale Property",
        created_at: now,
        subscription_status: "demo",
      })
      .onConflictDoNothing();
  }

  let user = await db.query.users.findFirst({
    where: eq(schema.users.email, DEMO_EMAIL),
  });
  if (!user) {
    await db
      .insert(schema.users)
      .values({
        id: "user-demo",
        email: DEMO_EMAIL,
        name: "Anya Patel",
        created_at: now,
      })
      .onConflictDoNothing();
    user = await db.query.users.findFirst({
      where: eq(schema.users.email, DEMO_EMAIL),
    });
  }
  if (!user) throw new Error("Could not create the demo user");

  const membership = await db.query.memberships.findFirst({
    where: eq(schema.memberships.user_id, user.id),
  });
  if (!membership) {
    await db
      .insert(schema.memberships)
      .values({
        id: `membership-demo-${DEMO_FIRM_ID}`,
        user_id: user.id,
        firm_id: DEMO_FIRM_ID,
        role: "owner",
        created_at: now,
      })
      .onConflictDoNothing();
  }

  const existingSite = await db.query.sites.findFirst({
    where: eq(schema.sites.firm_id, DEMO_FIRM_ID),
  });
  if (existingSite) {
    // The demo history goes back ~400 days. If the site row was created "now"
    // (older seeding code), the default one-year audit range hides that history.
    const demoSites = await db.query.sites.findMany({
      where: eq(schema.sites.firm_id, DEMO_FIRM_ID),
    });
    for (const site of demoSites) {
      const oldest = await db.query.checks.findFirst({
        where: eq(schema.checks.site_id, site.id),
        orderBy: [asc(schema.checks.performed_at)],
      });
      if (
        oldest &&
        new Date(site.created_at).getTime() > oldest.performed_at.getTime()
      ) {
        await db
          .update(schema.sites)
          .set({ created_at: oldest.performed_at })
          .where(eq(schema.sites.id, site.id));
      }
    }
    return;
  }

  for (const site of SITES) {
    await db
      .insert(schema.sites)
      .values({
        id: site.id,
        firm_id: DEMO_FIRM_ID,
        name: site.name,
        address: site.address,
        postcode: site.postcode,
        responsible_person: site.responsiblePerson,
        responsible_email: site.responsibleEmail,
        remind_opt_out: 0,
        working_days: "1,2,3,4,5",
        // The sample checks span ~400 days, so the site's history starts then.
        created_at: new Date(Date.now() - 400 * DAY),
      })
      .onConflictDoNothing();
  }

  const checks: (typeof schema.checks.$inferInsert)[] = [];

  SITES.forEach((site, siteIndex) => {
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
        const performedAt = dateAt(ago, hour, minute);

        checks.push({
          // Deterministic id, so a concurrent seed cannot duplicate rows.
          id: `check-${site.id}-${item.key}-${performedAt.getTime()}`,
          site_id: site.id,
          item_key: item.key,
          performed_at: performedAt,
          performed_by: site.checkers[Math.floor(rand() * site.checkers.length)],
          result: isFail ? "fail" : "pass",
          note: isFail ? site.recentFail!.note : noteFor(item, rand),
          photo: null,
          created_at: now,
        });

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

  // Keep each statement well below Neon's parameter limit.
  for (let i = 0; i < checks.length; i += 500) {
    await db
      .insert(schema.checks)
      .values(checks.slice(i, i + 500))
      .onConflictDoNothing();
  }

  await db
    .insert(schema.actions)
    .values([
      {
        id: "action-door",
        site_id: "site-harbour",
        check_id: null,
        title: "Rear office fire door does not self-close",
        detail:
          "Door closes to within 40mm and stops — likely a failed closer arm. Door kept shut and the room taken out of use. Contractor booked.",
        due_date: new Date(Date.now() + 2 * DAY),
        status: "open",
        created_at: new Date(Date.now() - 9 * DAY),
        closed_at: null,
        closed_note: null,
      },
      {
        id: "action-fra",
        site_id: "site-kingsdown",
        check_id: null,
        title: "Fire risk assessment overdue — book assessor",
        detail:
          "Last assessment is more than 12 months old. Insurer has asked for a current copy.",
        due_date: new Date(Date.now() - 6 * DAY),
        status: "open",
        created_at: new Date(Date.now() - 40 * DAY),
        closed_at: null,
        closed_note: null,
      },
      {
        id: "action-blocked",
        site_id: "site-cafe",
        check_id: null,
        title: "Extinguisher at the servery blocked by a fridge",
        detail:
          "Fridge had been pushed across the extinguisher. Moved back and the area was marked out.",
        due_date: new Date(Date.now() - 24 * DAY),
        status: "closed",
        created_at: new Date(Date.now() - 31 * DAY),
        closed_at: new Date(Date.now() - 20 * DAY),
        closed_note: "Fridge relocated, floor marking added, staff briefed.",
      },
    ])
    .onConflictDoNothing();
}
