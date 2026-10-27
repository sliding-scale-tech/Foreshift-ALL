// Alerts for the daily event sync (events.ts). Pure, so the rules can be tested
// on their own; sending happens in events.ts through lib/resend.ts.
//
//   try 1 fails (an error, or no events at all) -> email "failed, retrying in 5 minutes"
//                                                  and schedule one retry
//   the retry works                             -> email "recovered on the retry"
//   the retry fails too                         -> email "failed twice, needs a check"
//   try 1 works                                 -> nothing
//
// There is exactly one automatic retry; the retry never schedules another.

import { escapeHtml } from "./resend";

/** Who hears about a broken event sync. Fixed here, never from a request. */
export const SYNC_ALERT_RECIPIENTS = [
  "info@foreshift.ai",
  "aleem@slidingscale.xyz",
  "Faarid@slidingscale.xyz",
  "dev@foreshift.ai",
] as const;

export const RETRY_DELAY_MS = 5 * 60 * 1000;

export type SyncOutcome =
  | { ok: true; ticketmasterEvents: number; signalRows: number; huntington: string }
  | { ok: false; reason: string; huntington?: string };

export type AlertKind = "retrying" | "recovered" | "failedAgain";

/** What to do after a try: which email (if any) and whether to schedule the retry. */
export function planAfterTry(attempt: number, ok: boolean): { email: AlertKind | null; retry: boolean } {
  if (attempt <= 1) return ok ? { email: null, retry: false } : { email: "retrying", retry: true };
  return { email: ok ? "recovered" : "failedAgain", retry: false };
}

/**
 * Alerts go out from production only, so the dev deployment (which runs the same
 * cron against the same Bubble data) doesn't send everyone a second copy.
 * SYNC_ALERTS=on / off overrides that for testing.
 */
export function alertsEnabled(env: { SYNC_ALERTS?: string; CONVEX_CLOUD_URL?: string }): boolean {
  if (env.SYNC_ALERTS === "on") return true;
  if (env.SYNC_ALERTS === "off") return false;
  return /secret-armadillo-920/.test(env.CONVEX_CLOUD_URL ?? "");
}

const detroitTime = (d: Date) =>
  d.toLocaleString("en-US", { timeZone: "America/Detroit", dateStyle: "medium", timeStyle: "short" }) + " (Detroit)";

export function buildSyncAlert(
  kind: AlertKind,
  details: { outcome: SyncOutcome; firstFailure?: string; deployment: string; when: Date },
) {
  const { outcome } = details;
  const subject = {
    retrying: "[ForeShift alert] Event sync failed — automatic retry in 5 minutes",
    recovered: "[ForeShift] Event sync recovered on the automatic retry",
    failedAgain: "[ForeShift alert] Event sync failed twice — needs to be checked",
  }[kind];

  const headline = {
    retrying:
      "Today's event sync did not pull this week's events. An automatic retry will run in 5 minutes. You'll get one more email with the result.",
    recovered: "The automatic retry worked. This week's events are now in ForeShift. No action needed.",
    failedAgain:
      "The automatic retry also failed. Events Overview and the event lift in every outlook are missing this week's events until this is fixed. Please check the sync.",
  }[kind];

  const rows: [string, string][] = [
    ["Status", kind === "recovered" ? "Recovered" : kind === "retrying" ? "Failed (retry scheduled)" : "Failed twice"],
    ["When", detroitTime(details.when)],
    ["Deployment", details.deployment],
  ];
  if (outcome.ok) {
    rows.push(["Ticketmaster events", String(outcome.ticketmasterEvents)], ["Event rows written", String(outcome.signalRows)]);
  } else {
    rows.push(["Error", outcome.reason]);
  }
  if (details.firstFailure && kind !== "retrying") rows.push(["First try's error", details.firstFailure]);
  if (outcome.huntington) rows.push(["Huntington Place", outcome.huntington]);

  const text = [headline, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const color = kind === "recovered" ? "#1e6c30" : "#b0200c";
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a202c;line-height:1.5">` +
    `<p style="margin:0 0 16px;padding:12px 14px;border-left:4px solid ${color};background:#f5f7fb">${escapeHtml(headline)}</p>` +
    `<table style="border-collapse:collapse">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 14px 4px 0;color:#636f86;vertical-align:top">${escapeHtml(k)}</td>` +
          `<td style="padding:4px 0;white-space:pre-wrap"><strong>${escapeHtml(v)}</strong></td></tr>`,
      )
      .join("") +
    `</table></div>`;
  return { subject, text, html };
}
