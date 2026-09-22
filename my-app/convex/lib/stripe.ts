// Minimal Stripe REST client over `fetch` — no `stripe` npm package, so no
// Node runtime is needed (Convex's default V8 runtime is enough, same as the
// Clerk/Google integrations elsewhere in this codebase).

const API = "https://api.stripe.com/v1";

function key(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("STRIPE_SECRET_KEY is not set. Run `npx convex env set STRIPE_SECRET_KEY sk_test_...`.");
  return k;
}

// Stripe's form encoding: nested objects/arrays become bracketed keys, e.g.
// {line_items: [{price: "x"}]} -> "line_items[0][price]=x".
// Primitives only ever come from string/number/boolean fields we pass in
// ourselves (see the call sites below), so this covers every real case.
function primitiveToString(v: string | number | boolean): string {
  return typeof v === "string" ? v : String(v);
}

function encodeForm(params: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const fullKey = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item: unknown, i) => {
        if (typeof item === "object" && item !== null) out.push(...encodeForm(item as Record<string, unknown>, `${fullKey}[${i}]`));
        else out.push(`${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(primitiveToString(item as string | number | boolean))}`);
      });
    } else if (typeof v === "object") {
      out.push(...encodeForm(v as Record<string, unknown>, fullKey));
    } else {
      out.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(primitiveToString(v as string | number | boolean))}`);
    }
  }
  return out;
}

interface StripeError {
  error?: { message?: string; type?: string; code?: string };
}

async function call<T>(method: "GET" | "POST", path: string, params?: Record<string, unknown>): Promise<T> {
  const url = method === "GET" && params ? `${API}${path}?${encodeForm(params).join("&")}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key()}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" && params ? encodeForm(params).join("&") : undefined,
  });
  const body = (await res.json()) as T & StripeError;
  if (!res.ok) {
    throw new Error(`Stripe ${method} ${path} failed: ${body.error?.message ?? res.statusText}`);
  }
  return body;
}

export interface StripeCustomer {
  id: string;
  email?: string | null;
}

export interface StripeSubscription {
  id: string;
  status: string;
  current_period_end: number; // unix seconds
  customer: string;
}

interface RawStripeCheckoutSession {
  id: string;
  url?: string | null;
  customer?: string | null;
  subscription?: string | StripeSubscription | null;
  payment_status?: string;
  client_reference_id?: string | null;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  customer: string | null;
  subscription: string | StripeSubscription | null;
  paymentStatus: string | undefined;
  clientReferenceId: string | null;
}

function normalizeSession(raw: RawStripeCheckoutSession): StripeCheckoutSession {
  return {
    id: raw.id,
    url: raw.url ?? null,
    customer: raw.customer ?? null,
    subscription: raw.subscription ?? null,
    paymentStatus: raw.payment_status,
    clientReferenceId: raw.client_reference_id ?? null,
  };
}

export const stripe = {
  createCustomer: (params: { email?: string; metadata: Record<string, string> }) =>
    call<StripeCustomer>("POST", "/customers", params),

  createCheckoutSession: async (params: {
    customer: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    clientReferenceId: string;
  }): Promise<StripeCheckoutSession> =>
    normalizeSession(await call<RawStripeCheckoutSession>("POST", "/checkout/sessions", {
      customer: params.customer,
      mode: "subscription",
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.clientReferenceId,
    })),

  retrieveCheckoutSession: async (id: string): Promise<StripeCheckoutSession> =>
    normalizeSession(await call<RawStripeCheckoutSession>("GET", `/checkout/sessions/${id}`, { "expand[]": "subscription" })),

  retrieveSubscription: (id: string) => call<StripeSubscription>("GET", `/subscriptions/${id}`),

  createPortalSession: (params: { customer: string; returnUrl: string }) =>
    call<{ url: string }>("POST", "/billing_portal/sessions", { customer: params.customer, return_url: params.returnUrl }),
};
