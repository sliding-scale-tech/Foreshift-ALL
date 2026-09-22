// Outlook data for the NEW web app (foreshift-new/web) — the Convex-only twin of
// what Bubble does with POST /demand/outlook + its Daily Data / Weekly Data /
// EventData cache tables.
//
// Same math, same Gemini narration (lib/outlook.ts), but the inputs come from
// Convex's own mirror tables (demandScores, eventSignals, weatherSignals)
// instead of Bubble's Data API, and the result is cached in `outlookCache`.
//
//   getMine  (query)   — the caller's cached outlook for a type + date, plus
//                        whether it is still fresh, plus the raw per-daypart
//                        weather for that day. Reactive.
//   ensure   (action)  — (re)generates the caller's outlook when getMine says
//                        it's missing or stale.
//
// The caller's zone + concept always come from their `operators` row, never
// from arguments, so one operator can't request another's data.

import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  computeTodayOutlook,
  computeWeeklyOutlook,
  computeEventOutlook,
  computeWeatherOutlook,
  type OutlookInputs,
} from "./lib/outlook";
import {
  type DemandRecord,
  type EventSignalRead,
  type WeatherSignalRead,
} from "./lib/bubble";
import { type CoefficientBundle } from "./lib/resolve";
import { SCORE_CAP } from "./lib/formula";
import {
  ZONES,
  CONCEPTS,
  DAYS,
  DAYPARTS,
  keepKnown,
  scoreToBand,
  detroitDate,
  dayFromLocalDate,
  currentWeekDates,
  mondayOfWeek,
  type Day,
} from "./lib/vocab";
import baseDemand from "./data/baseDemand.json";

const outlookType = v.union(
  v.literal("today"),
  v.literal("weekly"),
  v.literal("events"),
  v.literal("weather"),
);
type OutlookType = "today" | "weekly" | "events" | "weather";

// ---------------------------------------------------------------------------
// Keys, dates, fingerprints
// ---------------------------------------------------------------------------

/** The date a cached outlook is filed under. Weekly is one row per week
 * (its Monday); the day-scoped types are one row per calendar date. */
