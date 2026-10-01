"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ApexOptions } from "apexcharts";
import type { Props as ApexProps } from "react-apexcharts";
import { bandColor, MAX_SCORE } from "@/app/lib/bands";
import styles from "./DemandBarChart.module.css";

// ApexCharts touches `window`, so it's client-only (cast: see DemandAreaChart).
const ReactApexChart = dynamic(
  () => import("react-apexcharts").then((m) => m.default as unknown as ComponentType<ApexProps>),
  { ssr: false },
);

const AXIS_TEXT = "#4a5568";
const GRID = "#e6eaf0";

export type BarItem = {
  label: string; // "Morning"
  score: number | null; // null = no data (no bar, never a 0 bar)
  band: string | null;
  liftPct: number | null; // vs. normal
  closed: boolean; // outside the restaurant's hours (area demand still shown)
};

function signed(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : ""}${r === 0 ? 0 : r}%`;
}

/** One sentence per bar — the tooltip body and the screen-reader summary. */
function describe(i: BarItem): string {
  if (i.score === null) return `${i.label}: no forecast available.`;
  const parts = [`${i.label}: demand score ${i.score.toFixed(1)} (${i.band})`];
  if (i.liftPct !== null) parts.push(`${signed(i.liftPct)} vs. normal`);
  if (i.closed) parts.push("your restaurant is closed");
  return `${parts.join(", ")}.`;
}

// Daily Outlook: one bar per daypart, coloured by its demand band, value on
// top, on the fixed 0–150 scale so days are comparable.
export function DemandBarChart({ items, height = 340 }: { items: BarItem[]; height?: number }) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      foreColor: AXIS_TEXT,
      parentHeightOffset: 0,
      animations: { enabled: false },
    },
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
      formatter: (v) => (typeof v === "number" ? v.toFixed(1) : ""),
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
      categories: items.map((i) =>
        i.score === null ? [i.label, "No data"] : i.closed ? [i.label, "Closed"] : [i.label],
      ),
      labels: { style: { colors: AXIS_TEXT, fontSize: "13px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: MAX_SCORE,
      tickAmount: 6,
      title: { text: "Demand score", style: { color: AXIS_TEXT, fontSize: "12px", fontWeight: 600 } },
      labels: { formatter: (v: number) => String(Math.round(v)), style: { colors: AXIS_TEXT, fontSize: "11px" } },
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
          series={[{ name: "Demand score", data: items.map((i) => i.score) }]}
          options={options}
        />
      </div>
    </div>
  );
}
