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
  reason: "trial" | "subscribed" | "free" | "expired";
  trialEndsAt: number;
  isSubscribed: boolean;
  /** 7 for Event Intelligence and the trial. 28 for a Power User. */
  forecastDays: 7 | 28;
  powerUser: boolean;
}

export function computeAccess(args: {
  createdAt: number;
  subscriptionStatus: string | undefined;
  /** operators.freeAccess: the team gave this account full access, no paywall. */
  freeAccess?: boolean;
  /** operators.powerUser: 28-day forecast, granted after Contact Sales. */
  powerUser?: boolean;
}): AccessInfo {
  const trialEndsAt = args.createdAt + TRIAL_MS;
  const powerUser = args.powerUser === true;
  const forecastDays: 7 | 28 = powerUser ? 28 : 7;
  const isSubscribed = isPaidStatus(args.subscriptionStatus);
  const base = { trialEndsAt, isSubscribed, forecastDays, powerUser };
  if (isSubscribed) return { hasAccess: true, reason: "subscribed", ...base };
  if (args.freeAccess === true) return { hasAccess: true, reason: "free", ...base };
  if (Date.now() < trialEndsAt) return { hasAccess: true, reason: "trial", ...base };
  return { hasAccess: false, reason: "expired", ...base };
}
