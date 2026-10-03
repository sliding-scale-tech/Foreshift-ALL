// The "Top Demand Drivers" list (Daily + Weekly Outlook): the backend's flat
// driver list mapped to what the card renders.

import type { DemandDriver } from "my-app/convex/lib/outlook";
import { DAYPARTS } from "./dayparts";
import { formatEventTime } from "./week";

export type Driver = {
  kind: "event" | "weather";
  liftPct: number; // whole percent; 0 = no effect
  title: string;
  subtitle?: string;
  eventClass?: string; // events: picks the icon
  condition?: string; // weather: picks the icon
  date?: string; // weekly drivers: the day it falls on ("2026-10-01")
};

const PERIOD_LABEL: Record<string, string> = Object.fromEntries(DAYPARTS.map((d) => [d.key, d.label]));

/**
 * The backend sends one weather entry per daypart, so the same "Clear" could
 * fill four of the five rows. Weather rows are merged: same condition and same
 * effect -> one row naming the periods it covers; every no-effect reading ->
 * a single neutral row, listed last. Drivers that pull demand down stay hidden
 * (Bubble showed lift_percent >= 0 only). Weekly drivers carry a `day`, which
 * prefixes the period ("Fri Dinner").
 */
export function toDrivers(list: (DemandDriver & { day?: string; date?: string })[]): Driver[] {
  const out: Driver[] = [];
  const weather = new Map<string, { driver: Driver; conditions: string[]; periods: string[] }>();

  for (const d of list) {
    if (d.lift_percent < 0) continue;
    const liftPct = Math.round(d.lift_percent);

    if (d.type === "event") {
      // Weekly drivers say which day and period the event falls in.
      const when = [d.day, formatEventTime(d.time)].filter(Boolean).join(" ");
      // The period its lift lands in. No start time = counted across the whole day.
      const affects = d.time ? (PERIOD_LABEL[d.daypart] ?? d.daypart) : "All day";
      out.push({
        kind: "event",
        liftPct,
        title: d.name,
        subtitle: [d.venue !== "N/A" ? d.venue : "", when, affects]
          .filter(Boolean)
          .join(" - "),
        eventClass: d.class,
        date: d.date,
      });
      continue;
    }

    // Weather merges only within one day, so "Show only Friday" stays accurate.
    const key = liftPct === 0 ? `neutral|${d.date ?? ""}` : `${d.condition}|${liftPct}|${d.date ?? ""}`;
    const period = [d.day, PERIOD_LABEL[d.daypart] ?? d.daypart].filter(Boolean).join(" ");
    const group = weather.get(key);
    if (group) {
      if (!group.conditions.includes(d.condition)) group.conditions.push(d.condition);
      group.periods.push(period);
    } else {
      const driver: Driver = { kind: "weather", liftPct, title: d.condition, condition: d.condition, date: d.date };
      weather.set(key, { driver, conditions: [d.condition], periods: [period] });
      out.push(driver);
    }
  }

  for (const { driver, conditions, periods } of weather.values()) {
    driver.title = conditions.join(" / ");
    driver.subtitle = periods.join(", ");
  }

  // Keep the backend's strongest-first order; no-effect rows go last.
  return out.sort((a, b) => Number(a.liftPct === 0) - Number(b.liftPct === 0));
}
