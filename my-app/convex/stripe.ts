// Checkout + billing portal for the Event Intelligence plan ($99/mo, the only
// plan on offer per the owner). One week of full access from signup
// (`lib/access.ts`), then the Intelligence pages gate until the operator
// subscribes. `stripe.ts` here is the Convex functions; `lib/stripe.ts` is the
// bare REST client; the webhook that keeps subscriptionStatus in sync as
// Stripe's own source of truth lives in http.ts.

import { v } from "convex/values";
import { action, internalMutation, internalQuery, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { stripe } from "./lib/stripe";
import { isPaidStatus } from "./lib/access";

function priceId(): string {
  // Known id of the owner's "Event Intelligence" $99/mo price (from the
  // Stripe test dashboard); overridable via env so switching plans or moving
  // to live mode doesn't need a code change.
  return process.env.STRIPE_PRICE_ID ?? "price_1UAo5SRJAzfW9wSLeibLDBIO";
}

export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getByCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("operators")
      .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .unique();
  },
});

export const setCustomerId = internalMutation({
  args: { operatorId: v.id("operators"), stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch("operators", args.operatorId, { stripeCustomerId: args.stripeCustomerId });
  },
});

/** Applies a subscription snapshot — but only if it's not older than the last
 * one we applied (`eventCreatedAt`). Stripe's webhook delivery is at-least-once
 * AND unordered, so a retried or delayed "active" event can arrive after a
 * newer "canceled" one; without this guard that replay would silently
 * re-open access. Equal timestamps still apply (safe: same source data, so
 * reapplying is a no-op either way) — only a strictly older one is dropped. */
export const setSubscription = internalMutation({
  args: {
    operatorId: v.id("operators"),
    stripeSubscriptionId: v.string(),
    subscriptionStatus: v.string(),
    currentPeriodEnd: v.number(),
    eventCreatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const op = await ctx.db.get("operators", args.operatorId);
    if (op?.subscriptionEventAt !== undefined && args.eventCreatedAt < op.subscriptionEventAt) {
      console.warn("[stripe] dropping out-of-order subscription event", {
        operatorId: args.operatorId,
        incoming: args.eventCreatedAt,
        lastApplied: op.subscriptionEventAt,
      });
      return;
    }
    await ctx.db.patch("operators", args.operatorId, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: args.subscriptionStatus,
      currentPeriodEnd: args.currentPeriodEnd,
      subscriptionEventAt: args.eventCreatedAt,
    });
  },
});

async function ensureCustomer(ctx: ActionCtx, clerkId: string, email: string | undefined) {
  const op = await ctx.runQuery(internal.stripe.getByClerkId, { clerkId });
  if (!op) throw new Error("Finish onboarding first.");
  if (op.stripeCustomerId) return { op, customerId: op.stripeCustomerId };

  const customer = await stripe.createCustomer({ email, metadata: { clerkId } });
  await ctx.runMutation(internal.stripe.setCustomerId, { operatorId: op._id, stripeCustomerId: customer.id });
  return { op, customerId: customer.id };
}

/** Billing page "Upgrade" button. `origin` is the caller's own
 * `window.location.origin` (e.g. http://localhost:3010) — used only to build
 * the redirect-back URLs, never trusted for anything else. */
export const createCheckoutSession = action({
  args: { origin: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in.");
    const { op, customerId } = await ensureCustomer(ctx, identity.subject, identity.email);
    // Guards the direct-call path; the Billing page already disables the
    // button for a subscribed operator, but this is what actually stops a
    // second $99 subscription (and a double charge) if that client check is
    // ever bypassed or races a stale render.
    if (isPaidStatus(op.subscriptionStatus)) {
      throw new Error("You already have an active Event Intelligence subscription.");
    }

    const session = await stripe.createCheckoutSession({
      customer: customerId,
      priceId: priceId(),
      successUrl: `${args.origin}/billing?checkout=success`,
      cancelUrl: `${args.origin}/billing?checkout=cancelled`,
      clientReferenceId: identity.subject,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  },
});

/** Billing page "Manage billing" — Stripe's own portal for updating the card,
 * downloading invoices, or cancelling. */
export const createPortalSession = action({
  args: { origin: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in.");
    const op = await ctx.runQuery(internal.stripe.getByClerkId, { clerkId: identity.subject });
    if (!op?.stripeCustomerId) throw new Error("No billing account yet — subscribe first.");
    const session = await stripe.createPortalSession({ customer: op.stripeCustomerId, returnUrl: `${args.origin}/billing` });
    return { url: session.url };
  },
});

/** Called once, right after Stripe redirects back to /billing?checkout=success
 * — reads the session Stripe just completed and syncs the subscription. The
 * webhook (http.ts) is the durable source of truth for everything AFTER this
 * (renewals, cancellations); this just avoids the first page load racing it. */
export const syncCheckoutSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args): Promise<{ status: string } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in.");

    const session = await stripe.retrieveCheckoutSession(args.sessionId);
    if (session.clientReferenceId !== undefined && session.clientReferenceId !== identity.subject) {
      throw new Error("This checkout session belongs to a different account.");
    }
    const sub = session.subscription;
    if (!sub || typeof sub === "string") return null; // not expanded / not a subscription session

    const op = await ctx.runQuery(internal.stripe.getByClerkId, { clerkId: identity.subject });
    if (!op) throw new Error("Finish onboarding first.");
    await ctx.runMutation(internal.stripe.setSubscription, {
      operatorId: op._id,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: sub.current_period_end * 1000,
      eventCreatedAt: Date.now(), // a live read of Stripe, taken right now
    });
    return { status: sub.status };
  },
});
