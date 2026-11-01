import { FREQUENCIES, type CheckItem } from "./checklist";
import { actionsForSite, latestCheckPerItem, getSite, getChecklistForSite } from "./data";
import type { CheckRow } from "./db";

export const DAY_MS = 86_400_000;

export type ItemState = "ok" | "due" | "overdue" | "never";

export interface ItemStatus {
  item: CheckItem;
  last: CheckRow | null;
  state: ItemState;
  /** Negative when the check is still within its interval. */
  daysUntilDue: number;
  /** Whole days late. Zero unless overdue. */
  overdueDays: number;
  /** 0–1, how far through the interval we are. */
  elapsed: number;
}

export function statusForItem(
  item: CheckItem,
  last: CheckRow | null,
  siteWorkingDays: string,
  now = Date.now(),
): ItemStatus {
  const freq = item.frequency;
  const workingDays = siteWorkingDays.split(",").map(Number);
  const numWorkingDays = workingDays.length;

  let period = FREQUENCIES[freq].days;

  if (freq === "daily") {
    // For daily checks, the required count per week is the number of working days.
    // We scale the 30-day monthly period by (workingDays / 7).
    period = Math.round(30 * (numWorkingDays / 7));
  }

  if (!last) {
    return {
      item,
      last: null,
      state: "never",
      daysUntilDue: -period,
      overdueDays: 0,
      elapsed: 1,
    };
  }

  const daysSince = (now - new Date(last.performed_at).getTime()) / DAY_MS;
  const daysUntilDue = Math.round((period - daysSince) * 10) / 10;

  if (daysSince > period) {
    return {
      item,
      last,
      state: "overdue",
      daysUntilDue,
      overdueDays: Math.max(1, Math.floor(daysSince - period)),
      elapsed: Math.min(1.5, daysSince / period),
    };
  }

  return {
    item,
    last,
    state: daysSince >= period * 0.85 ? "due" : "ok",
    daysUntilDue,
    overdueDays: 0,
    elapsed: daysSince / period,
  };
}

export function itemStatuses(siteId: string, now = Date.now()): ItemStatus[] {
  const site = getSite(null as any, siteId); // Simplified lookup for this context
  const workingDays = site?.working_days ?? "1,2,3,4,5";
  const latest = latestCheckPerItem(siteId);
  const checklist = getChecklistForSite(siteId);
  return checklist.map((item) =>
    statusForItem(item as CheckItem, latest.get(item.key) ?? null, workingDays, now),
  );
}

const STATE_RANK: Record<ItemState, number> = {
  overdue: 0,
  never: 1,
  due: 2,
  ok: 3,
};

export function sortByUrgency(items: ItemStatus[]): ItemStatus[] {
  return [...items].sort(
    (a, b) =>
      STATE_RANK[a.state] - STATE_RANK[b.state] ||
      a.daysUntilDue - b.daysUntilDue,
  );
}

export type Health = "green" | "amber" | "red";

export interface SiteSummary {
  siteId: string;
  health: Health;
  overdue: number;
  due: number;
  never: number;
  ok: number;
  openActions: number;
  overdueActions: number;
  /** Human label for the thing that matters most right now. */
  headline: string;
}

export function summarise(
  siteId: string,
  statuses: ItemStatus[],
  now = Date.now(),
): SiteSummary {
  const overdue = statuses.filter((s) => s.state === "overdue").length;
  const never = statuses.filter((s) => s.state === "never").length;
  const due = statuses.filter((s) => s.state === "due").length;
  const ok = statuses.filter((s) => s.state === "ok").length;

  const actions = actionsForSite(siteId).filter((a) => a.status === "open");
  const overdueActions = actions.filter(
    (a) => a.due_date && new Date(a.due_date).getTime() < now,
  ).length;

  let health: Health = "green";
  if (overdue > 0 || never > 0 || overdueActions > 0) health = "red";
  else if (due > 0 || actions.length > 0) health = "amber";

  const headline =
    overdue > 0 && never > 0
      ? `${overdue} overdue · ${never} never recorded`
      : overdue > 0
        ? `${overdue} check${overdue === 1 ? "" : "s"} overdue`
        : never > 0
          ? `${never} check${never === 1 ? "" : "s"} never recorded`
          : overdueActions > 0
            ? `${overdueActions} action${overdueActions === 1 ? "" : "s"} past due`
            : due > 0
              ? `${due} check${due === 1 ? "" : "s"} due now`
              : actions.length > 0
                ? `${actions.length} open action${actions.length === 1 ? "" : "s"}`
                : "All up to date";

  return {
    siteId,
    health,
    overdue,
    due,
    never,
    ok,
    openActions: actions.length,
    overdueActions,
    headline,
  };
}

export function summaryFor(siteId: string, now = Date.now()): SiteSummary {
  return summarise(siteId, itemStatuses(siteId, now), now);
}
