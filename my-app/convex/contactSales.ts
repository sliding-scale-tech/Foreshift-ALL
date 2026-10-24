// Contact Sales (web app, Billing page). A signed-in operator asks about a plan
// that isn't self-serve yet; the enquiry is emailed to the ForeShift inboxes with
// Resend.
//
//   submit (action)  — what the form calls. Checks the user, validates, rate-limits,
//                      saves the enquiry, emails it, and records whether it went.
//
// Security: the caller must be signed in; the recipients are fixed in
// lib/contactSales.ts and never come from the client; the API key stays in the
// Convex environment (RESEND_API_KEY, or the lowercase resend_api_key it was set
// as); every value is validated again here and HTML-escaped in the email; a
// hidden honeypot field catches bots; each user is limited to a few enquiries
// per 10 minutes and per day; and errors shown to the user never contain
// provider details (those go to the server log only).

import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  RATE,
  SALES_PLANS,
  SALES_RECIPIENTS,
  isRateLimited,
  validateContactSales,
  type ContactField,
  type ContactValues,
} from "./lib/contactSales";

const FROM = () => process.env.RESEND_FROM ?? "ForeShift Contact Form <contact@foreshift.ai>";

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string; fields?: Partial<Record<ContactField, string>> };

const GENERIC_FAILURE = "We couldn't send your message. Please email info@foreshift.ai directly.";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ---------------------------------------------------------------------------
// The email
// ---------------------------------------------------------------------------

type AccountContext = { accountEmail: string | null; zone: string | null; concept: string | null; status: string };

function buildEmail(v: ContactValues, ctx: AccountContext, when: Date) {
  const plan = SALES_PLANS[v.plan];
  const rows: [string, string][] = [
    ["Plan", `${plan.label} (${plan.price})`],
    ["Name", v.name],
    ["Email", v.email],
    ["Phone", v.phone || "Not provided"],
    ["Restaurant", v.restaurant || "Not provided"],
    ["Signed in as", ctx.accountEmail ?? "Unknown"],
    ["Zone / type", ctx.zone && ctx.concept ? `${ctx.zone} · ${ctx.concept}` : "Not set up"],
    ["Subscription", ctx.status],
    ["Sent", when.toUTCString()],
  ];

  // Subject is one line, no user-controlled line breaks.
  const subject = `[ForeShift Sales] ${plan.label} enquiry from ${v.name}`.replace(/[\r\n]+/g, " ").slice(0, 200);
  const text = [...rows.map(([k, val]) => `${k}: ${val}`), "", v.message].join("\n");
  const row = ([k, val]: [string, string]) =>
    `<tr><td style="padding:4px 14px 4px 0;color:#636f86;vertical-align:top">${escapeHtml(k)}</td>` +
    `<td style="padding:4px 0"><strong>${escapeHtml(val)}</strong></td></tr>`;
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a202c;line-height:1.5">` +
    `<table style="border-collapse:collapse;margin-bottom:16px">${rows.map(row).join("")}</table>` +
    `<div style="white-space:pre-wrap;border-left:3px solid #0270df;padding-left:12px">${escapeHtml(v.message)}</div></div>`;
  return { subject, text, html };
}

