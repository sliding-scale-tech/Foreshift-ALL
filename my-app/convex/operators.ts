// Operator (restaurant) profiles for the NEW web app's onboarding flow — see
// foreshift-new/web/app/onboarding. Unrelated to Bubble's own "Operator"
// table; see the comment on the `operators` table in schema.ts.

import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { ZONES, CONCEPTS } from "./lib/vocab";
import { computeAccess } from "./lib/access";

/** The signed-in user's operator profile, or null if they haven't onboarded
 * yet (or aren't signed in). Drives the onboarding redirect gate. */
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const op = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!op) return null;
    const access = computeAccess({ createdAt: op._creationTime, subscriptionStatus: op.subscriptionStatus });
    return { ...op, access };
  },
});

const operatingHoursValidator = v.array(
  v.object({
    day: v.string(),
    isClosed: v.boolean(),
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
  }),
);

/** Create the operator profile at the end of onboarding. One per account —
 * throws if this Clerk user already has one. */
export const create = mutation({
  // Zone and concept are the only fields the demand math actually needs, so
  // the "I'm exploring" onboarding branch supplies just those two and leaves
  // the restaurant details blank. Such an operator is a normal operator in
  // every other respect (trial, gate, billing); filling the blanks in on the
  // Settings page is all it takes to become a fully registered restaurant.
  args: {
    restaurantName: v.optional(v.string()),
    address: v.optional(v.string()),
    zone: v.string(),
    conceptType: v.string(),
    operatingHours: v.optional(operatingHoursValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in.");

    const existing = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existing) {
      throw new Error("Onboarding has already been completed for this account.");
    }

    await ctx.db.insert("operators", {
      clerkId: identity.subject,
      restaurantName: args.restaurantName ?? "",
      address: args.address ?? "",
      zone: args.zone,
      conceptType: args.conceptType,
      operatingHours: args.operatingHours ?? [],
    });
  },
});

async function myOperator(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in.");
  const op = await ctx.db
    .query("operators")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!op) throw new Error("Finish onboarding first.");
  return op;
}

/** Settings → Restaurant card. Zone and concept must be from the canonical
 * vocabulary (they key every forecast lookup). */
export const updateProfile = mutation({
  args: {
    restaurantName: v.string(),
    address: v.string(),
    zone: v.string(),
    conceptType: v.string(),
  },
  handler: async (ctx, args) => {
    const op = await myOperator(ctx);
    const name = args.restaurantName.trim();
    if (!name) throw new Error("Restaurant name is required.");
    if (!(ZONES as readonly string[]).includes(args.zone)) throw new Error("Unknown zone.");
    if (!(CONCEPTS as readonly string[]).includes(args.conceptType)) throw new Error("Unknown concept type.");
    await ctx.db.patch("operators", op._id, {
      restaurantName: name,
      address: args.address.trim(),
      zone: args.zone,
      conceptType: args.conceptType,
    });
  },
});

/** Settings → Operating Hours card. */
export const updateHours = mutation({
  args: { operatingHours: operatingHoursValidator },
  handler: async (ctx, args) => {
    const op = await myOperator(ctx);
    await ctx.db.patch("operators", op._id, { operatingHours: args.operatingHours });
  },
});

