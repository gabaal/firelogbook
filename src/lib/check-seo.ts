import type { Frequency } from "./checklist";

/**
 * Long-form copy for the public /checks/[key] landing pages. Kept beside the
 * checklist so the recording screen and the SEO page cannot drift apart.
 */
export const CHECK_SEO: Record<string, { why: string; record: string[] }> = {
  "exit-doors": {
    why: "A final exit that needs a key, or a route blocked by stock, turns a small fire into a trapped building. It is one of the first things a fire officer checks, and it takes seconds to get right.",
    record: [
      "That the door opens from the inside without a key",
      "That the route to the exit is clear",
      "Any fault found, and who was told about it",
    ],
  },
  "alarm-panel": {
    why: "The panel is the building's early warning. A fault or disablement left unrecorded can mean a detector will not work when it matters, and an inspector will ask to see the panel history.",
    record: [
      "Whether the panel shows normal, fault or disabled",
      "The zone or device named on the panel",
      "The time a fault was reported and to whom",
    ],
  },
  "call-point": {
    why: "Testing one call point each week proves the alarm still sounds across the whole building, not just at the panel. Rotating the point also proves each manual call point works.",
    record: [
      "Which call point was used",
      "That the alarm was audible throughout the premises",
      "That it was silenced within three minutes",
    ],
  },
  "emergency-lighting-flick": {
    why: "Emergency lights only matter when the power fails. A weekly function test catches a failed lamp long before anyone needs it to find an exit.",
    record: [
      "Each fitting checked",
      "Any lamp that did not light",
      "A follow-up action for every failure",
    ],
  },
  "extinguishers-visual": {
    why: "A missing pin, a broken seal or a gauge in the red is an extinguisher that will not work. The monthly visual check is quick and catches most of the common failures.",
    record: [
      "That each extinguisher is in its designated place and accessible",
      "Pin, tamper seal and pressure gauge",
      "Any damage, corrosion or missing signage",
    ],
  },
  "fire-doors": {
    why: "A wedged or damaged fire door lets smoke into an escape route. A door that closes but leaves a wide gap, or has lost its seals, is not doing its job either.",
    record: [
      "That the door closes and latches from its own weight",
      "That intumescent strips and smoke seals are intact",
      "The gap under the door, which should be no more than 8mm",
    ],
  },
  "escape-routes": {
    why: "Escape routes fill with stock quietly. A monthly walk keeps corridors, stairs and exits clear and proves that someone is actually looking.",
    record: [
      "The route walked and that it was clear",
      "That exit signage was visible and lit",
      "Anything that had to be moved or removed",
    ],
  },
  "emergency-lighting-duration": {
    why: "The short weekly test proves a lamp lights; the duration test proves it will still be lit while people are finding their way out. A fitting that dims early is a failed fitting.",
    record: [
      "That the normal supply was isolated",
      "That every fitting stayed lit for the full period",
      "Any fitting that failed or dimmed early",
    ],
  },
  drill: {
    why: "A drill tests the plan and the people, not the paperwork. Varying the route and the assumed location of the fire stops it becoming a routine walk to the car park.",
    record: [
      "Date, time and how long the evacuation took",
      "Who took part, including visitors and contractors",
      "Problems found and the changes made as a result",
    ],
  },
  "fra-review": {
    why: "The fire risk assessment is the foundation of every other check. It has to be reviewed when the premises, the people using them or the work carried out changes significantly.",
    record: [
      "What has changed since the last review",
      "Any significant findings and the action taken",
      "Who reviewed it, and when the next review is due",
    ],
  },
  "alarm-service": {
    why: "A competent person's service keeps detection and sounders within the standard. The certificate is the evidence an insurer or fire officer will ask for.",
    record: [
      "The engineer and company who attended",
      "The certificate or report reference",
      "Any faults found and recommendations made",
    ],
  },
  "extinguisher-service": {
    why: "Extinguishers need a competent person's basic service each year, with an extended service every five years. The certificate belongs with the logbook, not in a drawer.",
    record: [
      "The engineer and company who attended",
      "The certificate reference",
      "Which extinguishers were serviced, replaced or condemned",
    ],
  },
  "staff-training": {
    why: "Staff need to know how to evacuate, where the extinguishers are and what their own responsibilities are. Training is a legal duty, not an induction afterthought.",
    record: [
      "The names of everyone trained",
      "The date, trainer and refresher date",
      "The topics covered, including extinguisher use",
    ],
  },
};

/** One line of context for the frequency shown on a landing page. */
export const FREQUENCY_NOTE: Record<Frequency, string> = {
  daily: "Every working day, before the building is in use.",
  weekly: "Once a week; rotate call points so each is tested in turn.",
  monthly: "Once a calendar month.",
  quarterly: "Every three months.",
  annual: "At least once a year, by a competent person where the standard requires it.",
};
