// Demand bands — ranges match the backend (scoreToBand in
// my-app/convex/lib/vocab.ts). One place for the chart colours, the band
// tooltip and the "How this forecast works" table.

export type Band = "Minimal" | "Light" | "Moderate" | "High" | "Peak" | "Exceptional";

export const MAX_SCORE = 150;

export const BANDS: { name: Band; min: number; max: number; meaning: string; color: string }[] = [
  { name: "Minimal", min: 0, max: 19, meaning: "Very quiet for the area", color: "#a6a6a6" },
  { name: "Light", min: 20, max: 39, meaning: "Quieter than usual", color: "#027ffc" },
  { name: "Moderate", min: 40, max: 64, meaning: "Steady, typical demand", color: "#eba500" },
  { name: "High", min: 65, max: 84, meaning: "Busy", color: "#cd260e" },
  { name: "Peak", min: 85, max: 109, meaning: "Very busy", color: "#26883c" },
  { name: "Exceptional", min: 110, max: 150, meaning: "Unusually busy, e.g. a major event nearby", color: "#625dfe" },
];

/** Bar colour for a band (same hue family as its BandPill). Gray when unknown. */
export function bandColor(band: string | null): string {
  return BANDS.find((b) => b.name === band)?.color ?? "#c7c7c7";
}
