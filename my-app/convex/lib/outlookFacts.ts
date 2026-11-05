// Plain-facts stand-ins for the Gemini narrators, used by the web app only.
//
// The outlook NUMBERS never depend on Gemini — only the sentences do. When
// Gemini is down (503 "high demand", quota, a blocked request) the web app used
// to lose the whole page. withFactsFallback() keeps the real narrator as the
// first choice and, only when it throws, writes the same slots from the numbers
// already computed: the peak period, the quieter ones, the named events and the
// weather. Nothing here is invented — every word comes from the context object
// the narrator was given.
//
// /demand/outlook (Bubble) does not use this file: it passes no narrators, so it
// keeps calling Gemini directly, exactly as before.

import {
  BAND_LEVEL,
  narrateTodayGlance,
  narrateWeekGlance,
  narrateEventImpact,
  narrateWeatherImpact,
  narrateDaypartEventNotes,
  type DaypartNotes,
  type TokenUsage,
} from "./gemini";
import type { Narrators } from "./outlook";

const NO_USAGE: TokenUsage = { promptTokens: 0, outputTokens: 0, totalTokens: 0 };

const DAYPART_NAME: Record<string, string> = {
  morning: "morning",
  midday: "midday",
  dinner: "dinner",
  late: "late night",
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const name = (daypart: string) => DAYPART_NAME[daypart] ?? daypart;

type Ctx = Record<string, unknown>;
const obj = (v: unknown): Ctx => (v && typeof v === "object" ? (v as Ctx) : {});
const arr = (v: unknown): Ctx[] => (Array.isArray(v) ? v.map(obj) : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** "A", "A and B", "A, B and C". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Tour titles can run long ("X (Member, Member) feat. Y"): keep the part people recognise. */
function shortName(n: string): string {
  const cut = n.split(/\s+\(|\s+feat\.|\s+w\/|\s+[-–]\s+/i)[0].trim();
  const base = cut || n;
  return base.length > 40 ? `${base.slice(0, 37).trimEnd()}...` : base;
}

/** "Doja Cat and Mastodon" / "Doja Cat, Mastodon and 2 more". */
function eventList(names: string[], shown = 2): string {
  const unique = [...new Set(names.filter(Boolean).map(shortName))];
  if (unique.length <= shown) return joinList(unique);
  return `${unique.slice(0, shown).join(", ")} and ${unique.length - shown} more`;
}

/** Weather worth mentioning: it actually moves demand. */
function weatherMoves(w: Ctx | null | undefined): boolean {
  return !!w && Math.abs(num(w.weather_impact_percent)) >= 1;
}

function weatherPhrase(w: Ctx): string {
  const pct = Math.round(Math.abs(num(w.weather_impact_percent)));
  const cond = str(w.condition).toLowerCase();
  const dir = num(w.weather_impact_percent) < 0 ? "lower" : "lift";
  return dir === "lower"
    ? `${cond || "the weather"} may lower demand by about ${pct}%`
    : `${cond || "the weather"} may lift demand by about ${pct}%`;
}

// ---------------------------------------------------------------------------

function todayText(context: unknown): string {
  const c = obj(context);
  const peak = obj(c.peak);
  const dayparts = arr(c.dayparts);
  const drivers = obj(c.drivers);
  const peakName = str(peak.daypart);

  const parts: string[] = [`Demand is highest at ${name(peakName)} (${str(peak.band)}).`];

  // The other periods, grouped by band so it reads "Midday is Light; morning
  // and late night are Minimal."
  const others = dayparts.filter((d) => str(d.daypart) !== peakName);
  const byBand = new Map<string, string[]>();
  for (const d of others) {
    const band = str(d.band);
    byBand.set(band, [...(byBand.get(band) ?? []), name(str(d.daypart))]);
  }
  const groups = [...byBand.entries()].map(([band, names]) => ({ band, names }));
  if (groups.length > 0) {
    const bits = groups.map((g) => `${g.names.length > 1 ? joinList(g.names) : g.names[0]} ${g.names.length > 1 ? "are" : "is"} ${g.band}`);
    parts.push(`${cap(bits.join("; "))}.`);
  }

  const events = arr(drivers.events).filter((e) => str(e.daypart) === peakName);
  const weather = arr(drivers.weather).find((w) => str(w.daypart) === peakName);
  const drivenBy: string[] = [];
  if (events.length > 0) drivenBy.push(eventList(events.map((e) => str(e.name))));
  if (weatherMoves(weather)) drivenBy.push(weatherPhrase(weather!));
  parts.push(
    drivenBy.length > 0
      ? `At ${name(peakName)}, demand is shaped by ${joinList(drivenBy)}.`
      : `No major nearby events or weather effects are shaping ${name(peakName)}.`,
  );
  return parts.join(" ");
}

/** "Dinner looks quiet. Doja Cat may bring more people at dinner." No numbers. */
function todayGlanceText(context: unknown): string {
  const c = obj(context);
  const peak = obj(c.peak);
  const peakName = str(peak.daypart);
  const level = BAND_LEVEL[str(peak.band)] ?? str(peak.band).toLowerCase();
  const events = arr(obj(c.drivers).events);
  const parts = [`${cap(name(peakName))} looks ${level}.`];
  if (events.length > 0) {
    const atPeak = events.filter((e) => str(e.daypart) === peakName);
    const shown = atPeak.length > 0 ? atPeak : events;
    const where = atPeak.length > 0 ? name(peakName) : name(str(shown[0].daypart));
    parts.push(`${eventList(shown.map((e) => str(e.name)))} may bring more people at ${where}.`);
  } else {
    parts.push("It looks like a normal day, with no big events nearby.");
  }
  return parts.join(" ");
}

function eventsText(events: Ctx[]): string {
  if (events.length === 0) {
    return "No notable nearby events today; demand reflects baseline conditions.";
  }
  const names = eventList(events.map((e) => str(e.name)), 3);
  const order = ["morning", "midday", "dinner", "late"];
  const periods = order.filter((dp) => events.some((e) => str(e.daypart) === dp)).map(name);
  return periods.length > 0
    ? `Nearby today: ${names}. They may lift demand around ${joinList(periods)}.`
    : `Nearby today: ${names}.`;
}

function weatherText(weather: Ctx[]): string {
  const moving = weather.filter(weatherMoves);
  if (moving.length === 0) return "Weather looks normal today, with little effect on demand.";
  const strongest = moving.reduce((a, b) =>
    Math.abs(num(b.weather_impact_percent)) > Math.abs(num(a.weather_impact_percent)) ? b : a,
  );
  return `Weather matters most at ${name(str(strongest.daypart))}: ${weatherPhrase(strongest)}.`;
}

function weeklyText(context: unknown): string {
  const c = obj(context);
  const days = arr(c.days);
  if (days.length === 0) return "No forecast is available for this week yet.";
  const best = days.reduce((a, b) => (num(obj(b.peak).score) > num(obj(a.peak).score) ? b : a));
  const peak = obj(best.peak);
  const bandsByDay = days.map((d) => `${str(d.day)} ${str(obj(d.peak).band)}`);
  const bestEvents = arr(obj(best.drivers).events).map((e) => str(e.name));
  const parts = [
    `Busiest: ${str(best.day)} at ${name(str(peak.daypart))} (${str(peak.band)}).`,
    `Daily peaks: ${bandsByDay.join(", ")}.`,
  ];
  if (bestEvents.length > 0) parts.push(`Nearby that day: ${eventList(bestEvents)}.`);
  return parts.join(" ");
}

/** "Saturday dinner looks moderate. Doja Cat may bring more people that day." No numbers. */
function weekGlanceText(context: unknown): string {
  const days = arr(obj(context).days);
  if (days.length === 0) return "No forecast is available for this week yet.";
  const best = days.reduce((a, b) => (num(obj(b.peak).score) > num(obj(a.peak).score) ? b : a));
  const peak = obj(best.peak);
  const level = BAND_LEVEL[str(peak.band)] ?? str(peak.band).toLowerCase();
  const parts = [`${FULL_DAY[str(best.day)] ?? str(best.day)} ${name(str(peak.daypart))} looks busiest, at ${level}.`];
  const events = arr(obj(best.drivers).events).map((e) => str(e.name));
  if (events.length > 0) parts.push(`${eventList(events)} may bring more people that day.`);
  return parts.join(" ");
}

const FULL_DAY: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

// ---------------------------------------------------------------------------

const factsNarrators = {
  today: async (context: unknown) => ({ text: todayText(context), usage: NO_USAGE }),

  // "Today at a glance" without Gemini: the busiest period's level and its events, in plain words.
  todayGlance: async (context: unknown) => ({ text: todayGlanceText(context), usage: NO_USAGE }),

  weekly: async (context: unknown) => ({ text: weeklyText(context), usage: NO_USAGE }),

  // "This week at a glance" without Gemini, in the same plain words as the daily line.
  weekGlance: async (context: unknown) => ({ text: weekGlanceText(context), usage: NO_USAGE }),

  event: async (context: unknown) => ({
    text: eventsText(arr(obj(context).events)),
    usage: NO_USAGE,
  }),

  weather: async (context: unknown) => ({
    text: weatherText(arr(obj(context).weather)),
    usage: NO_USAGE,
  }),

  daypartNotes: async (context: unknown) => {
    // The narrator is called with { zone, day, date, dayparts: [...] }.
    const list = arr(obj(context).dayparts);
    const notes = {} as DaypartNotes;
    for (const d of list) {
      const dp = str(d.daypart) as keyof DaypartNotes;
      const events = arr(d.events).map((e) => str(e.name));
      notes[dp] =
        `${cap(name(dp))} demand is ${str(d.band).toLowerCase()}` +
        (events.length > 0 ? `, with ${eventList(events, 1)} nearby` : "") +
        ".";
    }
    const allEvents = list.flatMap((d) => arr(d.events).map((e) => ({ name: e.name, daypart: d.daypart })));
    const allWeather = list.map((d) => ({ ...obj(d.weather), daypart: d.daypart }));
    return {
      notes,
      event_narration: eventsText(allEvents),
      weather_narration: weatherText(allWeather),
      usage: NO_USAGE,
    };
  },
};

/**
 * Facts only, no Gemini call at all. For the web Weather page: it shows the numbers per period and
 * builds its own sentences, so the AI paragraph is never displayed and isn't worth waiting for.
 */
export const factsOnlyWeather: Narrators = { weather: factsNarrators.weather };

/**
 * The real Gemini narrators, each backed by the plain-facts version above. Use
 * the real one first; if it throws, write the facts instead and call
 * `onFallback` so the caller can mark the result.
 */
export function withFactsFallback(onFallback: () => void): Narrators {
  function guard<A extends unknown[], R>(real: (...a: A) => Promise<R>, facts: (...a: A) => Promise<R>) {
    return async (...a: A): Promise<R> => {
      try {
        return await real(...a);
      } catch (err) {
        console.warn("[outlook] narration unavailable, using facts:", err instanceof Error ? err.message : err);
        onFallback();
        return facts(...a);
      }
    };
  }
  return {
    // The web Daily page's "Today at a glance" (the simpler, web-only narrator).
    today: guard(narrateTodayGlance, factsNarrators.todayGlance),
    // The web Weekly page's "This week at a glance" (the simpler, web-only narrator).
    weekly: guard(narrateWeekGlance, factsNarrators.weekGlance),
    event: guard(narrateEventImpact, factsNarrators.event),
    weather: guard(narrateWeatherImpact, factsNarrators.weather),
    daypartNotes: guard(narrateDaypartEventNotes, factsNarrators.daypartNotes),
  };
}
