// The four dayparts: label + window text, and the same window in minutes since
// midnight (used to tell whether the restaurant is open during it). The windows
// are the ones the backend scores and buckets events by (DAYPART_WINDOWS /
// daypartFromLocalTime in convex/lib/vocab.ts), so the four periods cover the
// day without gaps. "Late night" really runs to 2 AM; `end` stops at midnight
// because hours are checked one calendar day at a time.

export type DaypartKey = "morning" | "midday" | "dinner" | "late";

export const DAYPARTS: {
  key: DaypartKey;
  label: string;
  window: string;
  start: number;
  end: number;
}[] = [
  { key: "morning", label: "Morning", window: "6:00 AM – 11:00 AM", start: 6 * 60, end: 11 * 60 },
  { key: "midday", label: "Midday", window: "11:00 AM – 4:00 PM", start: 11 * 60, end: 16 * 60 },
  { key: "dinner", label: "Dinner", window: "4:00 PM – 9:00 PM", start: 16 * 60, end: 21 * 60 },
  { key: "late", label: "Late night", window: "9:00 PM – 2:00 AM", start: 21 * 60, end: 24 * 60 },
];
