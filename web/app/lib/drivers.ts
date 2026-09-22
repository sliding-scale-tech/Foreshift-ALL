// The "Top Demand Drivers" list (Daily + Weekly Outlook): the backend's flat
// driver list mapped to what the card renders.

import type { DemandDriver } from "my-app/convex/lib/outlook";
import { formatEventTime } from "./week";

export type Driver = {
  kind: "event" | "weather";
  liftPct: number;
  title: string;
  subtitle?: string;
  eventClass?: string; // events: picks the icon
  condition?: string; // weather: picks the icon
};

// Bubble hid drivers that pull demand down (lift_percent >= 0 only).
export function toDrivers(list: DemandDriver[]): Driver[] {
  return list
    .filter((d) => d.lift_percent >= 0)
    .map((d) =>
      d.type === "event"
        ? {
            kind: "event",
            liftPct: d.lift_percent,
            title: d.name,
            subtitle: [d.venue !== "N/A" ? d.venue : "", formatEventTime(d.time)]
              .filter(Boolean)
              .join(" - "),
            eventClass: d.class,
          }
        : { kind: "weather", liftPct: d.lift_percent, title: d.condition, condition: d.condition },
    );
}
