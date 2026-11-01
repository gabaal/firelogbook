export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "annual";

export interface CheckItem {
  key: string;
  title: string;
  /** Short instruction shown on the recording screen. */
  guidance: string;
  frequency: Frequency;
  /** The standard or duty this check supports. Shown as a small footnote. */
  ref: string;
}

export const FREQUENCIES: Record<
  Frequency,
  { label: string; short: string; days: number }
> = {
  daily: { label: "Daily", short: "Daily", days: 1 },
  weekly: { label: "Weekly", short: "Weekly", days: 7 },
  monthly: { label: "Monthly", short: "Monthly", days: 30 },
  quarterly: { label: "Quarterly", short: "Quarterly", days: 91 },
  annual: { label: "Annual", short: "Annual", days: 365 },
};

/**
 * The default logbook. Deliberately fixed rather than a template builder:
 * v1 sells one document, not a platform.
 */
export const CHECKLIST: CheckItem[] = [
  {
    key: "exit-doors",
    title: "Final exit doors open freely",
    guidance:
      "Every final exit door must open from the inside without a key, and the route to it must be clear. Check the door, the hardware and the route.",
    frequency: "daily",
    ref: "RR(FS)O 2005, art. 14",
  },
  {
    key: "alarm-panel",
    title: "Fire alarm panel shows normal",
    guidance:
      "No fault, disablement, or power-supply warning lights. If the panel is showing a fault, record it here and raise an action.",
    frequency: "daily",
    ref: "BS 5839-1",
  },
  {
    key: "call-point",
    title: "Fire alarm call point test",
    guidance:
      "Test one call point on a rotating basis using the test key. Confirm the alarm sounds throughout the building and silence within 3 minutes. Note which call point you used.",
    frequency: "weekly",
    ref: "BS 5839-1",
  },
  {
    key: "emergency-lighting-flick",
    title: "Emergency lighting function test",
    guidance:
      "Press the test button on each emergency light. Every lamp should illuminate and stay lit for the duration of the test.",
    frequency: "weekly",
    ref: "BS 5266-1",
  },
  {
    key: "extinguishers-visual",
    title: "Fire extinguisher visual check",
    guidance:
      "For each extinguisher: in its designated place, unobstructed, pin and tamper seal intact, pressure gauge in the green, no corrosion or damage, sign still legible.",
    frequency: "monthly",
    ref: "BS 5306-8",
  },
  {
    key: "fire-doors",
    title: "Fire door inspection",
    guidance:
      "Doors close fully from their own weight and latch. Intumescent strips and smoke seals intact. No wedges, no propped doors, no damage. Gap under the door no more than 8mm.",
    frequency: "monthly",
    ref: "RR(FS)O 2005, art. 17",
  },
  {
    key: "escape-routes",
    title: "Escape routes and stairs clear",
    guidance:
      "Corridors, stairs and exit routes free of storage, bins, furniture and obstructions. Self-closing doors not held open. Exit signage visible and lit.",
    frequency: "monthly",
    ref: "RR(FS)O 2005, art. 14",
  },
  {
    key: "emergency-lighting-duration",
    title: "Emergency lighting duration test",
    guidance:
      "Isolate the normal supply and confirm every emergency light remains lit for one hour. Record any fitting that fails or dims early.",
    frequency: "monthly",
    ref: "BS 5266-1",
  },
  {
    key: "drill",
    title: "Fire drill / evacuation exercise",
    guidance:
      "Run a full evacuation, time it, and record who took part and any problems found. Vary the route and the assumed location of the fire.",
    frequency: "quarterly",
    ref: "RR(FS)O 2005, art. 15",
  },
  {
    key: "fra-review",
    title: "Fire risk assessment review",
    guidance:
      "Review the assessment and record any significant changes to the premises, the people using it, or the activities carried out. Book a fresh assessment if it is out of date.",
    frequency: "annual",
    ref: "RR(FS)O 2005, art. 9",
  },
  {
    key: "alarm-service",
    title: "Fire alarm system service",
    guidance:
      "Competent person service of the detection and alarm system. Record the engineer, the company and the certificate reference.",
    frequency: "annual",
    ref: "BS 5839-1",
  },
  {
    key: "extinguisher-service",
    title: "Fire extinguisher service",
    guidance:
      "Competent person basic service of all extinguishers. Extended service is due every five years. Keep the certificate with this logbook.",
    frequency: "annual",
    ref: "BS 5306-8",
  },
  {
    key: "staff-training",
    title: "Staff fire safety training",
    guidance:
      "All staff trained on evacuation, the location and use of extinguishers, and their own responsibilities. Record names and the date.",
    frequency: "annual",
    ref: "RR(FS)O 2005, art. 21",
  },
];

export const ITEMS_BY_KEY: Record<string, CheckItem> = Object.fromEntries(
  CHECKLIST.map((i) => [i.key, i]),
);

export const RESULT_LABELS: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  na: "Not applicable",
};

export const DISCLAIMER =
  "This logbook records the checks that were carried out. It is not a fire risk assessment, and keeping it does not by itself make the premises compliant. The responsible person remains responsible for fire safety.";
