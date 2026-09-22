import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {
  fetchWeatherForecast,
  fetchWeatherHistory,
  sliceDaypartWeather,
  type DailyForecast,
  type DaypartWeather,
} from "./lib/weatherapi";
import { severityFromForecast, simplifyWeatherCondition } from "./lib/weatherSeverity";
import {
  dayFromLocalDate,
  daysUntilNextMonday,
  mondayOfWeek,
  nextMondayDate,
  detroitDate,
  addDays,
  DAYPARTS,
} from "./lib/vocab";
import {
  listWeatherSignalIds,
  createWeatherSignal,
  updateWeatherSignal,
  deleteWeatherSignal,
  type BubbleWeatherSignal,
  type DaypartWeatherFields,
} from "./lib/bubble";

// Reduce one daypart's sliced weather to the {severity, condition, temp_f,
// precip_chance} shape stored on the Bubble row — same severity RULE as the
// whole-day aggregate (severityFromForecast), just fed a daypart's hourly
// slice instead of the day's own aggregate.
function daypartRow(dw: DaypartWeather): DaypartWeatherFields {
  return {
    severity: severityFromForecast(dw),
    // condition is a Bubble option set (7 fixed values) — the raw WeatherAPI
    // text ("Patchy rain nearby") isn't one of them and would be rejected.
    condition: simplifyWeatherCondition(dw.conditionText),
    temp_f: dw.avgTempF,
    precip_chance: Math.max(dw.chanceOfRain, dw.chanceOfSnow),
  };
}

function daypartRowsForDay(
  f: DailyForecast,
): Record<(typeof DAYPARTS)[number], DaypartWeatherFields> {
  return {
    morning: daypartRow(sliceDaypartWeather(f, "morning")),
    midday: daypartRow(sliceDaypartWeather(f, "midday")),
    dinner: daypartRow(sliceDaypartWeather(f, "dinner")),
    late: daypartRow(sliceDaypartWeather(f, "late")),
  };
}

// Step 3a/3b (debug): fetch the Detroit 7-day forecast and attach the v7.1 severity
// to each day. Inspection only — no per-zone fan-out, no storage (that's 3c).
//
// Requires the Convex deployment env var WEATHERAPI_KEY:
//   npx convex env set WEATHERAPI_KEY <key>
export const fetchWeatherRaw = internalAction({
  args: {
    query: v.optional(v.string()), // default "Detroit"
    days: v.optional(v.number()), // default 7
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.WEATHERAPI_KEY;
    if (!apiKey) {
      throw new Error(
        "WEATHERAPI_KEY is not set. Run: npx convex env set WEATHERAPI_KEY <key>",
      );
    }

    const forecast = await fetchWeatherForecast({
      apiKey,
      query: args.query ?? "Detroit",
      days: args.days ?? 7,
    });

    const withSeverity = forecast.map((f) => ({
      date: f.date,
      day: dayFromLocalDate(f.date),
      condition: f.conditionText,
      avgTempF: f.avgTempF,
      chanceOfRain: f.chanceOfRain,
      chanceOfSnow: f.chanceOfSnow,
      severity: severityFromForecast(f),
    }));

    return { count: withSeverity.length, forecast: withSeverity };
  },
});

