// Events Overview logic: how listings are grouped, filtered, sorted and
// summarised. Pure (no React), so it can be tested with plain `node`.

import { formatClock } from "./week";
import { eventPeriod } from "./weekPlan";

export type EventLike = {
  eventId: string;
  name: string;
  venue: string;
  eventClass: string;
  date: string; // "2026-10-01"
  time: string | null; // "19:30", Detroit local; null = no start time listed
  distanceMiles: number | null;
  proximity: number; // 1 (<= 0.6 mi) or 0.5 (<= 1.5 mi) — the backend's locked tiers
};

// ---- Estimated influence ------------------------------------------------------

export type Influence = "High" | "Moderate" | "Low";

/**
 * Customer-facing wording for the backend's proximity tier. It reflects how
 * close the event is to the centre of the operator's zone only — not the size
 * of the event — so it is called "estimated influence", never a demand number.
 */
export function influenceOf(proximity: number): Influence {
  if (proximity >= 1) return "High";
  if (proximity >= 0.5) return "Moderate";
  return "Low";
}

const INFLUENCE_RANK: Record<Influence, number> = { High: 3, Moderate: 2, Low: 1 };

/** The biggest kinds of event first — breaks ties between equally close events. */
const CLASS_RANK: Record<string, number> = {
  "Major stadium game": 0,
  "Concert / large show": 1,
  "Festival day": 2,
  "Minor event": 3,
};

export const EVENT_TYPES = ["Major stadium game", "Concert / large show", "Festival day", "Minor event"] as const;

/** Venues across the Detroit–Windsor border: travel there can take far longer than the distance suggests. */
export function isCrossBorder(venue: string): boolean {
  return /windsor/i.test(venue);
}

// ---- Related listings ---------------------------------------------------------

export type EventGroup<T extends EventLike> = T & { related: T[] };

// Words that mark a ticket package / add-on rather than the event itself.
const PACKAGE = /\b(suite|package|hotel|vip|parking|rental|upgrade|premium|experience)\b/i;

/**
 * Ticket + hotel packages, suite rentals and the like are listed separately
 * from the show they belong to, with the same venue and start time. Show one
 * row per (date, venue, start time) and list the rest as related listings.
 * Events without a start time are never merged (Huntington Place lists many
 * unrelated all-day events). Display only: the forecast itself is unchanged.
 */
export function groupListings<T extends EventLike>(events: T[]): EventGroup<T>[] {
  const out: EventGroup<T>[] = [];
  const byKey = new Map<string, T[]>();
  for (const e of events) {
    if (!e.time) {
      out.push({ ...e, related: [] });
      continue;
    }
    const key = `${e.date}|${e.venue}|${e.time}`;
    byKey.set(key, [...(byKey.get(key) ?? []), e]);
  }
  for (const list of byKey.values()) {
    // The show itself: not a package, and the shortest title.
    const ranked = [...list].sort(
      (a, b) => Number(PACKAGE.test(a.name)) - Number(PACKAGE.test(b.name)) || a.name.length - b.name.length,
    );
    const [primary, ...related] = ranked;
    out.push({ ...primary, related });
  }
  return out;
}

// ---- Filtering and sorting ------------------------------------------------------

export type Filters = { search: string; type: string; venue: string; maxMiles: string };
export const NO_FILTERS: Filters = { search: "", type: "", venue: "", maxMiles: "" };

export function activeFilterCount(f: Filters): number {
  return [f.search.trim(), f.type, f.venue, f.maxMiles].filter(Boolean).length;
}

export function filterEvents<T extends EventLike>(events: T[], f: Filters): T[] {
  const q = f.search.trim().toLowerCase();
  const max = f.maxMiles ? Number(f.maxMiles) : null;
  return events.filter(
    (e) =>
      (!q || `${e.name} ${e.venue} ${e.eventClass}`.toLowerCase().includes(q)) &&
      (!f.type || e.eventClass === f.type) &&
      (!f.venue || e.venue === f.venue) &&
      (max === null || (e.distanceMiles !== null && e.distanceMiles <= max)),
  );
}

