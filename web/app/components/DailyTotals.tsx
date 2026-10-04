"use client";

import { useState } from "react";
import { DemandBarChart, type BarItem } from "@/app/components/DemandBarChart";
import { InfoTip } from "@/app/components/InfoTip";
import styles from "./DailyTotals.module.css";

// One bar per day (its busiest period's score). Open by default; the chevron
// and "Hide / Show" say it collapses.
export function DailyTotals({
  items,
  selected,
  onSelect,
}: {
  items: BarItem[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <details className={styles.totals} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        Daily totals
        <InfoTip label="daily totals" align="start">
          One bar per day. A day&apos;s score is its busiest period&apos;s score on the 0–150 scale, rounded to one
          decimal. Select a bar to see that day above.
        </InfoTip>
        <span className={styles.totalsToggle}>
          {open ? "Hide" : "Show"}
          <svg className={styles.chevron} viewBox="0 0 10 6" aria-hidden="true">
            <path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      {/* Mounted only while open: a chart drawn inside a closed <details> measures itself as 0px wide. */}
      {open && <DemandBarChart height={300} selected={selected} onSelect={onSelect} items={items} showBand />}
    </details>
  );
}
