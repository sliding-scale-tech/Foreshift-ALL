import { EventIcon } from "@/app/components/EventIcon";
import styles from "./EventBadge.module.css";

const TONE: Record<string, string> = {
  "Major stadium game": "game",
  "Concert / large show": "concert",
  "Festival day": "festival",
  "Minor event": "minor",
};

// An event's icon in a softly tinted circle, one tint per kind of event so a long
// list is easy to scan. The tint is decoration only: the kind is always written
// out next to it, and these tints are not the demand-level colours.
export function EventBadge({ eventClass, size = 36 }: { eventClass: string; size?: number }) {
  return (
    <span className={`${styles.badge} ${styles[TONE[eventClass] ?? "minor"]}`} style={{ width: size, height: size }}>
      <EventIcon eventClass={eventClass} size={Math.round(size * 0.56)} color="currentColor" />
    </span>
  );
}
