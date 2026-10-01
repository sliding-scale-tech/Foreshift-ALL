// The four dayparts as the operator sees them (Bubble's `daypart` option set):
// label + window text, and the same window in minutes since midnight (used to
// tell whether the restaurant is open during it).

export type DaypartKey = "morning" | "midday" | "dinner" | "late";

export const DAYPARTS: {
  key: DaypartKey;
  label: string;
  window: string;
  start: number;
  end: number;
}[] = [
  { key: "morning", label: "Morning", window: "7:00 AM – 10:00 AM", start: 7 * 60, end: 10 * 60 },
  { key: "midday", label: "Midday", window: "11:00 AM – 2:00 PM", start: 11 * 60, end: 14 * 60 },
  { key: "dinner", label: "Dinner", window: "5:00 PM – 10:00 PM", start: 17 * 60, end: 22 * 60 },
  { key: "late", label: "Late night", window: "10:00 PM – 12:00 AM", start: 22 * 60, end: 24 * 60 },
];
