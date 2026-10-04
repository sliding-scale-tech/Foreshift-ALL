import type { Influence } from "@/app/lib/events";
import styles from "./InfluencePill.module.css";

// "Estimated influence": High / Moderate / Low. Blues only, so it can't be mistaken for a demand level.
export function InfluencePill({ influence }: { influence: Influence }) {
  return <span className={`${styles.pill} ${styles[influence]}`}>{influence}</span>;
}
