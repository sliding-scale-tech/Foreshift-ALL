// The four dayparts as the operator sees them (Bubble's `daypart` option set):
// card title + window, and the shorter label the demand chart's x-axis uses.

export type DaypartKey = "morning" | "midday" | "dinner" | "late";

export const DAYPARTS: {
  key: DaypartKey;
  label: string;
  window: string;
  chartLabel: string;
}[] = [
  { key: "morning", label: "Morning", window: "7:00 AM – 10:00 AM", chartLabel: "Breakfast" },
  { key: "midday", label: "Midday", window: "11:00 AM – 2:00 PM", chartLabel: "Lunch" },
  { key: "dinner", label: "Dinner", window: "5:00 PM – 10:00 PM", chartLabel: "Dinner" },
  { key: "late", label: "Late", window: "10:00 PM – 12:00 AM", chartLabel: "Late Night" },
];
