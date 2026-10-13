// Data the AI Pass agent's tools read. Every function here is internal (only the
// agent's action can call it) and read-only. Each returns two parts:
//   model — compact JSON the model sees (what it may quote);
//   bag   — server-only: the refs the model may cite, a plain fact for each, a
//           one-line summary and the scope used (see lib/aiPass/grounding.ts).
//
// The numbers come from the same places the four tabs read: resolveDayOutlook
// (Daily + Weather), buildWeek (Weekly + Events) and buildEventImpact (Event
// detail), so an answer can't disagree with the screen.

import { v } from "convex/values";
import { internalQuery, type QueryCtx } from "./_generated/server";
import { buildEventImpact, buildWeek, readInputs } from "./outlookApp";
import { readCoefficients } from "./coefficients";
import { resolveDayOutlook } from "./lib/outlook";
import { indexEventsByCell, indexWeatherByZoneDay } from "./lib/resolve";
import { DAYPART_MINUTES, openDuring } from "./lib/hours";
import { currentWeekDates, DAYS, ZONES, CONCEPTS, keepKnown, scoreToBand, type Daypart, type Day } from "./lib/vocab";
import type { FactorRef, ScopeUsed } from "./lib/aiPass/grounding";

export type ToolPayload = {
  model: Record<string, unknown>;
  bag?: { refs: FactorRef[]; summary: string; scope: ScopeUsed };
};

