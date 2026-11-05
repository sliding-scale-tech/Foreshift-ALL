"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ApexOptions } from "apexcharts";
import type { Props as ApexProps } from "react-apexcharts";
import { bandColor, bandLabel, MAX_SCORE } from "@/app/lib/bands";

function signed(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : ""}${r === 0 ? 0 : r}%`;
}
import styles from "./DemandBarChart.module.css";
import { SHOW_NUMBERS } from "@/app/lib/display";

// ApexCharts touches `window`, so it's client-only (the cast: react-apexcharts types its default export as a bare class that next/dynamic won't accept).
const ReactApexChart = dynamic(
  () => import("react-apexcharts").then((m) => m.default as unknown as ComponentType<ApexProps>),
  { ssr: false },
);

const AXIS_TEXT = "#4a5568";
const GRID = "#e6eaf0";
const SELECTED_TEXT = "#027ffc"; // --color-shift-electric-blue

export type BarItem = {
  label: string; // "Morning"
  score: number | null; // null = no data (no bar, never a 0 bar)
  band: string | null;
  liftPct: number | null; // vs. normal
  closed: boolean; // outside the restaurant's hours (area demand still shown)
};

/** One sentence per bar — the tooltip body and the screen-reader summary. */
function describe(i: BarItem): string {
  if (i.score === null) return `${i.label}: no forecast available.`;
  const parts = [
    SHOW_NUMBERS ? `${i.label}: demand score ${i.score.toFixed(1)} (${bandLabel(i.band)})` : `${i.label}: ${bandLabel(i.band)}`,
  ];
  if (SHOW_NUMBERS && i.liftPct !== null) parts.push(`${signed(i.liftPct)} vs. normal`);
  if (i.closed) parts.push("your restaurant is closed");
  return `${parts.join(", ")}.`;
}

// Daily Outlook: one bar per daypart, coloured by its demand band, its level
// (Busy, Quiet, …) on top. Bar heights use the fixed 0–150 scale so days are
// comparable, but no score is shown: operators see levels only.
export function DemandBarChart({
  items,
  height = 340,
  selected = null,
  onSelect,
  emphasizePeak = false,
  showBand = false,
}: {
  items: BarItem[];
  height?: number;
  /** Label the highest bar "Busiest" under its name. */
  emphasizePeak?: boolean;
  /** Write each bar's demand level (Busy, Very quiet, …) under its name, so colour is never the only cue. */
  showBand?: boolean;
  /** Highlights one bar's label in blue (kept in sync with a grid elsewhere on the page). */
  selected?: number | null;
  onSelect?: (index: number) => void;
}) {
  const peakScore = Math.max(...items.map((i) => i.score ?? 0));
  const peakIndex = emphasizePeak && peakScore > 0 ? items.findIndex((i) => i.score === peakScore) : -1;
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      foreColor: AXIS_TEXT,
      parentHeightOffset: 0,
      animations: { enabled: false },
      // Leave `events` out entirely when nothing listens: Apex reads
      // `chart.events.updated` internally and crashes if the key is present but undefined.
      ...(onSelect && {
        events: {
          dataPointSelection: (_e, _chart, opts) => {
            if (opts && opts.dataPointIndex >= 0) onSelect(opts.dataPointIndex);
          },
        },
      }),
    },
    // Every bar in its band's full colour, exactly as on the Daily Outlook, so a
    // level always looks the same. The selected day is marked by its label instead.
    colors: items.map((i) => bandColor(i.band)),
    plotOptions: {
      bar: {
        distributed: true,
        columnWidth: "52%",
        borderRadius: 6,
        borderRadiusApplication: "end",
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: true,
      // The level, not the score. Under showBand the level is already in the axis label.
      formatter: (_v, opts?: { dataPointIndex?: number }) => {
        const item = items[opts?.dataPointIndex ?? -1];
        if (!item || item.score === null) return "";
        if (SHOW_NUMBERS) return item.score.toFixed(1);
        return showBand ? "" : bandLabel(item.band);
      },
      offsetY: -22,
      style: { fontSize: "13px", fontWeight: 600, colors: ["#1a1a1a"] },
    },
    legend: { show: false },
    grid: {
      borderColor: GRID,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 8, top: 0, bottom: 0 },
    },
    states: { active: { filter: { type: "none" } } },
    xaxis: {
      // Second line under the period name: why a bar looks the way it does.
      // Every label is an array (Apex wants one shape for all of them).
      categories: items.map((i, n) =>
        i.score === null
          ? [i.label, "No data"]
          : i.closed
            ? [i.label, "Closed"]
            : n === peakIndex
              ? [i.label, "Busiest"]
              : showBand && i.band
                ? [i.label, bandLabel(i.band)]
                : [i.label],
      ),
      // With the level written under each day, keep the labels flat and a touch smaller:
      // a long name like "Exceptional" would otherwise make Apex tilt (and clip) them.
      labels: {
        style: {
          colors: items.map((_, n) => (selected === n ? SELECTED_TEXT : AXIS_TEXT)),
          fontSize: showBand ? "11px" : "13px",
        },
        ...(showBand && { rotate: 0, rotateAlways: false, hideOverlappingLabels: false, trim: false }),
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: MAX_SCORE,
      tickAmount: 6,
      ...(SHOW_NUMBERS
        ? {
            title: { text: "Demand score", style: { color: AXIS_TEXT, fontSize: "12px", fontWeight: 600 } },
            labels: { formatter: (v: number) => String(Math.round(v)), style: { colors: AXIS_TEXT, fontSize: "11px" } },
          }
        : { labels: { show: false } }),
    },
    tooltip: {
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        // Apex takes raw HTML here, so escape the text going into it.
        const text = describe(items[dataPointIndex]).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
        return `<div class="${styles.tip}">${text}</div>`;
      },
    },
  };

  return (
    <div>
      {/* The chart is drawn on a canvas-like SVG; this list is the readable version. */}
      <ul className={styles.srOnly}>
        {items.map((i) => (
          <li key={i.label}>{describe(i)}</li>
        ))}
      </ul>
      <div aria-hidden="true">
        <ReactApexChart
          type="bar"
          height={height}
          series={[{ name: "Demand level", data: items.map((i) => i.score) }]}
          options={options}
        />
      </div>
    </div>
  );
}
