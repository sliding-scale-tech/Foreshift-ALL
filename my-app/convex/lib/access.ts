// One place that decides "can this operator see the Intelligence pages
// (Daily/Weekly/Events/Weather Outlook) right now" — used by both the
// operators query (so the client can render the gate) and nowhere else, so
// there is exactly one definition of "trial" and "paid" to keep in sync.

const TRIAL_DAYS = 7;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

// Stripe subscription statuses that count as "paying" for gate purposes.
// past_due still has access (Stripe is mid-retry on the card); once Stripe
// gives up it moves to unpaid/canceled and access drops.
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Shared with stripe.ts, so "already paying, don't let them buy a second
 * subscription" uses the exact same definition of "paying" as the gate does. */
export function isPaidStatus(status: string | undefined): boolean {
  return status !== undefined && ACTIVE_STATUSES.has(status);
}

export interface AccessInfo {
  hasAccess: boolean;
  reason: "trial" | "subscribed" | "expired";
  trialEndsAt: number;
  isSubscribed: boolean;
}

export function computeAccess(args: {
  createdAt: number;
  subscriptionStatus: string | undefined;
}): AccessInfo {
  const trialEndsAt = args.createdAt + TRIAL_MS;
  const isSubscribed = isPaidStatus(args.subscriptionStatus);
  if (isSubscribed) return { hasAccess: true, reason: "subscribed", trialEndsAt, isSubscribed };
  if (Date.now() < trialEndsAt) return { hasAccess: true, reason: "trial", trialEndsAt, isSubscribed };
  return { hasAccess: false, reason: "expired", trialEndsAt, isSubscribed };
}
