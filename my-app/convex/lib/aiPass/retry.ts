// How AI Pass recovers when Gemini fails. Pure (no Convex or AI imports) so the
// rules can be tested on their own.
//
//   1. the main model: the first try plus up to 3 retries, with a short pause
//   2. a Pro model: up to 2 tries
//   3. still failing: a data-only answer built from the forecast (grounding.ts
//      degradedCard), so the person always gets something useful
//
// An error that retrying can't fix (bad request, missing key, unknown model)
// skips the rest of that model's tries and moves straight on.

export const PRIMARY_RETRIES = 3; // after the first try -> up to 4 tries
export const FALLBACK_TRIES = 2;
/** No new try starts after this long, so the person never waits on a long chain. */
export const TOTAL_BUDGET_MS = 75_000;
const BACKOFF_MS = [500, 1_500, 3_000];

export type Step = { model: string; tries: number };

export function planSteps(primary: string, fallback: string): Step[] {
  const steps: Step[] = [{ model: primary, tries: 1 + PRIMARY_RETRIES }];
  if (fallback && fallback !== primary) steps.push({ model: fallback, tries: FALLBACK_TRIES });
  return steps;
}

/** Pause before try number `attempt` (1-based within one model); none before the first. */
export function backoffMs(attempt: number): number {
  if (attempt <= 1) return 0;
  return BACKOFF_MS[Math.min(attempt - 2, BACKOFF_MS.length - 1)];
}

type ErrLike = { statusCode?: unknown; status?: unknown; isRetryable?: unknown; cause?: unknown; message?: unknown };

/**
 * True when trying the same model again can't help: a 4xx other than
 * 408 / 409 / 429 (timeout, conflict, rate limit), or an error that says it
 * isn't retryable. Network errors and 5xx (Gemini's "high demand") are retried.
 */
export function isPermanentError(err: unknown): boolean {
  let e: ErrLike | undefined = err as ErrLike;
  for (let depth = 0; e && typeof e === "object" && depth < 4; depth++) {
    const code = Number(e.statusCode ?? e.status);
    if (Number.isFinite(code) && code >= 400 && code < 500 && ![408, 409, 429].includes(code)) return true;
    if (e.isRetryable === false) return true;
    if (typeof e.message === "string" && /GEMINI_API_KEY is not set/.test(e.message)) return true;
    e = e.cause as ErrLike | undefined;
  }
  return false;
}
