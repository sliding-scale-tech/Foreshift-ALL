// Demand bands — ranges match the backend (scoreToBand in
// my-app/convex/lib/vocab.ts). One place for the chart colours, the band
// tooltip and the "How this forecast works" table.
//
// The backend (and Bubble) keep the original names (Minimal … Exceptional);
// operators only ever see the plain `label` (Very quiet … Exceptional), and no
// score. Show a band with bandLabel(), never the raw name.

export type Band = "Minimal" | "Light" | "Moderate" | "High" | "Peak" | "Exceptional";

export const MAX_SCORE = 150;

// `color` is the strong shade of the band's hue: the chart bars use it, and
// BandPill / the weekly grid use lighter shades of the same hue (the -20/-30/-70
// tokens of the same family in globals.css), so a band looks the same everywhere.
export const BANDS: { name: Band; label: string; min: number; max: number; meaning: string; color: string }[] = [
  { name: "Minimal", label: "Very quiet", min: 0, max: 19, meaning: "Much quieter than usual for the area", color: "#8a8a8a" },
  { name: "Light", label: "Quiet", min: 20, max: 39, meaning: "Quieter than usual", color: "#0947d7" },
  { name: "Moderate", label: "Moderate", min: 40, max: 64, meaning: "Steady, typical demand", color: "#eba500" },
  { name: "High", label: "Busy", min: 65, max: 84, meaning: "Busier than usual", color: "#cd260e" },
  { name: "Peak", label: "Very busy", min: 85, max: 109, meaning: "Much busier than usual", color: "#26883c" },
  { name: "Exceptional", label: "Exceptional", min: 110, max: 150, meaning: "Unusually busy, e.g. a major event nearby", color: "#513edf" },
];

/** What operators see for a band: "High" -> "Busy". Unknown text is shown as-is. */
export function bandLabel(band: string | null | undefined): string {
  return BANDS.find((b) => b.name === band)?.label ?? band ?? "";
}

/** Band for a score — same thresholds as the backend. */
export function bandOf(score: number): Band {
  for (let i = BANDS.length - 1; i >= 0; i--) if (score >= BANDS[i].min) return BANDS[i].name;
  return "Minimal";
}

/** "#027ffc" + 0.4 -> "rgba(2,127,252,0.4)" */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Bar colour for a band (same hue family as its BandPill). Gray when unknown. */
export function bandColor(band: string | null): string {
  return BANDS.find((b) => b.name === band)?.color ?? "#c7c7c7";
}
