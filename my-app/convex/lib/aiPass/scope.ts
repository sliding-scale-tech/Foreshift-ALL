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
  "Core City / Woodbridge": ["core city", "woodbridge"],
  Corktown: ["corktown"],
  "Downtown Detroit (Core)": ["downtown detroit", "downtown"],
  "Eastern Market": ["eastern market"],
  "Financial District": ["financial district"],
  "Foxtown / Stadium District": ["foxtown", "stadium district"],
  "Greektown / Casino District": ["greektown", "casino district"],
  Mexicantown: ["mexicantown"],
  Midtown: ["midtown"],
  "New Center / North End": ["new center", "north end"],
  "Riverfront / RiverWalk": ["riverfront", "riverwalk"],
  "Southwest Detroit": ["southwest detroit", "southwest"],
  "Woodward Core": ["woodward core", "woodward"],
};

// Multi-word on purpose where a bare word is ambiguous ("casual" alone matches three types).
const CONCEPT_ALIASES: Record<Concept, string[]> = {
  "Breakfast / Brunch Cafe": ["breakfast", "brunch", "breakfast cafe", "brunch cafe"],
  "Casual Dining": ["casual dining"],
  "Cocktail Lounge": ["cocktail lounge", "cocktail bar", "cocktails"],
  "Coffee Shop": ["coffee shop", "coffee"],
  "Fast Casual": ["fast casual"],
  "Fine Dining": ["fine dining"],
  "Neighborhood / Casual Bar": ["neighborhood bar", "casual bar", "neighborhood casual bar", "neighborhood"],
  "Sports Bar": ["sports bar"],
  "Upscale Casual": ["upscale casual", "upscale"],
};

function namedIn<T extends string>(text: string, all: readonly T[], aliases: Record<T, string[]>): T[] {
  const hay = normalizeText(text);
  const found: T[] = [];
  for (const value of all) {
    const names = [normalizeText(value), ...aliases[value].map(normalizeText)];
    // Whole-word / whole-phrase match: " midtown " inside " about midtown friday ".
    if (names.some((n) => hay.includes(n))) found.push(value);
  }
  return found;
}

export const zonesNamedIn = (text: string): Zone[] => namedIn(text, ZONES, ZONE_ALIASES);
export const conceptsNamedIn = (text: string): Concept[] => namedIn(text, CONCEPTS, CONCEPT_ALIASES);

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
