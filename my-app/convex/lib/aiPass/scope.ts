// Which zone / restaurant type / day an AI Pass answer is about.
//
// The chat thread stores a pinned scope (starts as the operator's own zone and
// concept, edited with the "Add context" chips) and a "focus" that follows the
// conversation when a question names something else ("what about Midtown?").
// The model never decides the scope on its own: tools only accept a zone or
// concept that is already in scope or named in the user's current message
// (resolveScopeArg), otherwise the thread's scope wins.

import {
  ZONES,
  CONCEPTS,
  DAYS,
  currentWeekDates,
  detroitDate,
  keepKnown,
  type Zone,
  type Concept,
} from "../vocab";

// ---------------------------------------------------------------------------
// Matching names in free text
// ---------------------------------------------------------------------------

/** Lower-case, letters and digits only, single spaces: "Greektown!" -> "greektown". */
export function normalizeText(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

// What people actually type for each zone. The full name always matches too.
const ZONE_ALIASES: Record<Zone, string[]> = {
  "Core City / Woodbridge": ["core city", "woodbridge", "wood bridge"],
  Corktown: ["corktown", "cork town"],
  "Downtown Detroit (Core)": ["downtown detroit", "downtown", "downtown core", "detroit downtown"],
  "Eastern Market": ["eastern market", "east market"],
  "Financial District": ["financial district"],
  "Foxtown / Stadium District": ["foxtown", "fox town", "stadium district", "stadium area"],
  "Greektown / Casino District": ["greektown", "greek town", "casino district", "casino area"],
  Mexicantown: ["mexicantown", "mexican town"],
  Midtown: ["midtown", "mid town"],
  "New Center / North End": ["new center", "new centre", "north end"],
  "Riverfront / RiverWalk": ["riverfront", "riverwalk", "river walk", "river front"],
  "Southwest Detroit": ["southwest detroit", "southwest", "south west"],
  "Woodward Core": ["woodward core", "woodward", "woodward avenue"],
};

// Multi-word on purpose where a bare word is ambiguous ("casual" alone matches three types).
const CONCEPT_ALIASES: Record<Concept, string[]> = {
  "Breakfast / Brunch Cafe": ["breakfast", "brunch", "breakfast cafe", "brunch cafe", "breakfast spot"],
  "Casual Dining": ["casual dining", "casual restaurant"],
  "Cocktail Lounge": ["cocktail lounge", "cocktail bar", "cocktails", "lounge"],
  "Coffee Shop": ["coffee shop", "coffee", "coffeeshop", "coffee house"],
  "Fast Casual": ["fast casual", "fast food"],
  "Fine Dining": ["fine dining", "fancy restaurant"],
  "Neighborhood / Casual Bar": ["neighborhood bar", "casual bar", "neighborhood casual bar", "neighborhood"],
  "Sports Bar": ["sports bar", "sportsbar"],
  "Upscale Casual": ["upscale casual", "upscale"],
};

function namedIn<T extends string>(text: string, all: readonly T[], aliases: Record<T, string[]>): T[] {
  const hay = normalizeText(text);
  const found: T[] = [];
  for (const value of all) {
    const names = [normalizeText(value), ...aliases[value].map(normalizeText)];
    // Whole-word / whole-phrase match: " midtown " inside " about midtown friday ".
    // A plural counts too ("sports bars").
    if (names.some((n) => hay.includes(n) || hay.includes(`${n.slice(0, -1)}s `))) found.push(value);
  }
  return found;
}

export const zonesNamedIn = (text: string): Zone[] => namedIn(text, ZONES, ZONE_ALIASES);
export const conceptsNamedIn = (text: string): Concept[] => namedIn(text, CONCEPTS, CONCEPT_ALIASES);

// ---------------------------------------------------------------------------
// Names that are almost right
// ---------------------------------------------------------------------------

export type NearMiss = { heard: string; value: string; kind: "zone" | "concept" };

/** Edit distance, for spotting typos. */
function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length];
}

const compact = (s: string) => normalizeText(s).replace(/ /g, "");

/**
 * Words in the message that look like a zone or restaurant type but are not one:
 * a typo ("midtwn"), a cut-off name ("greek") or a split one. These must be
 * confirmed with the person, never assumed. A name that already matches
 * exactly is not a near miss.
 */
export function nearMisses(text: string): NearMiss[] {
  const words = normalizeText(text).trim().split(" ").filter(Boolean);
  const already = new Set<string>([...zonesNamedIn(text), ...conceptsNamedIn(text)]);
  const targets = [
    ...ZONES.map((value) => ({ value, kind: "zone" as const, forms: [value, ...ZONE_ALIASES[value]] })),
    ...CONCEPTS.map((value) => ({ value, kind: "concept" as const, forms: [value, ...CONCEPT_ALIASES[value]] })),
  ].map((t) => ({ ...t, forms: t.forms.map(compact).filter((f) => f.length >= 5) }));
  const exact = new Set(targets.flatMap((t) => t.forms));

  const found = new Map<string, NearMiss>();
  for (let size = 1; size <= 3; size++) {
    for (let i = 0; i + size <= words.length; i++) {
      const heard = words.slice(i, i + size).join(" ");
      const gram = words.slice(i, i + size).join("");
      if (gram.length < 5 || exact.has(gram) || exact.has(gram.replace(/s$/, ""))) continue;
      for (const t of targets) {
        if (already.has(t.value) || found.has(t.value)) continue;
        const close = t.forms.some(
          (f) =>
            (f.startsWith(gram) && f.length - gram.length <= 6) || // cut off: "greek", "mexican"
            distance(gram, f) <= (gram.length <= 7 ? 1 : 2), // a typo
        );
        if (close) found.set(t.value, { heard, value: t.value, kind: t.kind });
      }
    }
  }
  return [...found.values()];
}

// ---------------------------------------------------------------------------
// The thread's scope
// ---------------------------------------------------------------------------

export type ThreadScopeFields = {
  zone: string;
  concept: string;
  date: string | null;
  focusZone?: string;
  focusConcept?: string;
};

export type EffectiveScope = { zone: Zone; concept: Concept; date: string };

/** The week as the tabs see it, plus today, for the prompt and the date enum. */
export function weekCalendar(now: Date = new Date()) {
  const dates = currentWeekDates(now);
  const days = DAYS.map((day) => ({ day, date: dates[day] }));
  return { today: detroitDate(now), days };
}

/** Pinned date if it's still inside this week, otherwise today. */
export function effectiveDate(date: string | null, now: Date = new Date()): string {
  const { today, days } = weekCalendar(now);
  return date && days.some((d) => d.date === date) ? date : today;
}

/** focus (set by a question) > pinned (chips / operator default). */
export function effectiveScope(t: ThreadScopeFields, now: Date = new Date()): EffectiveScope | null {
  const [zone] = keepKnown([t.focusZone ?? t.zone], ZONES);
  const [concept] = keepKnown([t.focusConcept ?? t.concept], CONCEPTS);
  if (!zone || !concept) return null;
  return { zone, concept, date: effectiveDate(t.date, now) };
}

/**
 * A tool argument for zone/concept/date is accepted only when it equals the
 * thread's scope or the user's current message names it; otherwise the scope
 * wins. `overridden` tells the tool to say so in its result.
 */
export function resolveScopeArg<T extends string>(
  arg: T | undefined,
  inScope: T,
  named: ReadonlySet<string>,
): { value: T; overridden: boolean } {
  if (arg === undefined || arg === inScope) return { value: inScope, overridden: false };
  if (named.has(arg)) return { value: arg, overridden: false };
  return { value: inScope, overridden: true };
}
