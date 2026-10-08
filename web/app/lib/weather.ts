// Weather Outlook logic: how a period's weather effect is labelled and
// explained, and the plain-language summary for the selected day. Pure (no
// React), so it can be tested with plain `node`. Every sentence is built from
// the same per-period data the table shows, so the summary can't disagree.

export type WeatherPeriod = {
  key: string;
  label: string; // "Morning"
  window: string;
  /** null = no forecast for this period (not the same as "no effect"). */
  condition: string | null;
  tempF: number | null;
  /** Chance of precipitation, 0-100. */
  precip: number | null;
  /** Weather's effect on demand for this period, in percent (signed). */
  pct: number | null;
  /** The same effect in demand-score points (signed): what weather adds to or takes off the period's score. */
  impactScore: number | null;
  /** Backend severity: 0.5 storm/snow, 0.25 rain, 0 normal, negative = ideal day. */
  severity: number;
  /** Outside the restaurant's hours. Weather is still shown for reference. */
  closed: boolean;
};

export type Effect = {
  kind: "unavailable" | "none" | "lower" | "raise";
  /** Short label, always shown as text next to any colour. */
  text: string;
  /** How strong a lowering effect is (from the backend severity). */
  size: "Low" | "Moderate" | "High" | null;
};

const MINUS = "−";

/** "+3.5%", "−8.8%", "0%" — typographic minus, one decimal at most. */
export function fmtPct(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (r === 0) return "0%";
  const body = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1);
  return `${r > 0 ? "+" : MINUS}${body}%`;
}

/** "+1.2", "−3.4", "0" — demand-score points, typographic minus, one decimal at most. */
export function fmtPoints(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (r === 0) return "0";
  const body = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1);
  return `${r > 0 ? "+" : MINUS}${body}`;
}

/** Whether a figure is big enough to call an effect. Under half a percent is "none". */
const MATERIAL = 0.5;

export function effectOf(pct: number | null, severity: number): Effect {
  if (pct === null || Number.isNaN(pct)) return { kind: "unavailable", text: "Unavailable", size: null };
  if (Math.abs(pct) < MATERIAL) return { kind: "none", text: "No material weather effect expected", size: null };
  if (pct > 0) return { kind: "raise", text: "May raise demand", size: null };
  const size = severity >= 0.5 ? "High" : severity >= 0.25 ? "Moderate" : "Low";
  return { kind: "lower", text: `${size} demand impact`, size };
}

const RAIN_CONDITIONS = /rain|thunder|snow|storm/i;

/** Rain is driving the effect even though the condition label doesn't say rain. */
export function rainBehindLabel(p: WeatherPeriod): boolean {
  return (
    p.precip !== null &&
    p.precip >= 40 &&
    p.condition !== null &&
    !RAIN_CONDITIONS.test(p.condition) &&
    p.severity >= 0.25
  );
}

/** One or two sentences explaining a period's row when it's opened. `past`: an earlier day this week, whose recorded weather is shown. */
export function describePeriod(p: WeatherPeriod, past = false): string {
  if (p.condition === null) {
    return past
      ? `No weather was recorded for the ${p.label.toLowerCase()} period.`
      : `No weather forecast is available for the ${p.label.toLowerCase()} period.`;
  }
  const parts: string[] = [];
  const e = effectOf(p.pct, p.severity);
  if (e.kind === "none") parts.push(past ? "Weather had no material effect." : "No material weather effect is expected.");
  else if (e.kind === "lower")
    parts.push(`May ${past ? "have lowered" : "lower"} demand by ${fmtPct(Math.abs(p.pct ?? 0)).slice(1)} compared with a normal ${p.label.toLowerCase()} period.`);
  else if (e.kind === "raise")
    parts.push(`May ${past ? "have raised" : "raise"} demand by ${fmtPct(p.pct ?? 0).slice(1)} compared with a normal ${p.label.toLowerCase()} period.`);
  if (rainBehindLabel(p)) {
    parts.push(
      `The condition is labelled ${p.condition}, but the ${Math.round(p.precip ?? 0)}% chance of precipitation is what ${past ? "lowered" : "lowers"} demand.`,
    );
  }
  if (p.closed) parts.push("Your restaurant is closed then, so the weather is shown for reference only.");
  return parts.join(" ");
}