export type SortKey = "time" | "distance" | "influence";

const startOf = (e: EventLike) => `${e.date} ${e.time ?? "00:00"}`;

export function sortEvents<T extends EventLike>(events: T[], key: SortKey): T[] {
  const byTime = (a: T, b: T) => startOf(a).localeCompare(startOf(b)) || a.name.localeCompare(b.name);
  const dist = (e: T) => e.distanceMiles ?? Infinity;
  return [...events].sort((a, b) => {
    if (key === "distance") return dist(a) - dist(b) || byTime(a, b);
    if (key === "influence") {
      return INFLUENCE_RANK[influenceOf(b.proximity)] - INFLUENCE_RANK[influenceOf(a.proximity)] || byTime(a, b);
    }
    return byTime(a, b);
  });
}

/** The most relevant events: closest first, then the biggest kind of event, then earliest. */
export function rankEvents<T extends EventLike>(events: T[]): T[] {
  return [...events].sort(
    (a, b) =>
      INFLUENCE_RANK[influenceOf(b.proximity)] - INFLUENCE_RANK[influenceOf(a.proximity)] ||
      (CLASS_RANK[a.eventClass] ?? 9) - (CLASS_RANK[b.eventClass] ?? 9) ||
      startOf(a).localeCompare(startOf(b)),
  );
}

/** Ids of the key events (top 3), or none when there are too few for "key" to mean anything. */
export function keyEventIds<T extends EventLike>(events: T[]): Set<string> {
  if (events.length < 2) return new Set();
  return new Set(rankEvents(events).slice(0, 3).map((e) => e.eventId));
}

// ---- Summary ------------------------------------------------------------------

export function weekdayName(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

const PERIOD_ORDER = ["Morning", "Midday", "Dinner", "Late night"];

/**
 * Two or three plain sentences about the selected day (or the rest of the
 * week), built from the same event list the table shows — so the two can't
 * disagree. Wording stays hedged ("may"): an event's effect is an estimate.
 */
export function buildSummary(args: {
  events: EventLike[]; // grouped, unfiltered, for the scope
  label: string; // "Thursday" or "the rest of this week"
  range: boolean;
  earlier: boolean; // an earlier day: events aren't kept
}): string {
  const { events, label, range, earlier } = args;
  if (earlier) return "Event data isn't kept for earlier days.";
  if (events.length === 0) return `No nearby events are listed for ${label}.`;

  const n = events.length;
  const noun = n === 1 ? "event is" : "events are";
  let first: string;
  if (range) {
    const perDay = new Map<string, number>();
    for (const e of events) perDay.set(e.date, (perDay.get(e.date) ?? 0) + 1);
    const [day, count] = [...perDay.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    first = `${n} nearby ${noun} listed for ${label}, with the most on ${weekdayName(day)} (${count}).`;
  } else {
    const counts = new Map<string, number>();
    for (const e of events) {
      const p = eventPeriod(e.time);
      if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || PERIOD_ORDER.indexOf(a[0]) - PERIOD_ORDER.indexOf(b[0]),
    )[0]?.[0];
    const where =
      !top ? "" : top === "All day" ? ", running all day" : n > 1 ? `, mostly in the ${top.toLowerCase()}` : ` in the ${top.toLowerCase()}`;
    first = `${n} nearby ${noun} listed for ${label}${where}.`;
  }

  const [a, b] = rankEvents(events);
  const where = [a.venue, a.time ? formatClock(a.time) : ""].filter(Boolean).join(", ");
  const second = `Most relevant: ${a.name}${where ? ` (${where})` : ""}${b ? `, and ${b.name}` : ""}.`;
  const third = "They may increase demand around the same time; open an event to see its estimated effect.";
  return `${first} ${second} ${third}`;
}