/** One call to Resend's REST API. Returns what happened; never throws, never leaks the key. */
async function sendViaResend(args: {
  to: readonly string[];
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const apiKey = process.env.RESEND_API_KEY ?? process.env.resend_api_key;
  if (!apiKey) return { ok: false, reason: "Resend API key is not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // A retried request can't send the same enquiry twice.
        "Idempotency-Key": args.idempotencyKey,
      },
      body: JSON.stringify({
        from: FROM(),
        to: args.to,
        reply_to: args.replyTo,
        subject: args.subject,
        text: args.text,
        html: args.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, reason: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `request failed: ${err instanceof Error ? err.name : "unknown"}` };
  }
}

// ---------------------------------------------------------------------------
// Saving, limiting
// ---------------------------------------------------------------------------

/** Saves the enquiry as "pending" unless this user is sending too many. */
export const begin = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    restaurant: v.string(),
    phone: v.string(),
    plan: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const lastDay = await ctx.db
      .query("contactRequests")
      .withIndex("by_clerkId_and_createdAt", (q) => q.eq("clerkId", args.clerkId).gt("createdAt", now - RATE.dayMs))
      .collect();
    if (isRateLimited(lastDay.map((r) => r.createdAt), now)) return { ok: false as const };

    const op = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    const id = await ctx.db.insert("contactRequests", { ...args, status: "pending", createdAt: now });
    return {
      ok: true as const,
      id,
      context: {
        zone: op?.zone ?? null,
        concept: op?.conceptType ?? null,
        status: op?.subscriptionStatus ?? "none (free trial or expired)",
      },
    };
  },
});

export const finish = internalMutation({
  args: { id: v.id("contactRequests"), ok: v.boolean(), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch("contactRequests", args.id, {
      status: args.ok ? "sent" : "failed",
      ...(args.error ? { error: args.error.slice(0, 400) } : {}),
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// The form's entry point
// ---------------------------------------------------------------------------

export const submit = action({
  args: {
    name: v.string(),
    email: v.string(),
    restaurant: v.string(),
    phone: v.string(),
    plan: v.string(),
    message: v.string(),
    // Honeypot: real people never see or fill this field.
    website: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SubmitResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { ok: false, error: "Please sign in to contact sales." };

    // A bot filled the hidden field. Say it worked so it learns nothing; send nothing.
    if (args.website && args.website.trim() !== "") return { ok: true };

    const checked = validateContactSales(args);
    if (!checked.ok) return { ok: false, error: "Please check the highlighted fields.", fields: checked.errors };
    const values = checked.values;

    const started = await ctx.runMutation(internal.contactSales.begin, { clerkId: identity.subject, ...values });
    if (!started.ok) {
      return { ok: false, error: "You've sent a few messages already. Please wait a few minutes, or email info@foreshift.ai." };
    }

    const when = new Date();
    const mail = buildEmail(values, { accountEmail: identity.email ?? null, ...started.context }, when);
    const sent = await sendViaResend({
      to: SALES_RECIPIENTS,
      replyTo: values.email,
      ...mail,
      idempotencyKey: `contact-sales-${started.id}`,
    });

    if (!sent.ok) {
      console.error("[contactSales] email failed:", sent.reason);
      await ctx.runMutation(internal.contactSales.finish, { id: started.id, ok: false, error: sent.reason });
      return { ok: false, error: GENERIC_FAILURE };
    }
    await ctx.runMutation(internal.contactSales.finish, { id: started.id, ok: true });
    return { ok: true };
  },
});

/**
 * Checks the Resend key and the email layout without emailing anyone at ForeShift:
 * the message goes to Resend's own test address (delivered@resend.dev), which
 * accepts it and throws it away. Internal: the browser can't call it.
 *   npx convex run contactSales:testDelivery
 */
export const testDelivery = internalAction({
  args: {},
  handler: async () => {
    const mail = buildEmail(
      {
        name: "Test <b>Person</b>",
        email: "test@example.com",
        restaurant: "Test Bistro",
        phone: "+1 313 555 0100",
        plan: "dynamic-scheduling",
        message: "Line one.\n<script>alert(1)</script>\nLine three.",
      },
      { accountEmail: "owner@example.com", zone: "Midtown", concept: "Fine Dining", status: "none (free trial or expired)" },
      new Date(),
    );
    const sent = await sendViaResend({
      to: ["delivered@resend.dev"],
      replyTo: "test@example.com",
      ...mail,
      idempotencyKey: `contact-sales-test-${Date.now()}`,
    });
    return { sent, htmlEscaped: !mail.html.includes("<script>") && mail.html.includes("&lt;script&gt;") };
  },
});
