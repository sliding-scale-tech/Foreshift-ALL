import styles from "./BandPill.module.css";

// Demand band pill (Minimal … Exceptional). Colors follow the Bubble screens:
// Light blue, Moderate amber, Peak green, Exceptional purple.
export function BandPill({ band }: { band: string }) {
  return <span className={`${styles.pill} ${styles[band] ?? styles.Minimal}`}>{band}</span>;
}
