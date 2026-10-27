// One email through Resend's REST API (no SDK, no extra dependency). Used by
// the Contact Sales form and the event-sync alerts. The API key stays in the
// Convex environment: RESEND_API_KEY, or the lowercase resend_api_key it was
// first set as. Never throws and never returns the key; the caller logs `reason`.

export const DEFAULT_FROM = "ForeShift <contact@foreshift.ai>";

export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function sendEmail(args: {
  to: readonly string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
  replyTo?: string;
  /** Resend drops a repeat with the same key, so a retried request can't send twice. */
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
        "Idempotency-Key": args.idempotencyKey,
      },
      body: JSON.stringify({
        from: args.from ?? process.env.RESEND_FROM ?? DEFAULT_FROM,
        to: args.to,
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        subject: args.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
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
