// The tools AI Pass's model can call. Five read the same data the four tabs show
// (convex/aiPassData.ts); `reply` is how the model delivers its answer, and it
// is checked against that data before anything is saved (grounding.ts).
//
// Scope is enforced here, not trusted to the model: a zone / restaurant type the
// model passes is used only if it is already in scope or the user's message names
// it (scope.ts resolveScopeArg); a day must be one of this week's dates.

import { z } from "zod";
import { createTool } from "@convex-dev/agent";
import { internal } from "../../_generated/api";
import type { ToolPayload } from "../../aiPassData";
import { ZONES, CONCEPTS } from "../vocab";
import { resolveScopeArg, weekCalendar, type EffectiveScope } from "./scope";
import { buildCard, type FactBag } from "./grounding";

export function makeTools(args: {
  clerkId: string;
  scope: EffectiveScope;
  /** Zones / restaurant types the user's current message names. */
  named: { zones: ReadonlySet<string>; concepts: ReadonlySet<string> };
  bag: FactBag;
}) {
  const { clerkId, scope, named, bag } = args;

  const dates = weekCalendar().days.map((d) => d.date) as [string, ...string[]];
  const zoneArg = z.enum(ZONES).optional().describe("Only if the user named a different zone. Omit otherwise.");
  const conceptArg = z.enum(CONCEPTS).optional().describe("Only if the user named a different restaurant type. Omit otherwise.");
  const dateArg = z.enum(dates).optional().describe("A date this week. Omit for the day in scope.");

  /** Apply the scope rule, run the read, and report what came back to the FactBag. */
  async function run(
    name: string,
    zoneIn: string | undefined,
    conceptIn: string | undefined,
    read: (zone: string, concept: string) => Promise<ToolPayload>,
  ) {
    bag.calls.push(name);
    const zone = resolveScopeArg(zoneIn as EffectiveScope["zone"] | undefined, scope.zone, named.zones);
    const concept = resolveScopeArg(conceptIn as EffectiveScope["concept"] | undefined, scope.concept, named.concepts);
    // The model reached for a zone or restaurant type the person never named (a guess from a
    // typo, a hint, or its own idea). Never answer for it: have it confirm first.
    const guessed = [
      zone.overridden && zoneIn ? `zone "${zoneIn}"` : null,
      concept.overridden && conceptIn ? `restaurant type "${conceptIn}"` : null,
    ].filter(Boolean);
    if (guessed.length > 0) {
      return {
        ok: false,
        error: "needs_confirmation",
        message: `The user did not name ${guessed.join(" or ")}. Do not assume it and do not call more data tools. Ask which they mean with reply kind "clarify": a short question such as "Did you mean ${zoneIn ?? conceptIn}?" and options that contain the exact name, such as "Yes, ${zoneIn ?? conceptIn}" and "No, ${scope.zone}".`,
      };
    }
    const res = await read(zone.value, concept.value);

    if (res.bag) {
      res.bag.refs.forEach((r) => bag.addRef(r));
      bag.addSummary(res.bag.summary);
      bag.addScope(res.bag.scope);
    }
    bag.addResult(res.model);

    return res.model;
  }

  return {
    get_day_outlook: createTool({
      description:
        "One day's demand by period (morning, midday, dinner, late): score, band, vs normal, weather and nearby events. Use for 'how busy', 'why is dinner busy', staffing or prep questions about a day.",
      inputSchema: z.object({ date: dateArg, zone: zoneArg, concept: conceptArg }),
      execute: (ctx, input) =>
        run("get_day_outlook", input.zone, input.concept, (zone, concept) =>
          ctx.runQuery(internal.aiPassData.dayData, { zone, concept, clerkId, date: input.date ?? scope.date }),
        ),
    }),

    get_week_overview: createTool({
      description:
        "The whole Monday-Sunday week: each day's peak period and band, weather and event count, plus the top events (no need to also call list_events). Use for 'this week', 'busiest day', weekend or comparing days.",
      inputSchema: z.object({ zone: zoneArg, concept: conceptArg }),
      execute: (ctx, input) =>
        run("get_week_overview", input.zone, input.concept, (zone, concept) =>
          ctx.runQuery(internal.aiPassData.weekData, { zone, concept, clerkId }),
        ),
    }),

    list_events: createTool({
      description:
        "Nearby events this week with venue, time, influence and estimated lift. Use for 'any events', 'what's happening', 'what's driving demand'.",
      inputSchema: z.object({
        date: dateArg,
        minInfluence: z.enum(["Low", "Moderate", "High"]).optional().describe("Smallest influence to include."),
        zone: zoneArg,
        concept: conceptArg,
      }),
      execute: (ctx, input) =>
        run("list_events", input.zone, input.concept, (zone, concept) =>
          ctx.runQuery(internal.aiPassData.eventsData, {
            zone,
            concept,
            clerkId,
            ...(input.date ? { date: input.date } : {}),
            ...(input.minInfluence ? { minInfluence: input.minInfluence } : {}),
          }),
        ),
    }),

    get_event_impact: createTool({
      description:
        "One event's effect on demand by period. Needs an eventId from list_events or get_week_overview (the ref without 'event:' is fine).",
      inputSchema: z.object({ eventId: z.string().min(1).max(120), zone: zoneArg, concept: conceptArg }),
      execute: (ctx, input) =>
        run("get_event_impact", input.zone, input.concept, (zone, concept) =>
          ctx.runQuery(internal.aiPassData.eventImpactData, { zone, concept, eventId: input.eventId }),
        ),
    }),

    get_weather: createTool({
      description:
        "Weather and its effect on demand. With a date: each period's condition, temperature, rain chance and effect. Without: the week's days.",
      inputSchema: z.object({ date: dateArg, zone: zoneArg, concept: conceptArg }),
      execute: (ctx, input) =>
        run("get_weather", input.zone, input.concept, (zone, concept) =>
          ctx.runQuery(internal.aiPassData.weatherData, { zone, concept, clerkId, ...(input.date ? { date: input.date } : {}) }),
        ),
    }),

    compare_areas: createTool({
      description:
        "Rank ALL zones (areas) for one restaurant type on one day, optionally for one period. Use for 'which area is busiest', 'where is dinner highest', 'how does Midtown compare'.",
      inputSchema: z.object({
        date: dateArg,
        daypart: z.enum(["morning", "midday", "dinner", "late"]).optional().describe("One period. Omit for each zone's busiest."),
        concept: conceptArg,
      }),
      execute: (ctx, input) =>
        run("compare_areas", undefined, input.concept, (_zone, concept) =>
          ctx.runQuery(internal.aiPassData.compareAreas, {
            concept,
            date: input.date ?? scope.date,
            ...(input.daypart ? { daypart: input.daypart } : {}),
          }),
        ),
    }),

    compare_restaurant_types: createTool({
      description:
        "Rank ALL restaurant types in one zone on one day, optionally for one period. Use for 'which type does best here', 'is a sports bar better than a cafe here'.",
      inputSchema: z.object({
        date: dateArg,
        daypart: z.enum(["morning", "midday", "dinner", "late"]).optional().describe("One period. Omit for each type's busiest."),
        zone: zoneArg,
      }),
      execute: (ctx, input) =>
        run("compare_restaurant_types", input.zone, undefined, (zone) =>
          ctx.runQuery(internal.aiPassData.compareConcepts, {
            zone,
            date: input.date ?? scope.date,
            ...(input.daypart ? { daypart: input.daypart } : {}),
          }),
        ),
    }),

    reply: createTool({
      description: "Deliver the final answer to the operator. Call exactly once. Call it after the data tools for a forecast question. For a greeting with no question, call it alone, with no data tools.",
      inputSchema: z.object({
        kind: z.enum(["answer", "no_data", "refusal", "clarify"]),
        intro: z.string().max(600),
        factors: z
          .array(z.object({ title: z.string().max(80), detail: z.string().max(300), ref: z.string().max(120) }))
          .max(6),
        netImpact: z.string().max(400).nullable(),
        followUps: z.array(z.string().max(90)).max(4),
      }),
      execute: async (_ctx, input) => {
        bag.calls.push("reply");
        return buildCard(input, bag);
      },
    }),
  };
}

export const DATA_TOOL_NAMES = [
  "get_day_outlook",
  "get_week_overview",
  "list_events",
  "get_event_impact",
  "get_weather",
  "compare_areas",
  "compare_restaurant_types",
] as const;