const DP_LABEL: Record<Daypart, string> = { morning: "morning", midday: "midday", dinner: "dinner", late: "late night" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (n: number) => String(Number(n.toFixed(1)));
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${num(Math.abs(n))}`;
/** Untrusted text from Ticketmaster etc.: one line, no control characters, bounded. */
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const clean =(s: string | null | undefined, n = 80) => (s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, n);
/** "19:00" -> "7:00 PM" */
function clock(hhmm: string | null): string | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
const pretty = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const outsideWeek = (date: string) => ({
  model: {
    ok: false,
    error: "outside_week",
    message: `${date} is outside the current Monday-Sunday week, which is the only data available.`,
  },
});

function knownScope(zone: string, concept: string) {
  const [z] = keepKnown([zone], ZONES);
  const [c] = keepKnown([concept], CONCEPTS);
  return z && c ? { zone: z, concept: c } : null;
}

function dayOfWeekDate(date: string): Day | null {
  const week = currentWeekDates(new Date());
  return DAYS.find((d) => week[d] === date) ?? null;
}

// ---------------------------------------------------------------------------
// One day (Daily Outlook + the per-period weather the Weather tab shows)
// ---------------------------------------------------------------------------

async function computeDay(ctx: QueryCtx, zone: string, concept: string, date: string, clerkId: string | undefined) {
  const day = dayOfWeekDate(date);
  if (!day) return { outside: true as const };

  const inputs = await readInputs(ctx, { zone, concept, days: [day] });
  const record = inputs.records[0];
  const dayEvents = inputs.events.filter((e) => e.date === date);
  const dayWeather = inputs.weather.filter((w) => w.date === date);
  if (!record) return { outside: false as const, none: "no_base_data" as const };

  const coeffs = await readCoefficients(ctx);
  const outlook = resolveDayOutlook({
    zone,
    concept,
    day,
    date,
    dayparts: record.dayparts,
    eventsByCell: indexEventsByCell(dayEvents),
    weatherByZoneDay: indexWeatherByZoneDay(dayWeather),
    coeffs,
  });

  // The operator's own hours apply only when asking about their own zone + type.
  let hours: Parameters<typeof openDuring>[0] | null = null;
  if (clerkId) {
    const op = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (op && op.zone === zone && op.conceptType === concept) hours = op.operatingHours;
  }

  const eventIdByKey = new Map(dayEvents.map((e) => [`${e.name}|${e.venue_name}`, e.event_id]));
  const weatherRow = dayWeather[0];

  const refs: FactorRef[] = [];
  const events = new Map<
    string,
    { ref: string; name: string; venue: string; class: string; time: string | null; effects: { daypart: Daypart; liftPct: number }[] }
  >();
  for (const e of outlook.drivers.events) {
    const key = `${e.name}|${e.venue}`;
    const id = eventIdByKey.get(key) ?? clean(key, 40);
    const entry = events.get(key) ?? {
      ref: `event:${id}`,
      name: clean(e.name),
      venue: clean(e.venue),
      class: e.class,
      time: clock(e.time),
      effects: [],
    };
    entry.effects.push({ daypart: e.daypart, liftPct: e.lift_percent ?? 0 });
    events.set(key, entry);
  }
  for (const e of events.values()) {
    const top = [...e.effects].sort((a, b) => b.liftPct - a.liftPct)[0];
    refs.push({
      ref: e.ref,
      type: "event",
      title: e.name,
      fact: `${e.name}${e.venue ? ` at ${e.venue}` : ""}${e.time ? ` (${e.time})` : ""} adds about ${num(top.liftPct)}% to ${DP_LABEL[top.daypart]} demand.`,
    });
  }

  const dayparts = outlook.dayparts.map((d) => {
    const w = outlook.drivers.weather.find((x) => x.daypart === d.daypart);
    const [start, end] = DAYPART_MINUTES[d.daypart];
    const open = hours ? openDuring(hours, date, start, end) : undefined;
    const vsNormal = Number(d.combined_percent);
    const weatherEffect = w ? w.weather_impact_percent : null;
    refs.push({
      ref: `demand:${date}:${d.daypart}`,
      type: "demand",
      title: `${cap(DP_LABEL[d.daypart])} demand`,
      fact: `${cap(DP_LABEL[d.daypart])} demand is ${d.band} (${num(d.score)}), ${signed(vsNormal)}% vs normal.`,
    });
    if (w) {
      refs.push({
        ref: `weather:${date}:${d.daypart}`,
        type: "weather",
        title: `${cap(DP_LABEL[d.daypart])} weather`,
        fact: `${w.condition}, ${Math.round(w.temp_f)}°F; weather effect on ${DP_LABEL[d.daypart]} demand ${signed(w.weather_impact_percent)}%.`,
      });
    }
    return {
      daypart: d.daypart,
      score: d.score,
      band: d.band,
      normalScore: d.base_score,
      normalBand: scoreToBand(d.base_score),
      vsNormalPct: vsNormal,
      ...(open === undefined ? {} : { open }),
      weather: w
        ? {
            condition: w.condition,
            tempF: Math.round(w.temp_f),
            precipChancePct: weatherRow ? Math.round(weatherRow[d.daypart].precip_chance) : null,
            effectPct: weatherEffect,
          }
        : null,
      eventRefs: [...events.values()].filter((e) => e.effects.some((x) => x.daypart === d.daypart)).map((e) => e.ref),
    };
  });

  // The usual shape of this weekday for this zone + type (the base scores).
  const busiestNormal = [...outlook.dayparts].sort((a, b) => b.base_score - a.base_score)[0];
  refs.push({
    ref: `pattern:${date}`,
    type: "pattern",
    title: `${day} pattern`,
    fact: `A normal ${day} runs busiest at ${DP_LABEL[busiestNormal.daypart]} (${num(busiestNormal.base_score)}, ${scoreToBand(busiestNormal.base_score)}) for this zone and restaurant type.`,
  });

  const peak = outlook.peak;
  const peakPart = dayparts.find((d) => d.daypart === peak.daypart);
  const eventBits = [...events.values()]
    .slice(0, 2)
    .map((e) => `${e.name}${e.time ? ` (${e.time})` : ""}`)
    .join("; ");
  const wx = peakPart?.weather;
  const summary =
    `${day} ${pretty(date)}, ${zone}, ${concept}: busiest ${DP_LABEL[peak.daypart]}, ${peak.band} (${num(peak.score)}, ${signed(Number(peak.combined_percent))}% vs normal).` +
    (wx ? ` Weather then: ${wx.condition}, ${wx.tempF}°F.` : "") +
    (eventBits ? ` Events: ${eventBits}.` : " No nearby events.");

  return {
    outside: false as const,
    none: null,
    day,
    date,
    dayparts,
    events: [...events.values()],
    peak: { daypart: peak.daypart, score: peak.score, band: peak.band },
    refs,
    summary,
  };
}

const scopeArgs = { zone: v.string(), concept: v.string(), clerkId: v.optional(v.string()) };

export const dayData = internalQuery({
  args: { ...scopeArgs, date: v.string() },
  handler: async (ctx, args): Promise<ToolPayload> => {
    const scope = knownScope(args.zone, args.concept);
    if (!scope) return { model: { ok: false, error: "unknown_scope" } };
    const d = await computeDay(ctx, scope.zone, scope.concept, args.date, args.clerkId);
    if (d.outside) return outsideWeek(args.date);
    if (d.none) {
      return { model: { ok: false, error: "no_data", message: "No demand data for this zone, restaurant type and day." } };
    }
    return {
      model: {
        ok: true,
        scope: { ...scope, date: d.date, day: d.day },
        peak: d.peak,
        dayparts: d.dayparts,
        eventCount: d.events.length,
        events: d.events,
        refs: d.refs.map((r) => r.ref),
      },
      bag: { refs: d.refs, summary: d.summary, scope: { ...scope, date: d.date } },
    };
  },
});

// ---------------------------------------------------------------------------
// Weather (one day in detail, or the whole week)
// ---------------------------------------------------------------------------

export const weatherData = internalQuery({
  args: { ...scopeArgs, date: v.optional(v.string()) },
  handler: async (ctx, args): Promise<ToolPayload> => {
    const scope = knownScope(args.zone, args.concept);
    if (!scope) return { model: { ok: false, error: "unknown_scope" } };

    if (args.date) {
      const d = await computeDay(ctx, scope.zone, scope.concept, args.date, args.clerkId);
      if (d.outside) return outsideWeek(args.date);
      if (d.none) return { model: { ok: false, error: "no_data" } };
      const periods = d.dayparts.map((p) => ({ daypart: p.daypart, ...(p.weather ?? { condition: null }) }));
      const refs = d.refs.filter((r) => r.type === "weather");
      if (refs.length === 0) {
        return { model: { ok: false, error: "no_weather", message: "No weather reading is stored for that day." } };
      }
      return {
        model: { ok: true, scope: { ...scope, date: d.date, day: d.day }, periods, refs: refs.map((r) => r.ref) },
        bag: { refs, summary: d.summary, scope: { ...scope, date: d.date } },
      };
    }

    const week = await buildWeek(ctx, scope.zone, scope.concept);
    const refs: FactorRef[] = [];
    const days = week.days
      .filter((d) => d.weather)
      .map((d) => {
        const w = d.weather!;
        const effect = d.weatherImpact?.percent ?? null;
        refs.push({
          ref: `weather:${d.date}`,
          type: "weather",
          title: `${d.day} weather`,
          fact: `${d.day}: ${w.condition}, high ${Math.round(w.highF)}°F / low ${Math.round(w.lowF)}°F, ${Math.round(w.precipChance)}% rain chance${effect === null ? "" : `; weather effect ${signed(effect)}%`}.`,
        });
        return {
          ref: `weather:${d.date}`,
          date: d.date,
          day: d.day,
          condition: w.condition,
          highF: Math.round(w.highF),
          lowF: Math.round(w.lowF),
          precipChancePct: Math.round(w.precipChance),
          effectPct: effect,
        };
      });
    if (days.length === 0) return { model: { ok: false, error: "no_weather" } };
    return {
      model: { ok: true, scope: { ...scope, date: null }, days },
      bag: { refs, summary: refs.map((r) => r.fact).join(" "), scope: { ...scope, date: null } },
    };
  },
});

// ---------------------------------------------------------------------------
// The week (Weekly Outlook)
// ---------------------------------------------------------------------------

export const weekData = internalQuery({
  args: scopeArgs,
  handler: async (ctx, args): Promise<ToolPayload> => {
    const scope = knownScope(args.zone, args.concept);
    if (!scope) return { model: { ok: false, error: "unknown_scope" } };
    const week = await buildWeek(ctx, scope.zone, scope.concept);
    const refs: FactorRef[] = [];

    const days = week.days.map((d) => {
      const dem = d.demand;
      if (dem) {
        refs.push({
          ref: `week:${d.date}`,
          type: "week",
          title: `${d.day} outlook`,
          fact: `${d.day}: busiest ${DP_LABEL[dem.peakDaypart as Daypart] ?? dem.peakDaypart}, ${dem.peakBand} (${num(dem.peakScore)}).`,
        });
      }
      return {
        ref: `week:${d.date}`,
        date: d.date,
        day: d.day,
        isToday: d.date === week.today,
        peak: dem ? { daypart: dem.peakDaypart, score: dem.peakScore, band: dem.peakBand } : null,
        dayparts: dem
          ? [
              { daypart: "morning", score: dem.morningScore, band: scoreToBand(dem.morningScore) },
              { daypart: "midday", score: dem.middayScore, band: scoreToBand(dem.middayScore) },
              { daypart: "dinner", score: dem.dinnerScore, band: scoreToBand(dem.dinnerScore) },
              { daypart: "late", score: dem.lateScore, band: scoreToBand(dem.lateScore) },
            ]
          : null,
        weather: d.weather
          ? {
              condition: d.weather.condition,
              highF: Math.round(d.weather.highF),
              lowF: Math.round(d.weather.lowF),
              precipChancePct: Math.round(d.weather.precipChance),
              effectPct: d.weatherImpact?.percent ?? null,
            }
          : null,
        eventCount: week.events.filter((e) => e.date === d.date).length,
      };
    });

    const rank = { High: 0, Moderate: 1, Low: 2 } as const;
    const topEvents = [...week.events]
      .sort((a, b) => rank[a.influence] - rank[b.influence] || (b.liftPercent ?? 0) - (a.liftPercent ?? 0))
      .slice(0, 8)
      .map((e) => {
        const ref = `event:${e.eventId}`;
        const t = clock(e.time);
        refs.push({
          ref,
          type: "event",
          title: clean(e.name),
          fact: `${clean(e.name)}${e.venue ? ` at ${clean(e.venue)}` : ""} on ${e.date}${t ? ` (${t})` : ""}${e.liftPercent === null ? "" : ` adds about ${num(e.liftPercent)}% to its busiest period`}.`,
        });
        return {
          ref,
          date: e.date,
          name: clean(e.name),
          venue: clean(e.venue),
          time: t,
          influence: e.influence,
          liftPct: e.liftPercent,
          daypart: e.allDayparts ? "all" : e.daypart,
        };
      });

    const peakDay = [...week.days].filter((d) => d.demand).sort((a, b) => b.demand!.peakScore - a.demand!.peakScore)[0];
    return {
      model: { ok: true, scope: { ...scope, date: null }, today: week.today, totalEvents: week.events.length, days, topEvents },
      bag: {
        refs,
        summary: peakDay
          ? `This week in ${scope.zone} (${scope.concept}): busiest day ${peakDay.day}, ${peakDay.demand!.peakBand} (${num(peakDay.demand!.peakScore)}).`
          : "",
        scope: { ...scope, date: null },
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Events (Events Overview + Event detail)
// ---------------------------------------------------------------------------

export const eventsData = internalQuery({
  args: { ...scopeArgs, date: v.optional(v.string()), minInfluence: v.optional(v.union(v.literal("Low"), v.literal("Moderate"), v.literal("High"))) },
  handler: async (ctx, args): Promise<ToolPayload> => {
    const scope = knownScope(args.zone, args.concept);
    if (!scope) return { model: { ok: false, error: "unknown_scope" } };
    if (args.date && !dayOfWeekDate(args.date)) return outsideWeek(args.date);

    const week = await buildWeek(ctx, scope.zone, scope.concept);
    const order = { Low: 0, Moderate: 1, High: 2 } as const;
    const min = order[args.minInfluence ?? "Low"];
    const picked = week.events
      .filter((e) => (!args.date || e.date === args.date) && order[e.influence] >= min)
      .slice(0, 15);

    const refs: FactorRef[] = [];
    const events = picked.map((e) => {
      const ref = `event:${e.eventId}`;
      const t = clock(e.time);
      refs.push({
        ref,
        type: "event",
        title: clean(e.name),
        fact: `${clean(e.name)}${e.venue ? ` at ${clean(e.venue)}` : ""} on ${e.date}${t ? ` (${t})` : ""}${e.liftPercent === null ? "" : ` adds about ${num(e.liftPercent)}% to its busiest period`}.`,
      });
      return {
        ref,
        date: e.date,
        name: clean(e.name),
        venue: clean(e.venue),
        class: e.eventClass,
        time: t,
        influence: e.influence,
        liftPct: e.liftPercent,
        distanceMiles: e.distanceMiles,
        daypart: e.allDayparts ? "all" : e.daypart,
      };
    });

    return {
      model: {
        ok: true,
        scope: { ...scope, date: args.date ?? null },
        total: picked.length,
        events,
        ...(events.length === 0 ? { note: "No matching events nearby in this period." } : {}),
      },
      bag: {
        refs,
        summary:
          events.length === 0
            ? `No matching events near ${scope.zone} in that period.`
            : `${events.length} nearby event${events.length === 1 ? "" : "s"}; biggest: ${events[0].name} on ${events[0].date}.`,
        scope: { ...scope, date: args.date ?? null },
      },
    };
  },
});

export const eventImpactData = internalQuery({
  args: { zone: v.string(), concept: v.string(), eventId: v.string() },
  handler: async (ctx, args): Promise<ToolPayload> => {
    const scope = knownScope(args.zone, args.concept);
    if (!scope) return { model: { ok: false, error: "unknown_scope" } };
    const id = args.eventId.replace(/^event:/, "");
    const r = await buildEventImpact(ctx, scope.zone, scope.concept, { eventId: id });
    if (!r) return { model: { ok: false, error: "not_found", message: "That event isn't in this zone's window." } };

    const ref = `event:${r.event.eventId}`;
    const t = clock(r.event.time);
    const name = clean(r.event.name);
    const fact = `${name}${r.event.venue ? ` at ${clean(r.event.venue)}` : ""} on ${r.event.date}${t ? ` (${t})` : ""} adds about ${num(r.headlinePercent)}% to ${DP_LABEL[r.event.headlineDaypart] ?? r.event.headlineDaypart} demand.`;
    return {
      model: {
        ok: true,
        scope: { ...scope, date: r.event.date },
        event: { ref, name, venue: clean(r.event.venue), class: r.event.eventClass, date: r.event.date, time: t, influence: r.event.influence, distanceMiles: r.event.distanceMiles },
        headlineDaypart: r.event.headlineDaypart,
        headlinePercent: r.headlinePercent,
        impactBand: r.impactBand,
        dayparts: r.dayparts,
      },
      bag: { refs: [{ ref, type: "event", title: name, fact }], summary: fact, scope: { ...scope, date: r.event.date } },
    };
  },
});
