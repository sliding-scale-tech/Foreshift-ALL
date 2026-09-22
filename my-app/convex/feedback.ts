// "How was your day?" — the operator app's Feedback Loop dialog. Operators log
// how busy each daypart of today actually was; ForeShift compares it with the
// forecast to recalibrate (spec §6). Private to each operator.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DAYPARTS, dayFromLocalDate, detroitDate } from "./lib/vocab";

const ACTUALS = ["Dead", "Slow", "Steady", "Busy", "Slammed", "Closed"] as const;

/** Today's predictions per daypart (from the resolved demand the Daily Outlook
 * shows) plus whatever this operator already submitted for today, so the
 * dialog can open pre-filled. Null when signed out / not onboarded. */
export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const op = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!op) return null;

    const date = detroitDate();
    const day = dayFromLocalDate(date);
    const resolved = day
      ? await ctx.db
          .query("resolvedDemand")
          .withIndex("by_zone_concept_day", (q) =>
            q.eq("zone", op.zone).eq("concept", op.conceptType).eq("day", day),
          )
          .unique()
      : null;
    const existing = await ctx.db
      .query("feedback")
      .withIndex("by_clerkId_and_date", (q) => q.eq("clerkId", identity.subject).eq("date", date))
      .unique();

    return {
      date,
      dayparts: DAYPARTS.map((dp) => ({
        daypart: dp,
        predictedScore: resolved ? resolved[`${dp}Score`] : null,
        predictedBand: resolved ? resolved[`${dp}Band`] : null,
        actual: existing?.dayparts.find((d) => d.daypart === dp)?.actual ?? null,
      })),
    };
  },
});

/** Save (or replace) today's feedback. The prediction is looked up here, not
 * taken from the client, so it can't be forged. */
export const submit = mutation({
  args: {
    dayparts: v.array(v.object({ daypart: v.string(), actual: v.string() })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in.");
    const op = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!op) throw new Error("Finish onboarding first.");

    const seen = new Set<string>();
    for (const d of args.dayparts) {
      if (!(DAYPARTS as readonly string[]).includes(d.daypart)) throw new Error(`Unknown daypart: ${d.daypart}`);
      if (!(ACTUALS as readonly string[]).includes(d.actual)) throw new Error(`Unknown rating: ${d.actual}`);
      if (seen.has(d.daypart)) throw new Error(`Duplicate daypart: ${d.daypart}`);
      seen.add(d.daypart);
    }
    if (args.dayparts.length === 0) throw new Error("Pick at least one daypart.");

    const date = detroitDate();
    const day = dayFromLocalDate(date);
    const resolved = day
      ? await ctx.db
          .query("resolvedDemand")
          .withIndex("by_zone_concept_day", (q) =>
            q.eq("zone", op.zone).eq("concept", op.conceptType).eq("day", day),
          )
          .unique()
      : null;

    const dayparts = args.dayparts.map((d) => {
      const dp = d.daypart as (typeof DAYPARTS)[number];
      return {
        daypart: d.daypart,
        actual: d.actual,
        predictedScore: resolved ? resolved[`${dp}Score`] : undefined,
        predictedBand: resolved ? resolved[`${dp}Band`] : undefined,
      };
    });

    const row = {
      clerkId: identity.subject,
      zone: op.zone,
      concept: op.conceptType,
      date,
      dayparts,
      submittedAt: Date.now(),
    };
    const existing = await ctx.db
      .query("feedback")
      .withIndex("by_clerkId_and_date", (q) => q.eq("clerkId", identity.subject).eq("date", date))
      .unique();
    if (existing) await ctx.db.replace("feedback", existing._id, row);
    else await ctx.db.insert("feedback", row);
  },
});
