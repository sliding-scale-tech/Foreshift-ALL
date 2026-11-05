import { bandLabel } from "@/app/lib/bands";
import styles from "./BandPill.module.css";

// Demand band pill, shown with its plain label (Very quiet … Exceptional).
// Colors follow the Bubble screens: Quiet blue, Moderate amber, Busy red,
// Very busy green, Exceptional purple (same hues as the chart, lib/bands.ts).
export function BandPill({ band }: { band: string }) {
  return <span className={`${styles.pill} ${styles[band] ?? styles.Minimal}`}>{bandLabel(band)}</span>;
}