function cacheDate(type: OutlookType, date: string | undefined): string {
  if (type === "weekly") return mondayOfWeek(new Date());
  if (!date) return detroitDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date: "${date}". Expected format YYYY-MM-DD.`);
  }
  // Same rule as /demand/outlook: signals are looked up by day-of-week, so only
  // the current Mon..Sun week can be answered truthfully.
  const week = currentWeekDates(new Date());
  if (!DAYS.some((d) => week[d] === date)) {
    throw new Error(`Date "${date}" is outside the current week.`);
  }
  return date;
}

function cacheKey(zone: string, concept: string, type: OutlookType, date: string) {
  return `${zone}__${concept}__${type}__${date}`;
}

function daysFor(type: OutlookType, date: string): Day[] {
  return type === "weekly" ? [...DAYS] : [dayFromLocalDate(date) as Day];
}

// Small stable string hash — the fingerprint only needs "did anything change".
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Everything that feeds the numbers for these days, folded into one string.
 * If a cron run changes any score, weather reading or event for the days, the
 * fingerprint changes and the cached narration is regenerated. */
async function fingerprint(
  ctx: QueryCtx,
  zone: string,
  concept: string,
  days: Day[],
): Promise<string> {
  const parts: unknown[] = [];
  for (const day of days) {
    const demand = await ctx.db
      .query("resolvedDemand")
      .withIndex("by_zone_concept_day", (q) =>
        q.eq("zone", zone).eq("concept", concept).eq("day", day),
      )
      .unique();
    const weather = await ctx.db
      .query("weatherSignals")
      .withIndex("by_zone_day", (q) => q.eq("zone", zone).eq("day", day))
      .collect();
    const events = await ctx.db
      .query("eventSignals")
      .withIndex("by_zone_day", (q) => q.eq("zone", zone).eq("day", day))
      .collect();
    parts.push([
      day,
      demand
        ? [
            demand.date,
            demand.morningScore,
            demand.middayScore,
            demand.dinnerScore,
            demand.lateScore,
          ]
        : null,
      weather.map((w) => [
        w.date,
        w.morning.condition,
        w.morning.tempF,
        w.midday.condition,
        w.midday.tempF,
        w.dinner.condition,
        w.dinner.tempF,
        w.late.condition,
        w.late.tempF,
      ]),
      events.map((e) => e.signalKey).sort(),
    ]);
  }
  return hash(JSON.stringify(parts));
}

async function operatorFor(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in.");
  const op = await ctx.db
    .query("operators")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!op) throw new Error("Finish onboarding first.");
  const [zone] = keepKnown([op.zone], ZONES);
  const [concept] = keepKnown([op.conceptType], CONCEPTS);
  if (!zone || !concept) {
    throw new Error(`Operator has an unknown zone/concept: ${op.zone} / ${op.conceptType}`);
  }
  return { zone, concept };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The signed-in operator's outlook of `type` for `date` (default today).
 * `result` is null until the first generation; `fresh` is false when the
 * inputs have changed since it was generated. `weather` is the raw reading for
 * that day (the daypart cards show it), null past the forecast horizon. */
export const getMine = query({
  args: { type: outlookType, date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { zone, concept } = await operatorFor(ctx);
    const date = cacheDate(args.type, args.date);
    const days = daysFor(args.type, date);

    const cached = await ctx.db
      .query("outlookCache")
      .withIndex("by_key", (q) => q.eq("key", cacheKey(zone, concept, args.type, date)))
      .unique();
    const current = await fingerprint(ctx, zone, concept, days);

    const weatherRows = await ctx.db
      .query("weatherSignals")
      .withIndex("by_zone_day", (q) => q.eq("zone", zone).eq("day", days[0]))
      .collect();
    const w = weatherRows[0];

    return {
      date,
      result: cached ? (cached.result as unknown) : null,
      fresh: cached !== null && cached.fingerprint === current,
      weather: w
        ? {
            morning: w.morning,
            midday: w.midday,
            dinner: w.dinner,
            late: w.late,
          }
        : null,
    };
  },
});

/** The signed-in operator's current Mon..Sun week in one read — the raw data
 * behind the Weekly grid + curve, the Events calendar + table and the Weather
 * calendar. No AI text (that comes from getMine); reactive, so it updates the
 * moment a cron run writes new signals.
 *
 * Days before today have no signals (the sync window starts today), so their
 * `weather` is null and they have no events — same as Bubble. */
export const getWeek = query({
  args: {},
  handler: async (ctx) => {
    const { zone, concept } = await operatorFor(ctx);
    const dates = currentWeekDates(new Date());

    const demandRows = await ctx.db
      .query("resolvedDemand")
      .withIndex("by_zone_concept_day", (q) => q.eq("zone", zone).eq("concept", concept))
      .collect();
    const weatherRows = await ctx.db
      .query("weatherSignals")
      .withIndex("by_zone_day", (q) => q.eq("zone", zone))
      .collect();
    const eventRows = await ctx.db
      .query("eventSignals")
      .withIndex("by_zone_day", (q) => q.eq("zone", zone))
      .collect();

    // One row per real event: Ticketmaster can list the same event under
    // several ids, and the same identity rule is used by the outlook math.
    const seen = new Set<string>();
    const events = eventRows
      .filter((e) => DAYS.some((d) => dates[d] === e.date))
      .filter((e) => {
        const key = `${e.date}|${e.name}|${e.venueName ?? ""}|${e.eventClass}|${e.eventTime ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((e) => ({
        eventId: e.eventId,
        name: e.name,
        venue: e.venueName ?? "",
        eventClass: e.eventClass,
        date: e.date,
        // "18:40:00" -> "18:40"; null when Ticketmaster gave no time.
        time: e.eventTime ? e.eventTime.slice(0, 5) : null,
        distanceMiles: e.distanceMiles ?? null,
        proximity: e.proximity,
      }))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time ?? "99:99").localeCompare(b.time ?? "99:99") ||
          a.name.localeCompare(b.name),
      );

    const days = DAYS.map((day) => {
      const date = dates[day];
      const demand = demandRows.find((r) => r.day === day);
      const weather = weatherRows.find((w) => w.date === date);
      return {
        day,
        date,
        demand: demand
          ? {
              peakScore: demand.peakScore,
              peakBand: demand.peakBand,
              peakDaypart: demand.peakDaypart,
              morningScore: demand.morningScore,
              middayScore: demand.middayScore,
              dinnerScore: demand.dinnerScore,
              lateScore: demand.lateScore,
            }
          : null,
        weather: weather
          ? {
              condition: weather.condition,
              tempF: weather.tempF,
              severity: weather.severity,
              precipChance: weather.precipChance,
            }
          : null,
      };
    });

    return { zone, concept, weekStart: dates.Mon, weekEnd: dates.Sun, today: detroitDate(), days, events };
  },
});

/** One event's isolated effect on the caller's demand — the "Event Outlook"
 * detail page. Same math as POST /event/impact (eventImpact.ts): the event's
 * lift = magnitude × affinity × proximity, shown per daypart as a percent of
 * that daypart's base score, and banded as base + lift. Each daypart's own
 * score/band is the day's resolved demand (what the daypart cards show).
 *
 * The raw coefficients (magnitude / affinity) are never returned. Null when
 * the event isn't in the caller's zone window. */
