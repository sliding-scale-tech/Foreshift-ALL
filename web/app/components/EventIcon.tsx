const ICONS: Record<string, string> = {
  "Major stadium game": "🏟️",
  "Minor event": "🎫",
  "Festival day": "🎪",
  "Concert / large show": "🎙️",
};

// Display order used by the Events calendar's per-day icon row.
export const EVENT_CLASS_ORDER = [
  "Major stadium game",
  "Minor event",
  "Festival day",
  "Concert / large show",
] as const;

export function EventIcon({ eventClass, size = 32 }: { eventClass: string; size?: number }) {
  return (
    <span
      role="img"
      aria-label={eventClass}
      style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}
    >
      {ICONS[eventClass] ?? "📅"}
    </span>
  );
}
