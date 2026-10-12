// Keeping AI Pass honest. Every data tool reports what it returned into a
// FactBag: the numbers it showed, the refs (event / weather / pattern ids) the
// model may cite, a plain-language fact per ref and a one-line summary. The
// `reply` tool then checks the model's card against that bag:
//   - a factor must cite a ref the tools returned this turn, else it is dropped;
//   - every percent, degree and score in the text must match a number the tools
//     returned (within rounding), else that text is replaced by the plain fact
//     built from the data itself.
// Nothing here calls the model; it only compares text with data.

export type FactorType = "event" | "weather" | "pattern" | "demand" | "week";

export type FactorRef = { ref: string; type: FactorType; title: string; fact: string };

export type ScopeUsed = { zone: string; concept: string; date: string | null };

export class FactBag {
  private numbers: number[] = [];
  private refs = new Map<string, FactorRef>();
  private summaries: string[] = [];
  private scopes = new Map<string, ScopeUsed>();
  /** Tool names called this turn (for the eval and for "no data" detection). */
  calls: string[] = [];

  /** Record a tool result: every numeric leaf counts as a number the model may quote. */
  addResult(result: unknown) {
    const walk = (x: unknown) => {
      if (typeof x === "number" && Number.isFinite(x)) this.numbers.push(x);
      else if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === "object") Object.values(x).forEach(walk);
    };
    walk(result);
  }

  addRef(r: FactorRef) {
    if (!this.refs.has(r.ref)) this.refs.set(r.ref, r);
  }

  addSummary(s: string) {
    if (s) this.summaries.push(s);
  }

  addScope(s: ScopeUsed) {
    this.scopes.set(`${s.zone}|${s.concept}|${s.date ?? ""}`, s);
  }

  get hasData() {
    return this.refs.size > 0 || this.summaries.length > 0;
  }

  refFor(ref: string): FactorRef | undefined {
    return this.refs.get(ref);
  }

  /**
   * One entry per zone + restaurant type. The date is kept only when every use
   * of that pair was for the same single day (a week overview has none).
   */
  scopesUsed(): ScopeUsed[] {
    const byPair = new Map<string, { zone: string; concept: string; dates: Set<string | null> }>();
    for (const s of this.scopes.values()) {
      const key = `${s.zone}|${s.concept}`;
      const e = byPair.get(key) ?? { zone: s.zone, concept: s.concept, dates: new Set<string | null>() };
      e.dates.add(s.date);
      byPair.set(key, e);
    }
    return [...byPair.values()].map((e) => {
      const dated = [...e.dates].filter((d): d is string => d !== null);
      return { zone: e.zone, concept: e.concept, date: dated.length === 1 && e.dates.size === 1 ? dated[0] : null };
    });
  }

  /** Plain, data-only stand-in for text we can't vouch for. */
  summaryText(maxChars = 360): string {
    const text = this.summaries.join(" ").trim();
    if (!text) return "I couldn't find forecast data for that. Try a day this week, such as today or Friday.";
    return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`;
  }

  /** Is `x` (as the model wrote it) a number the tools returned, allowing for rounding? */
  hasNumber(x: number): boolean {
    const ax = Math.abs(x);
    return this.numbers.some((n) => Math.abs(Math.abs(n) - ax) <= 0.55);
  }
}

// "+48%", "−8.8 %", "82°F", "12 points", "score of 92.4", "score: 92", "12 events".
const CLAIM =
  /([+\-−]?\d+(?:\.\d+)?)\s*(?:%|°|degrees?\b|points?\b|pts\b)|\bscores?\s*(?:of|is|was|:)?\s*(\d+(?:\.\d+)?)|\b(\d+)\s+(?:(?:nearby|area|upcoming|major|local)\s+)?events?\b/gi;

/** Numbers the text states as a figure (percent, temperature, points, score, event count). */
export function claimedNumbers(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(CLAIM)) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? "").replace("−", "-");
    const n = Number(raw);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** True when every figure the text states is backed by a tool result. */
export function isGrounded(text: string, bag: FactBag): boolean {
  return claimedNumbers(text).every((n) => bag.hasNumber(n));
}

export function typeOfRef(ref: string): FactorType | null {
  const prefix = ref.split(":", 1)[0];
  return prefix === "event" || prefix === "weather" || prefix === "pattern" || prefix === "demand" || prefix === "week"
    ? prefix
    : null;
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

export type ReplyInput = {
  kind: "answer" | "no_data" | "refusal";
  intro: string;
  factors: { title: string; detail: string; ref: string }[];
  netImpact: string | null;
  followUps: string[];
};

export type ReplyCard = {
  /** "degraded": the AI couldn't be reached; the card is built straight from the forecast data. */
  kind: ReplyInput["kind"] | "degraded";
  intro: string;
  factors: { type: FactorType; ref: string; title: string; detail: string }[];
  netImpact: string | null;
  /** The scope(s) the data tools actually used — from the tools, not the model. */
  scopes: ScopeUsed[];
  followUps: string[];
  /** True when some model text was replaced by the plain fact (kept for logging/eval). */
  usedFallback: boolean;
};

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

const NO_DATA_TEXT = "I couldn't pull forecast data for that. Try asking about a day this week, such as today or Friday.";

/** Turn the model's `reply` input into the card we store, checked against the data. */
export function buildCard(input: ReplyInput, bag: FactBag): ReplyCard {
  let usedFallback = false;

  // A refusal needs no data. An answer with no data behind it can still be a
  // plain explanation, but any figure in it has nothing to stand on (isGrounded).
  const intro = (() => {
    const text = clip(input.intro.trim(), 400);
    if (input.kind === "refusal") return text;
    if (isGrounded(text, bag)) return text;
    usedFallback = true;
    return bag.hasData ? bag.summaryText() : NO_DATA_TEXT;
  })();

  const seen = new Set<string>();
  const factors: ReplyCard["factors"] = [];
  for (const f of input.factors) {
    const known = bag.refFor(f.ref);
    if (!known || seen.has(f.ref)) continue; // not from this turn's data: drop it
    seen.add(f.ref);
    const modelDetail = clip(f.detail.trim(), 260);
    const ok = isGrounded(modelDetail, bag) && isGrounded(f.title, bag);
    if (!ok) usedFallback = true;
    factors.push({
      type: known.type, // icon comes from the ref, not from the model
      ref: f.ref,
      title: ok ? clip(f.title.trim(), 60) : known.title,
      detail: ok ? modelDetail : known.fact,
    });
    if (factors.length === 4) break;
  }

  let netImpact: string | null = null;
  if (input.netImpact && input.netImpact.trim()) {
    const text = clip(input.netImpact.trim(), 320);
    if (isGrounded(text, bag)) netImpact = text;
    else {
      usedFallback = true;
      netImpact = bag.hasData ? bag.summaryText(240) : null;
    }
  }

  const kind: ReplyInput["kind"] =
    input.kind === "answer" && !bag.hasData && factors.length === 0 && intro === NO_DATA_TEXT ? "no_data" : input.kind;

  return {
    kind,
    intro,
    factors,
    netImpact,
    // Only an answer was about a scope; "no data" and refusals show no chip.
    scopes: kind === "answer" ? bag.scopesUsed() : [],
    followUps: input.followUps
      .map((q) => clip(q.trim(), 70))
      .filter(Boolean)
      .slice(0, 3),
    usedFallback,
  };
}

// ---------------------------------------------------------------------------
// When the AI can't be reached
// ---------------------------------------------------------------------------

/**
 * A card built only from the forecast, with no model involved: the busiest
 * period, the weather then and the top events, each as the plain fact the data
 * tools produced. Shown after every retry has failed so the person still gets
 * their forecast instead of a dead end. `data` is null when even the forecast
 * for that day couldn't be read.
 */
export function degradedCard(
  data: { refs: FactorRef[]; summary: string; scope: ScopeUsed; peakDaypart?: string } | null,
): ReplyCard {
  if (!data) {
    return {
      kind: "degraded",
      intro:
        "I couldn't reach the AI just now, but your forecast pages are up to date. Try again in a moment, or open Daily Outlook for today's numbers.",
      factors: [],
      netImpact: null,
      scopes: [],
      followUps: [],
      usedFallback: true,
    };
  }

  const pick: FactorRef[] = [];
  const add = (r: FactorRef | undefined) => r && !pick.includes(r) && pick.push(r);
  if (data.peakDaypart) {
    const date = data.scope.date;
    add(data.refs.find((r) => r.ref === `demand:${date}:${data.peakDaypart}`));
    add(data.refs.find((r) => r.ref === `weather:${date}:${data.peakDaypart}`));
  }
  data.refs.filter((r) => r.type === "event").slice(0, 2).forEach(add);

  return {
    kind: "degraded",
    intro: `I couldn't reach the AI just now, so here's your forecast straight from the numbers. ${data.summary}`.trim(),
    factors: pick.slice(0, 4).map((r) => ({ type: r.type, ref: r.ref, title: r.title, detail: r.fact })),
    netImpact: null,
    scopes: [data.scope],
    followUps: [],
    usedFallback: true,
  };
}