export const getEventImpact = query({
  args: { eventId: v.string(), date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { zone, concept } = await operatorFor(ctx);

    const rows = await ctx.db
      .query("eventSignals")
      .withIndex("by_zone_day", (q) => q.eq("zone", zone))
      .collect();
    const event = rows.find(
      (r) => r.eventId === args.eventId && (!args.date || r.date === args.date),
    );
    if (!event) return null;

    const day = dayFromLocalDate(event.date);
    if (!day) return null;

    const magnitudeRow = await ctx.db
      .query("eventMagnitude")
      .withIndex("by_eventClass", (q) => q.eq("eventClass", event.eventClass))
      .unique();
    const affinityRow = await ctx.db
      .query("eventAffinity")
      .withIndex("by_concept", (q) => q.eq("concept", concept))
      .unique();
    const base = await ctx.db
      .query("demandScores")
      .withIndex("by_zone_concept_day", (q) =>
        q.eq("zone", zone).eq("concept", concept).eq("day", day),
      )
      .unique();
    if (!base) return null;
    const resolved = await ctx.db
      .query("resolvedDemand")
      .withIndex("by_zone_concept_day", (q) =>
        q.eq("zone", zone).eq("concept", concept).eq("day", day),
      )
      .unique();

    const lift = (magnitudeRow?.magnitude ?? 0) * (affinityRow?.affinity ?? 0) * event.proximity;
    const baseOf = (dp: (typeof DAYPARTS)[number]) => base[`${dp}BaseScore`];

    // An all-dayparts event (every Huntington Place event) lifts all four; its
    // headline daypart is the busiest one. A timed event lifts only its own.
    const busiest = [...DAYPARTS].sort((a, b) => baseOf(b) - baseOf(a))[0];
    const headline = event.allDayparts
      ? busiest
      : (DAYPARTS.find((d) => d === event.daypart) ?? busiest);

    const dayparts = DAYPARTS.map((dp) => {
      const applies = baseOf(dp) > 0 && (event.allDayparts || dp === headline);
      return {
        daypart: dp,
        percent: applies ? Math.round((lift / baseOf(dp)) * 1000) / 10 : 0,
        score: resolved ? resolved[`${dp}Score`] : null,
        band: resolved ? resolved[`${dp}Band`] : null,
      };
    });

    return {
      event: {
        eventId: event.eventId,
        name: event.name,
        venue: event.venueName ?? "",
        eventClass: event.eventClass,
        date: event.date,
        time: event.eventTime ? event.eventTime.slice(0, 5) : null,
        headlineDaypart: headline,
        proximity: event.proximity,
        distanceMiles: event.distanceMiles ?? null,
      },
      // Band of the headline daypart once this event's lift lands (event only —
      // no weather, no other events), on the same 150 cap and thresholds.
      impactBand: scoreToBand(Math.min(baseOf(headline) + lift, SCORE_CAP)),
      headlinePercent: dayparts.find((d) => d.daypart === headline)?.percent ?? 0,
      dayparts,
    };
  },
});

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/** Convex mirror rows -> the same shapes the Bubble readers return, so
 * lib/outlook.ts runs unchanged. */
export const loadInputs = internalQuery({
  args: { zone: v.string(), concept: v.string(), days: v.array(v.string()) },
  handler: async (ctx, args): Promise<OutlookInputs> => {
    const inDays = (d: string | undefined) => args.days.length === 0 || args.days.includes(d ?? "");

    const base = await ctx.db
      .query("demandScores")
      .withIndex("by_zone_concept_day", (q) =>
        q.eq("zone", args.zone).eq("concept", args.concept),
      )
      .collect();
    const records: DemandRecord[] = base
      .filter((r) => inDays(r.day))
      .map((r) => ({
        zone: r.zone,
        concept: r.concept,
        day: r.day,
        dayparts: DAYPARTS.map((dp) => ({
          daypart: dp,
          window: "",
          base_score: r[`${dp}BaseScore`],
          base_band: r[`${dp}BaseBand`],
        })),
      }));

    const eventRows = await ctx.db
      .query("eventSignals")
      .withIndex("by_zone_day", (q) => q.eq("zone", args.zone))
      .collect();
    const events: EventSignalRead[] = eventRows
      .filter((e) => inDays(e.day))
      .map((e) => ({
        event_id: e.eventId,
        zone: e.zone,
        day: e.day ?? "",
        date: e.date,
        daypart: e.daypart ?? "",
        event_class: e.eventClass,
        proximity: e.proximity,
        distance_miles: e.distanceMiles ?? 0,
        // The mirror keeps "HH:MM:SS"; Bubble's reader (and the outlook code) use "HH:MM".
        event_time: e.eventTime ? e.eventTime.slice(0, 5) : null,
        name: e.name,
        venue_name: e.venueName ?? "",
        all_dayparts: e.allDayparts,
      }));

    const weatherRows = await ctx.db
      .query("weatherSignals")
      .withIndex("by_zone_day", (q) => q.eq("zone", args.zone))
      .collect();
    const slice = (s: { severity: number; condition: string; tempF: number; precipChance: number }) => ({
      severity: s.severity,
      condition: s.condition,
      temp_f: s.tempF,
      precip_chance: s.precipChance,
    });
    const weather: WeatherSignalRead[] = weatherRows
      .filter((w) => inDays(w.day))
      .map((w) => ({
        zone: w.zone,
        day: w.day ?? "",
        date: w.date,
        severity: w.severity,
        condition: w.condition,
        temp_f: w.tempF,
        precip_chance: w.precipChance,
        morning: slice(w.morning),
        midday: slice(w.midday),
        dinner: slice(w.dinner),
        late: slice(w.late),
      }));

    return { records, events, weather };
  },
});