export function tempSummary(periods: WeatherPeriod[]): { min: number; max: number } | null {
  const t = periods.map((p) => p.tempF).filter((n): n is number => n !== null);
  return t.length ? { min: Math.round(Math.min(...t)), max: Math.round(Math.max(...t)) } : null;
}

const periodWord = (label: string) => label.toLowerCase();

/** "in the morning", "at midday", "at dinner", "late at night" */
function whenPhrase(label: string): string {
  switch (label.toLowerCase()) {
    case "morning":
      return "in the morning";
    case "midday":
      return "at midday";
    case "dinner":
      return "at dinner";
    case "late night":
      return "late at night";
    default:
      return `in the ${label.toLowerCase()}`;
  }
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** Periods where the effect is biggest (ties within 0.05 point count together). */
export function mostAffected(periods: WeatherPeriod[]): WeatherPeriod[] {
  const scored = periods.filter((p) => p.pct !== null && Math.abs(p.pct) >= MATERIAL);
  if (scored.length === 0) return [];
  const top = Math.max(...scored.map((p) => Math.abs(p.pct ?? 0)));
  return scored.filter((p) => top - Math.abs(p.pct ?? 0) < 0.05);
}

/** "Rain (morning, midday), then Cloudy (dinner, late night)" */
export function conditionRuns(periods: WeatherPeriod[]): string {
  const runs: { condition: string; labels: string[] }[] = [];
  for (const p of periods) {
    if (p.condition === null) continue;
    const last = runs[runs.length - 1];
    if (last && last.condition === p.condition) last.labels.push(periodWord(p.label));
    else runs.push({ condition: p.condition, labels: [periodWord(p.label)] });
  }
  if (runs.length === 1 && runs[0].labels.length === periods.length) return `${runs[0].condition} all day`;
  return runs.map((r, i) => `${i === 0 ? "" : "then "}${r.condition} (${r.labels.join(", ")})`).join(", ");
}

/**
 * Two or three sentences for the selected day: the demand effect and where it
 * lands, the conditions, and the rain chance when it matters. `dayPct` is the
 * backend's demand-weighted figure for the whole day.
 */
export function buildWeatherSummary(args: {
  dayName: string;
  dayPct: number | null;
  periods: WeatherPeriod[];
  /** An earlier day this week: describe the recorded weather in the past tense. */
  past?: boolean;
}): string[] {
  const { dayName, dayPct, periods, past = false } = args;
  const forecast = periods.filter((p) => p.condition !== null);
  if (forecast.length === 0) return [past ? `No weather was recorded for ${dayName}.` : `No weather forecast is available for ${dayName}.`];

  const out: string[] = [];
  const effect = effectOf(dayPct, 0.25);
  const hit = mostAffected(forecast);
  const where = hit.length ? `, mostly ${joinWords(hit.map((p) => whenPhrase(p.label)))}` : "";
  if (effect.kind === "unavailable") out.push(`The weather effect for ${dayName} isn't available.`);
  else if (effect.kind === "none")
    out.push(past ? `Weather didn't materially affect demand on ${dayName}.` : `Weather isn't expected to materially affect demand on ${dayName}.`);
  else
    out.push(
      `Weather may ${past ? "have " : ""}${effect.kind === "lower" ? (past ? "lowered" : "lower") : past ? "raised" : "raise"} demand by ${fmtPct(Math.abs(dayPct ?? 0)).slice(1)} on ${dayName}${where}.`,
    );

  out.push(`Conditions: ${conditionRuns(forecast)}.`);

  const wettest = forecast.reduce((a, b) => ((b.precip ?? -1) > (a.precip ?? -1) ? b : a));
  if (wettest.precip !== null && wettest.precip >= 20) {
    out.push(`The chance of precipitation ${past ? "peaked" : "peaks"} at ${Math.round(wettest.precip)}% ${whenPhrase(wettest.label)}.`);
  }
  return out;
}
