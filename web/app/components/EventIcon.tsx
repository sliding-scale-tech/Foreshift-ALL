import type { ReactNode } from "react";

// One line-icon style for every event class (same 24px grid, 1.7px stroke), so
// the Events list, calendar, event page and Daily drivers all match the rest of
// the app's icons instead of mixing in emoji.
const GLYPHS: Record<string, ReactNode> = {
  // Stadium bowl
  "Major stadium game": (
    <>
      <ellipse cx="12" cy="8" rx="8" ry="3" />
      <path d="M4 8v7c0 1.7 3.6 3 8 3s8-1.3 8-3V8" />
      <path d="M4 11.5c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  // Ticket
  "Minor event": (
    <>
      <path d="M3 9a2 2 0 0 0 0 6v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 1 0-6V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v2Z" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </>
  ),
  // Tent
  "Festival day": (
    <>
      <path d="M3 20 12 4l9 16" />
      <path d="M12 4v16" />
      <path d="M8 20l4-8 4 8" />
    </>
  ),
  // Microphone
  "Concert / large show": (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
};

// Calendar, for any class we don't have a glyph for.
const FALLBACK = (
  <>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </>
);

// Display order used by the Events calendar's per-day icon row.
export const EVENT_CLASS_ORDER = [
  "Major stadium game",
  "Minor event",
  "Festival day",
  "Concert / large show",
] as const;

export function EventIcon({ eventClass, size = 32, color }: { eventClass: string; size?: number; color?: string }) {
  return (
    <svg
      role="img"
      aria-label={eventClass || "Event"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: color ?? "var(--color-primary-60)", flexShrink: 0 }}
    >
      {GLYPHS[eventClass] ?? FALLBACK}
    </svg>
  );
}
