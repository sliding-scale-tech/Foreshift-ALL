"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { WeeklyOutlookResult } from "my-app/convex/lib/outlook";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { useAccess } from "@/app/hooks/useAccess";
import { hasRestaurant, operatorLabel, pageSubtitle } from "@/app/lib/displayName";
import { useOutlook } from "@/app/hooks/useOutlook";
import { useWeek } from "@/app/hooks/useWeek";
import { DailyTotals } from "@/app/components/DailyTotals";
import { DriversCard } from "@/app/components/DriversCard";
import { InfoTip } from "@/app/components/InfoTip";
import { LastUpdated } from "@/app/components/LastUpdated";
import { LoadError } from "@/app/components/LoadError";
import { PageLoading } from "@/app/components/PageLoading";
import { DayDetail, DayStrip, WeekGrid } from "@/app/components/WeekPlanner";
import { WeekGlance } from "@/app/components/WeekGlance";
import { dayDrivers, toDrivers } from "@/app/lib/drivers";
import { FULL_DAY, weekLabel, type DayKey } from "@/app/lib/week";
import { buildPlan, glance } from "@/app/lib/weekPlan";
import shared from "../../shared.module.css";
import styles from "./weekly.module.css";

// Weekly Outlook — which days and service periods need attention. The
// planning grid, details and glance points all come from the week's resolved
// demand (live query), so they can't disagree; the driver list comes from the
// cached weekly outlook.
export default function WeeklyOutlookPage() {
  const { operator } = useMyOperator();
  const { access } = useAccess();
  const week = useWeek();
  const outlook = useOutlook<WeeklyOutlookResult>("weekly");

  const [picked, setPicked] = useState<string | null>(null);
  const [onlyDay, setOnlyDay] = useState(false);
  const stamp = useRef<HTMLSpanElement>(null);

  const restaurant = hasRestaurant(operator);
  const hours = restaurant ? operator?.operatingHours : undefined;
  const plan = useMemo(() => (week ? buildPlan(week, hours) : []), [week, hours]);

  // Nothing renders until the week AND the weekly outlook are both ready.
  if (outlook.status === "error") return <LoadError message={outlook.message} onRetry={outlook.retry} />;
  if (!week || outlook.status !== "ready") return <PageLoading label="Gathering demand insight…" />;

  const selected = picked ?? (plan.some((d) => d.date === week.today) ? week.today : plan[0].date);
  const selectedIdx = Math.max(0, plan.findIndex((d) => d.date === selected));
  const selectedPlan = plan[selectedIdx];
  const eventCounts = Object.fromEntries(plan.map((d) => [d.date, week.events.filter((e) => e.date === d.date).length]));

  const { busiest, quietest } = glance(plan);
  const allDrivers = toDrivers(outlook.result.drivers);
  // "Show only <day>": all of that day's events (with their estimated effect) and its weather,
  // not just the ones that made the week's top few.
  const drivers = onlyDay
    ? dayDrivers(
        week.events.filter((e) => e.date === selected),
        allDrivers.filter((d) => d.kind === "weather" && d.date === selected),
      )
    : allDrivers;
  const topDrivers = allDrivers.filter((d) => d.liftPct > 0).slice(0, 3);
  const hoursMissing = restaurant && plan.some((d) => d.hoursUnknown);


  function exportPdf() {
    // Stamp the printout with the moment it was generated, then open the print dialog (Save as PDF).
    // Landscape, so all seven day columns fit; the rule is removed once the dialog closes.
    const page = document.createElement("style");
    page.textContent = "@page { size: landscape; margin: 10mm; }";
    document.head.appendChild(page);
    window.addEventListener("afterprint", () => page.remove(), { once: true });
    if (stamp.current) {
      stamp.current.textContent = new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Detroit",
      }).format(new Date());
    }
    window.print();
  }

  return (
    <>
      <div className={styles.titleRow}>
        <div>
          <h1 className={shared.title}>Weekly outlook</h1>
          <p className={shared.subtitle}>{pageSubtitle(operator, weekLabel(week.weekStart))}</p>
          <LastUpdated generatedAt={week.syncedAt ?? outlook.generatedAt} />
        </div>

        {/* Paid plans only; everyone else is pointed at Billing. */}
        {access?.isSubscribed ? (
          <button type="button" className={`${styles.exportBtn} ${styles.noPrint}`} onClick={exportPdf}>
            Export weekly outlook
          </button>
        ) : (
          <Link href="/billing" className={`${styles.exportBtn} ${styles.exportLocked} ${styles.noPrint}`}>
            Export weekly outlook
            <span className={styles.paidTag}>Paid plans</span>
          </Link>
        )}
      </div>

      {/* Only appears on the printed / saved-as-PDF copy. */}
      <div className={styles.printHeader}>
        <strong>ForeShift</strong> · {operatorLabel(operator)} · Generated <span ref={stamp} /> (Detroit time)
      </div>

      <WeekGlance busiest={busiest} quietest={quietest} drivers={topDrivers} />

      {hoursMissing && (
        <p className={`${styles.hoursPrompt} ${styles.noPrint}`}>
          Add your operating hours to see which periods you&apos;re closed.{" "}
          <Link href="/settings">Add hours</Link>
        </p>
      )}

      <h2 className={`${shared.sectionTitle} ${styles.titleWithTip}`}>
        Plan your week
        <InfoTip label="the planning grid" align="start">
          Each cell is one service period. The label is its demand level; point at a cell to see the exact score, or
          select a day for the details. Striped cells are outside your hours and dashed cells have no forecast.
        </InfoTip>
      </h2>

      <div className={styles.noPrintStrip}>
        <DayStrip plan={plan} selected={selected} onSelect={setPicked} />
      </div>
      <WeekGrid
        plan={plan}
        eventCounts={eventCounts}
        weather={Object.fromEntries(week.days.map((d) => [d.date, d.weather]))}
        selected={selected}
        onSelect={setPicked}
        onShowEvents={() =>
          requestAnimationFrame(() => {
            const el = document.getElementById("day-events");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
            el?.focus({ preventScroll: true });
          })
        }
      />
      <DayDetail plan={selectedPlan} weekDay={week.days[selectedIdx]} events={week.events.filter((e) => e.date === selected)} />

      <div className={styles.lower}>
        <DailyTotals
          selected={selectedIdx}
          onSelect={(i) => setPicked(plan[i].date)}
          items={plan.map((d) => ({
            label: d.day,
            score: d.peak?.score ?? null,
            band: d.peak?.band ?? null,
            liftPct: null,
            closed: false,
          }))}
        />

        <div>
          {allDrivers.length > 0 && (
            <div className={`${styles.driverFilter} ${styles.noPrint}`}>
              <button type="button" className={styles.linkBtn} onClick={() => setOnlyDay((v) => !v)} aria-pressed={onlyDay}>
                {onlyDay ? "Show full week" : `Show only ${FULL_DAY[selectedPlan.day as DayKey]}`}
              </button>
            </div>
          )}
          <DriversCard
            drivers={drivers}
            subtitle={
              onlyDay
                ? `Events and weather on ${FULL_DAY[selectedPlan.day as DayKey]}.`
                : "Factors influencing this week's forecast."
            }
            empty={onlyDay ? `No events or weather effects on ${FULL_DAY[selectedPlan.day as DayKey]}.` : undefined}
          />
        </div>
      </div>
    </>
  );
}