// Step 3c: fetch one Detroit forecast, compute severity per day, fan out to all 13
// zones (same severity across zones), and upsert into Bubble WeatherSignal by
// signal_key (`${zone}__${date}`). With deleteStale=true, removes rows whose key is
// no longer produced (last week's dates).
//
// Chains into the resolved-demand sync on completion (see `finally` below)
// instead of waiting on a separately-scheduled cron — the `finally` runs whether
// this sync succeeded or threw, so a failure here still lets the resolved-demand
// sync attempt its run rather than blocking the rest of the weekly chain. See
// crons.ts and events.ts (which chains into this one the same way).
export const syncWeatherSignalsToBubble = internalAction({
  args: {
    query: v.optional(v.string()),
    days: v.optional(v.number()),
    deleteStale: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.WEATHERAPI_KEY;
      if (!apiKey) {
        throw new Error(
          "WEATHERAPI_KEY is not set. Run: npx convex env set WEATHERAPI_KEY <key>",
        );
      }

      // Cap at the upcoming Monday (not a flat 7) — same reasoning as the event
      // sync: a mid-week run must stay inside this week, never spill into next
      // week's Mon/Tue/Wed and overwrite this week's day-slots with wrong dates.
      // All "today"/week math is anchored to Detroit's local date (see vocab.ts):
      // WeatherAPI's forecast window starts from the local date, and the cron
      // fires while Detroit is still on the previous UTC day.
      const now = new Date();
      const query = args.query ?? "Detroit";
      const days = args.days ?? daysUntilNextMonday(now);
      const forecast = await fetchWeatherForecast({ apiKey, query, days });

      // Backfill days already elapsed this week (Monday..yesterday) with ACTUAL
      // past weather — forecast.json only ever looks forward from today, so a
      // mid-week or delayed sync would otherwise leave those day-slots with no
      // weather signal at all even though the real data is available via history.
      const weekStart = mondayOfWeek(now);
      const todayStr = detroitDate(now);
      let history: Awaited<ReturnType<typeof fetchWeatherHistory>> = [];
      if (weekStart < todayStr) {
        const yesterday = addDays(todayStr, -1);
        history = await fetchWeatherHistory({
          apiKey,
          query,
          startDate: weekStart,
          endDate: yesterday,
        });
      }

      const allDays = [...history, ...forecast];
      const zones: { name: string }[] = await ctx.runQuery(api.zones.list, {});

      // Fan out: one row per (zone × day) — STILL one row per zone/day, not
      // per zone/day/daypart (wide format, matching ResolvedDemand's own
      // morning/midday/dinner/late-as-columns convention) — same severity
      // across zones, but now the row also carries a per-daypart breakdown
      // alongside the existing whole-day aggregate fields (unchanged, kept for
      // back-compat with anything already reading them).
      const rows: BubbleWeatherSignal[] = [];
      for (const f of allDays) {
        const severity = severityFromForecast(f);
        const day = dayFromLocalDate(f.date);
        const precip_chance = Math.max(f.chanceOfRain, f.chanceOfSnow);
        const daypartRows = daypartRowsForDay(f);
        for (const zone of zones) {
          rows.push({
            signal_key: `${zone.name}__${f.date}`,
            zone: zone.name,
            date: f.date,
            day,
            severity,
            condition: simplifyWeatherCondition(f.conditionText),
            precip_chance,
            temp_f: f.avgTempF,
            morning: daypartRows.morning,
            midday: daypartRows.midday,
            dinner: daypartRows.dinner,
            late: daypartRows.late,
          });
        }
      }

      const existing = await listWeatherSignalIds();
      let created = 0;
      let updated = 0;
      let deleted = 0;
      const seen = new Set<string>();

      for (const row of rows) {
        seen.add(row.signal_key);
        const id = existing.get(row.signal_key);
        if (id) {
          await updateWeatherSignal(id, row);
          updated += 1;
        } else {
          await createWeatherSignal(row);
          created += 1;
        }
      }

      if (args.deleteStale) {
        // Same bounded-window rule as the event sync (see events.ts). Retained
        // window is [mondayOfThisWeek, nextMonday); the WeatherSignal key is
        // `${zone}__${YYYY-MM-DD}`, so the date is the last 10 chars. Delete a
        // stored row only when it is either:
        //   (a) OUTSIDE the window — a previous week's leftover. Replaces the
        //       old weekly full wipe; without it WeatherSignal grows forever
        //       and last week's "Mon" collides with this week's on the
        //       day-of-week join in resolve.ts (last-write-wins → wrong day's
        //       weather).
        //   (b) today-or-later AND not produced this run — a forecast day that
        //       genuinely dropped out. Guards against the history backfill
        //       coming back empty (not throwing) and `seen` then missing the
        //       already-elapsed days: those are in [weekStart, today) so they
        //       are kept, not deleted.
        const weekStart = mondayOfWeek(now);
        const weekEnd = nextMondayDate(now); // exclusive
        const today = detroitDate(now);
        for (const [key, id] of existing) {
          const date = key.slice(-10);
          const outOfWindow = date < weekStart || date >= weekEnd;
          const vanishedFuture = date >= today && !seen.has(key);
          if (outOfWindow || vanishedFuture) {
            await deleteWeatherSignal(id);
            deleted += 1;
          }
        }
      }

      // Mirror the same rows into Convex's own weatherSignals table (see
      // signalsStore.ts) — additive, doesn't touch anything above. Same
      // windowed stale-row rule as the Bubble block, evaluated against
      // Convex's own existing rows (which carry `date` as a real field, no
      // need to slice it out of the key).
      const convexUpserts = rows.map((r) => ({
        signalKey: r.signal_key,
        zone: r.zone,
        date: r.date,
        day: r.day ?? undefined,
        severity: r.severity,
        condition: r.condition,
        precipChance: r.precip_chance,
        tempF: r.temp_f,
        morning: {
          severity: r.morning.severity,
          condition: r.morning.condition,
          tempF: r.morning.temp_f,
          precipChance: r.morning.precip_chance,
        },
        midday: {
          severity: r.midday.severity,
          condition: r.midday.condition,
          tempF: r.midday.temp_f,
          precipChance: r.midday.precip_chance,
        },
        dinner: {
          severity: r.dinner.severity,
          condition: r.dinner.condition,
          tempF: r.dinner.temp_f,
          precipChance: r.dinner.precip_chance,
        },
        late: {
          severity: r.late.severity,
          condition: r.late.condition,
          tempF: r.late.temp_f,
          precipChance: r.late.precip_chance,
        },
      }));
      let convexDeleteKeys: string[] = [];
      if (args.deleteStale) {
        const convexExisting = await ctx.runQuery(
          internal.signalsStore.listWeatherSignalKeys,
          {},
        );
        const weekStart = mondayOfWeek(now);
        const weekEnd = nextMondayDate(now);
        const today = detroitDate(now);
        convexDeleteKeys = convexExisting
          .filter(({ signalKey, date }) => {
            const outOfWindow = date < weekStart || date >= weekEnd;
            const vanishedFuture = date >= today && !seen.has(signalKey);
            return outOfWindow || vanishedFuture;
          })
          .map(({ signalKey }) => signalKey);
      }
      await ctx.runMutation(internal.signalsStore.syncWeatherSignals, {
        upserts: convexUpserts,
        deleteKeys: convexDeleteKeys,
      });

      return {
        days: allDays.length,
        historyDays: history.length,
        forecastDays: forecast.length,
        zones: zones.length,
        rows: rows.length,
        bubble: { created, updated, deleted, existingBefore: existing.size },
      };
    } finally {
      // 2-minute buffer (not 0-delay like the events->weather hop): resolvedDemand's
      // own sync issues ~850 Bubble requests on its own (see bubbleFetch's rate-limit
      // comment in lib/bubble.ts) — leaving a gap here keeps its burst in a separate
      // rolling-minute window from this sync's own tail requests, on top of (not
      // instead of) the rate limiter, which is what actually caps total throughput.
      await ctx.scheduler.runAfter(
        2 * 60_000,
        internal.operatorWeek.syncResolvedDemandToBubble,
        { deleteStale: true },
      );
    }
  },
});
