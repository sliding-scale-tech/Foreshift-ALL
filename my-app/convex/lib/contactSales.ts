// "Contact Sales" form: the plans, the fixed recipients, and the validation. Pure
// (no Convex or browser imports) so the web form and the server run exactly the
// same rules; the server's check is the one that counts.

/** The plans that can be asked about. Anything else is rejected. */
export const SALES_PLANS = {
  "dynamic-scheduling": { label: "Dynamic Scheduling", price: "$199/month" },
  "sales-forecasting": { label: "Sales Forecasting", price: "$299/month" },
} as const;

export type SalesPlan = keyof typeof SALES_PLANS;

export const SALES_PLAN_IDS = Object.keys(SALES_PLANS) as SalesPlan[];

/** Where sales enquiries go. Fixed here: the client can never choose a recipient. */
export const SALES_RECIPIENTS = ["info@foreshift.ai", "dev@foreshift.ai"] as const;

export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  restaurant: { max: 120 },
  phone: { max: 25 },
  message: { min: 10, max: 2000 },
} as const;

export type ContactField = "name" | "email" | "restaurant" | "phone" | "plan" | "message";

export type ContactValues = {
  name: string;
  email: string;
  restaurant: string;
  phone: string;
  plan: SalesPlan;
  message: string;
};

export type ContactResult =
  | { ok: true; values: ContactValues }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

/** One line: control characters become spaces, runs of spaces collapse. */
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

/** Keeps line breaks (at most one blank line in a row) but drops other control characters. */
function paragraphs(s: string) {
  return (
    s
      .replace(/\r\n?/g, "\n")
      // eslint-disable-next-line no-control-regex -- stripping control characters is the point
      .replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE = /^[+0-9()\-.\s]+$/;

export function validateContactSales(raw: Partial<Record<ContactField, unknown>>): ContactResult {
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const name = oneLine(text(raw.name));
  const email = oneLine(text(raw.email)).toLowerCase();
  const restaurant = oneLine(text(raw.restaurant));
  const phone = oneLine(text(raw.phone));
  const plan = oneLine(text(raw.plan));
  const message = paragraphs(text(raw.message));

  const errors: Partial<Record<ContactField, string>> = {};
  if (name.length < CONTACT_LIMITS.name.min) errors.name = "Please enter your name.";
  else if (name.length > CONTACT_LIMITS.name.max) errors.name = `Keep your name under ${CONTACT_LIMITS.name.max} characters.`;

  if (!EMAIL.test(email) || email.includes("..") || email.length > CONTACT_LIMITS.email.max) {
    errors.email = "Please enter a valid email address.";
  }

  if (restaurant.length > CONTACT_LIMITS.restaurant.max) {
    errors.restaurant = `Keep this under ${CONTACT_LIMITS.restaurant.max} characters.`;
  }

  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (!PHONE.test(phone) || phone.length > CONTACT_LIMITS.phone.max || digits < 7 || digits > 15) {
      errors.phone = "Please enter a valid phone number, or leave it blank.";
    }
  }

  // Own keys only: `in` would also accept inherited names like "constructor" and "__proto__".
  if (!Object.hasOwn(SALES_PLANS, plan)) errors.plan = "Please choose a plan.";

  if (message.length < CONTACT_LIMITS.message.min) errors.message = "Tell us a little about what you need.";
  else if (message.length > CONTACT_LIMITS.message.max) {
    errors.message = `Keep your message under ${CONTACT_LIMITS.message.max} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, values: { name, email, restaurant, phone, plan: plan as SalesPlan, message } };
}

/** How often one user may send an enquiry. */
export const RATE = { windowMs: 10 * 60 * 1000, perWindow: 3, dayMs: 24 * 60 * 60 * 1000, perDay: 10 } as const;

/** Is this user over the limit, given when their earlier enquiries (sent or not) were made? */
export function isRateLimited(createdAts: readonly number[], now: number): boolean {
  const today = createdAts.filter((t) => t > now - RATE.dayMs);
  const recent = today.filter((t) => t > now - RATE.windowMs);
  return recent.length >= RATE.perWindow || today.length >= RATE.perDay;
}