export const status = internalQuery({
  args: { type: outlookType, date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { zone, concept } = await operatorFor(ctx);
    const date = cacheDate(args.type, args.date);
    const cached = await ctx.db
      .query("outlookCache")
      .withIndex("by_key", (q) => q.eq("key", cacheKey(zone, concept, args.type, date)))
      .unique();
    return {
      zone,
      concept,
      date,
      key: cacheKey(zone, concept, args.type, date),
      fingerprint: await fingerprint(ctx, zone, concept, daysFor(args.type, date)),
      cachedFingerprint: cached?.fingerprint ?? null,
    };
  },
});

export const store = internalMutation({
  args: { key: v.string(), fingerprint: v.string(), result: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("outlookCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    const row = { ...args, generatedAt: Date.now() };
    if (existing) await ctx.db.patch("outlookCache", existing._id, row);
    else await ctx.db.insert("outlookCache", row);
  },
});

/** Generate the caller's outlook if it is missing or stale. Returns whether it
 * actually generated (false = cache was already fresh). The result itself is
 * read back through getMine, which updates reactively. */
export const ensure = action({
  args: { type: outlookType, date: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ generated: boolean }> => {
    // `status` reads the operator from the caller's identity — the identity
    // carries through ctx.runQuery from an authenticated action.
    const s = await ctx.runQuery(internal.outlookApp.status, args);
    if (s.cachedFingerprint === s.fingerprint) return { generated: false };

    const [zone] = keepKnown([s.zone], ZONES);
    const [concept] = keepKnown([s.concept], CONCEPTS);
    const days = args.type === "weekly" ? [] : [dayFromLocalDate(s.date) as string];
    const inputs = await ctx.runQuery(internal.outlookApp.loadInputs, {
      zone,
      concept,
      days,
    });
    const coeffs: CoefficientBundle = await ctx.runQuery(internal.coefficients.getAll, {});

    // Anchor at noon UTC so the chosen calendar date survives any timezone.
    const now = new Date(`${s.date}T12:00:00Z`);
    const common = { zone, concept, coeffs, inputs };
    const result =
      args.type === "weekly"
        ? await computeWeeklyOutlook({ ...common, now })
        : args.type === "events"
          ? await computeEventOutlook({ ...common, now })
          : args.type === "weather"
            ? await computeWeatherOutlook({ ...common, now })
            : await computeTodayOutlook({ ...common, now });

    await ctx.runMutation(internal.outlookApp.store, {
      key: s.key,
      fingerprint: s.fingerprint,
      result,
    });
    return { generated: true };
  },
});

/** One-off upload of the fixed base-demand file (the same one Bubble's
 * DemandScore table was loaded from) into `demandScores`. Safe to re-run: rows
 * are matched by zone|concept|day and only patched when a value differs.
 * Run:  npx convex run outlookApp:seedDemandScores */
export const seedDemandScores = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number; updated: number; unchanged: number }> => {
    const existing = await ctx.db.query("demandScores").collect();
    const byKey = new Map(existing.map((r) => [r.signalKey, r]));

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    for (const r of baseDemand) {
      const row = { signalKey: `${r.zone}__${r.concept}__${r.day}`, ...r };
      const found = byKey.get(row.signalKey);
      if (!found) {
        await ctx.db.insert("demandScores", row);
        inserted += 1;
      } else if ((Object.keys(row) as (keyof typeof row)[]).some((k) => found[k] !== row[k])) {
        await ctx.db.patch("demandScores", found._id, row);
        updated += 1;
      } else {
        unchanged += 1;
      }
    }
    return { inserted, updated, unchanged };
  },
});
