"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ApexOptions } from "apexcharts";
import type { Props as ApexProps } from "react-apexcharts";

// ApexCharts touches `window`, so it's client-only. Options mirror the Bubble
// Apex element's defaultOptions (smooth area, 4px markers with a white ring).
// The cast is because react-apexcharts types its default export as a bare
// class that next/dynamic won't accept as a component.
const ReactApexChart = dynamic(
  () => import("react-apexcharts").then((m) => m.default as unknown as ComponentType<ApexProps>),
  { ssr: false },
);

const BLUE = "#027FFC"; // --color-shift-electric-blue
const MARKER = "#2F45C5";
const AXIS_TEXT = "#4a5568";
const GRID = "#e6eaf0";

export function DemandAreaChart({
  categories,
  values,
  height = 350,
  yMax,
  tickAmount,
  decimals = 1,
  seriesName = "Demand Score",
  showLegend = true,
}: {
  categories: string[];
  values: number[];
  height?: number;
  /** Fixed y-axis max. Omit for 0..next multiple of 10 above the data. */
  yMax?: number;
  tickAmount?: number;
  decimals?: number;
  seriesName?: string;
  showLegend?: boolean;
}) {
  const max = yMax ?? Math.max(10, Math.ceil(Math.max(...values) / 10) * 10);

  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      foreColor: AXIS_TEXT,
      parentHeightOffset: 0,
    },
    stroke: { curve: "smooth", width: 3, colors: [BLUE] },
    fill: { type: "solid", colors: ["#027FFC33"], opacity: 0.25 },
    markers: {
      size: 4,
      colors: [MARKER],
      strokeColors: "#FFFFFF",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    dataLabels: { enabled: false },
    legend: showLegend
      ? { show: true, position: "top", horizontalAlign: "right" }
      : { show: false },
    grid: {
      borderColor: GRID,
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 14, top: 0, bottom: 0 },
    },
    xaxis: {
      categories,
      labels: { style: { colors: AXIS_TEXT, fontSize: "12px" } },
      axisBorder: { show: false },
      axisTicks: { show: true, color: "#cfd6e1" },
      crosshairs: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max,
      tickAmount: tickAmount ?? max / 10,
      labels: {
        formatter: (v: number) => v.toFixed(decimals),
        style: { colors: AXIS_TEXT, fontSize: "11px" },
      },
    },
    tooltip: { y: { formatter: (v: number) => v.toFixed(1) } },
  };

  return (
    <ReactApexChart
      type="area"
      height={height}
      series={[{ name: seriesName, data: values }]}
      options={options}
    />
  );
}
