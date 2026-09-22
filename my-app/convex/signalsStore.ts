// Convex-native mirror of the Bubble EventSignal / WeatherSignal /
// ResolvedDemand tables. Written by events.ts / weather.ts / operatorWeek.ts
// right alongside their existing Bubble upserts — Bubble stays exactly as it
// behaves today; this is purely additive so the NEW web app
// (foreshift-new/web) can read zone-demand data straight from Convex instead
// of Bubble's Data API.

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

const dayPartWeatherFields = v.object({
  severity: v.number(),
  condition: v.string(),
  tempF: v.number(),
  precipChance: v.number(),
});

// ---------------------------------------------------------------------------
// EventSignal
// ---------------------------------------------------------------------------

const eventSignalFields = {
  signalKey: v.string(),
  eventId: v.string(),
  name: v.string(),
  venueName: v.optional(v.string()),
  eventClass: v.string(),
  zone: v.string(),
  proximity: v.number(),
  distanceMiles: v.optional(v.number()),
  eventTime: v.optional(v.string()),
  date: v.string(),
  day: v.optional(v.string()),
  daypart: v.optional(v.string()),
  allDayparts: v.boolean(),
};

/** Existing signalKey -> date, so the caller can apply the SAME windowed
 * stale-row rule it already computed for Bubble (see events.ts), just
 * against Convex's own stored rows instead of Bubble's. */
export const listEventSignalKeys = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("eventSignals").collect();
    return rows.map((r) => ({ signalKey: r.signalKey, date: r.date }));
  },
});

export const syncEventSignals = internalMutation({
  args: {
    upserts: v.array(v.object(eventSignalFields)),
    deleteKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("eventSignals").collect();
    const byKey = new Map(existing.map((r) => [r.signalKey, r]));

    for (const key of args.deleteKeys) {
      const row = byKey.get(key);
      if (row) await ctx.db.delete("eventSignals", row._id);
    }
    for (const row of args.upserts) {
      const found = byKey.get(row.signalKey);
      if (found) await ctx.db.patch("eventSignals", found._id, row);
      else await ctx.db.insert("eventSignals", row);
    }
  },
});

/** For the web app — event signals, optionally filtered by zone. */
export const getEventSignals = query({
  args: { zone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.zone) {
      return await ctx.db
        .query("eventSignals")
        .withIndex("by_zone_day", (q) => q.eq("zone", args.zone!))
        .collect();
    }
    return await ctx.db.query("eventSignals").collect();
  },
});

// ---------------------------------------------------------------------------
// WeatherSignal
// ---------------------------------------------------------------------------

const weatherSignalFields = {
  signalKey: v.string(),
  zone: v.string(),
  date: v.string(),
  day: v.optional(v.string()),
  severity: v.number(),
  condition: v.string(),
  precipChance: v.number(),
  tempF: v.number(),
  morning: dayPartWeatherFields,
  midday: dayPartWeatherFields,
  dinner: dayPartWeatherFields,
  late: dayPartWeatherFields,
};

export const listWeatherSignalKeys = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("weatherSignals").collect();
    return rows.map((r) => ({ signalKey: r.signalKey, date: r.date }));
  },
});

export const syncWeatherSignals = internalMutation({
  args: {
    upserts: v.array(v.object(weatherSignalFields)),
    deleteKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("weatherSignals").collect();
    const byKey = new Map(existing.map((r) => [r.signalKey, r]));

    for (const key of args.deleteKeys) {
      const row = byKey.get(key);
      if (row) await ctx.db.delete("weatherSignals", row._id);
    }
    for (const row of args.upserts) {
      const found = byKey.get(row.signalKey);
      if (found) await ctx.db.patch("weatherSignals", found._id, row);
      else await ctx.db.insert("weatherSignals", row);
    }
  },
});

/** For the web app — weather signals, optionally filtered by zone. */
export const getWeatherSignals = query({
  args: { zone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.zone) {
      return await ctx.db
        .query("weatherSignals")
        .withIndex("by_zone_day", (q) => q.eq("zone", args.zone!))
        .collect();
    }
    return await ctx.db.query("weatherSignals").collect();
  },
});

// ---------------------------------------------------------------------------
// ResolvedDemand
// ---------------------------------------------------------------------------

const resolvedDemandFields = {
  signalKey: v.string(),
  zone: v.string(),
  concept: v.string(),
  day: v.string(),
  date: v.string(),
  peakDaypart: v.string(),
  peakScore: v.number(),
  peakBand: v.string(),
  morningScore: v.number(),
  morningBand: v.string(),
  middayScore: v.number(),
  middayBand: v.string(),
  dinnerScore: v.number(),
  dinnerBand: v.string(),
  lateScore: v.number(),
  lateBand: v.string(),
};

/** Existing signalKeys — ResolvedDemand has no windowing nuance (it always
 * recomputes the full zone×concept×day table each run), so this is just the
 * plain "everything currently stored" list. */
export const listResolvedDemandKeys = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("resolvedDemand").collect();
    return rows.map((r) => r.signalKey);
  },
});

export const syncResolvedDemand = internalMutation({
  args: {
    upserts: v.array(v.object(resolvedDemandFields)),
    deleteKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("resolvedDemand").collect();
    const byKey = new Map(existing.map((r) => [r.signalKey, r]));

    for (const key of args.deleteKeys) {
      const row = byKey.get(key);
      if (row) await ctx.db.delete("resolvedDemand", row._id);
    }
    for (const row of args.upserts) {
      const found = byKey.get(row.signalKey);
      if (found) await ctx.db.patch("resolvedDemand", found._id, row);
      else await ctx.db.insert("resolvedDemand", row);
    }
  },
});

/** For the web app dashboard — resolved demand rows, optionally filtered by
 * zone and/or concept. */
export const getResolvedDemand = query({
  args: { zone: v.optional(v.string()), concept: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.zone) {
      const rows = await ctx.db
        .query("resolvedDemand")
        .withIndex("by_zone_concept_day", (q) => q.eq("zone", args.zone!))
        .collect();
      return args.concept ? rows.filter((r) => r.concept === args.concept) : rows;
    }
    return await ctx.db.query("resolvedDemand").collect();
  },
});
