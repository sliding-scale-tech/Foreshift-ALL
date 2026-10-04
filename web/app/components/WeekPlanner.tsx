"use client";

import Link from "next/link";
import { BandPill } from "@/app/components/BandPill";
import { BandLevelsTip } from "@/app/components/BandTip";
import { EventIcon } from "@/app/components/EventIcon";
import { InfoTip } from "@/app/components/InfoTip";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import { BANDS } from "@/app/lib/bands";
import type { WeekDay, WeekEvent } from "@/app/hooks/useWeek";
import { eventPeriod, vsNormal, type PlanCell, type PlanDay } from "@/app/lib/weekPlan";
import { FULL_DAY, formatClock, monthDay, trimNumber, type DayKey } from "@/app/lib/week";
import styles from "./WeekPlanner.module.css";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// "+19% vs. normal" / "-9% vs. normal" / "0% vs. normal"; "" when there is no baseline.
function vsText(score: number | null, base: number | null): string {
  const p = vsNormal(score, base);
  if (p === null) return "";
  const r = Math.round(p);
  return `${r > 0 ? "+" : ""}${r === 0 ? 0 : r}% vs. normal`;
}

function cellTip(day: PlanDay, c: PlanCell): string {
  const name = `${FULL_DAY[day.day as DayKey]} ${c.label.toLowerCase()}`;
  if (c.score === null) return `${name}: no forecast available`;
  const range = BANDS.find((b) => b.name === c.band);
  const area = `${c.band}${range ? ` (${range.min}–${range.max})` : ""}, score ${trimNumber(c.score, 1)}`;
  return c.closed ? `${name}: closed. Area demand ${area}` : `${name}: ${area}`;
}

// ---- Day selector for phones (the grid shows one day at a time there) -------

export function DayStrip({
  plan,
  selected,
  onSelect,
}: {
  plan: PlanDay[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className={styles.strip} role="group" aria-label="Choose a day">
      {plan.map((d) => (
        <button
          key={d.date}
          type="button"
          className={`${styles.stripBtn} ${d.date === selected ? styles.stripOn : ""} ${d.isPast ? styles.past : ""}`}
          aria-pressed={d.date === selected}
          aria-label={`${FULL_DAY[d.day as DayKey]}, ${monthDay(d.date)}${d.isToday ? ", today" : ""}`}
          onClick={() => onSelect(d.date)}
        >
          <span className={styles.stripDow}>{d.day}</span>
          <span className={styles.stripDate}>{monthDay(d.date)}</span>
          {d.isToday && <span className={styles.todayDot}>Today</span>}
        </button>
      ))}
    </div>
  );
}

// ---- Planning grid: days across, service periods down ------------------------

/** The day's weather as the grid shows it (null = none kept / no forecast). */
export type DayWeather = { condition: string; tempF: number; precipChance: number } | null;

export function WeekGrid({
  plan,
  eventCounts,
  weather,
  selected,
  onSelect,
  onShowEvents,
}: {
  plan: PlanDay[];
  eventCounts: Record<string, number>;
  /** Per date. Leave out to hide the weather row. */
  weather?: Record<string, DayWeather>;
  selected: string;
  onSelect: (date: string) => void;
  /** Called after an event count is chosen, so the page can bring the day's events into view. */
  onShowEvents?: () => void;
}) {
  const periods = plan[0]?.cells ?? [];
  // The busiest day still to come (today included): the one to plan around. First one if tied; none if all 0.
  const upcoming = plan.filter((d) => !d.isPast && d.peak && d.peak.score !== null);
  const top = upcoming.reduce<PlanDay | null>((a, b) => (!a || (b.peak?.score ?? 0) > (a.peak?.score ?? 0) ? b : a), null);
  const peakDate = top && (top.peak?.score ?? 0) > 0 ? top.date : null;
  return (
    <div className={styles.gridWrap}>
      <table className={styles.grid}>
        <caption className={styles.srOnly}>
          Demand by day and service period. Select a day to see its details below.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              <span className={styles.srOnly}>Service period</span>
            </th>
            {plan.map((d) => {
              const n = eventCounts[d.date] ?? 0;
              return (
                <th
                  key={d.date}
                  scope="col"
                  className={`${styles.dayHead} ${d.date === selected ? styles.selCol : ""} ${d.isPast ? styles.past : ""} ${d.isToday ? styles.todayCol : ""} ${d.date === peakDate ? styles.peakCol : ""}`}
                >
                  <button
                    type="button"
                    className={styles.dayBtn}
                    aria-pressed={d.date === selected}
                    aria-label={`${FULL_DAY[d.day as DayKey]}, ${monthDay(d.date)}${d.isToday ? ", today" : ""}. Show details`}
                    onClick={() => onSelect(d.date)}
                  >
                    <span className={styles.dow}>{d.day}</span>
                    <span className={styles.dateText}>{monthDay(d.date)}</span>
                    {d.isToday && <span className={styles.todayTag}>Today</span>}
                    {d.date === peakDate && <span className={styles.peakTag}>Peak day</span>}
                    {d.isPast && <span className={styles.dayNote}>Earlier</span>}
                  </button>
                  {!d.isPast &&
                    (n > 0 ? (
                      <button
                        type="button"
                        className={styles.countBtn}
                        aria-label={`${plural(n, "event")} on ${FULL_DAY[d.day as DayKey]}. Show them`}
                        onClick={() => {
                          onSelect(d.date);
                          onShowEvents?.();
                        }}
                      >
                        {plural(n, "event")}
                      </button>
                    ) : (
                      <span className={styles.dayNote}>0 events</span>
                    ))}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {periods.map((p, row) => (
            <tr key={p.key}>
              <th scope="row" className={styles.rowHead}>
                <span className={styles.periodName}>{p.label}</span>
                <span className={styles.periodWindow}>{p.window}</span>
              </th>
              {plan.map((d) => {
                const c = d.cells[row];
                const tip = cellTip(d, c);
                const kind = c.score === null ? styles.cellNone : c.closed ? styles.cellClosed : styles[`band${c.band}`];
                return (
                  <td
                    key={d.date}
                    className={`${styles.cellTd} ${d.date === selected ? styles.selCol : ""} ${d.isPast ? styles.past : ""}`}
                  >
                    <button
                      type="button"
                      className={`${styles.cell} ${kind}`}
                      data-tip={tip}
                      aria-label={`${tip}. Show details`}
                      onClick={() => onSelect(d.date)}
                    >
                      {c.score === null ? "Unavailable" : c.closed ? "Closed" : c.band}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
          {weather && (
            <tr>
              <th scope="row" className={styles.rowHead}>
                <span className={styles.periodName}>Weather</span>
                <span className={styles.periodWindow}>whole day</span>
              </th>
              {plan.map((d) => {
                const w = weather[d.date] ?? null;
                return (
                  <td
                    key={d.date}
                    className={`${styles.cellTd} ${d.date === selected ? styles.selCol : ""} ${d.isPast ? styles.past : ""}`}
                  >
                    <div className={styles.wx} title={w ? `${w.condition}, ${Math.round(w.precipChance)}% chance of precipitation` : undefined}>
                      {w ? (
                        <>
                          <span className={styles.wxTop}>
                            <span className={styles.wxIcon} role="img" aria-label={w.condition}>
                              <WeatherIcon condition={w.condition} />
                            </span>
                            <span className={styles.wxTemp}>{Math.round(w.tempF)}°F</span>
                          </span>
                          <span className={styles.wxName}>{w.condition}</span>
                        </>
                      ) : (
                        <span className={styles.wxNone} aria-label={d.isPast ? "Not kept for earlier days" : "No forecast"}>
                          &mdash;
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>

      <ul className={styles.legend} aria-label="Legend">
        {BANDS.map((b) => (
          <li key={b.name}>
            <BandPill band={b.name} />
          </li>
        ))}
        <li>
          <span className={`${styles.legendSwatch} ${styles.cellClosed}`}>Closed</span>
          <span className={styles.legendText}>outside your hours</span>
        </li>
        <li>
          <span className={`${styles.legendSwatch} ${styles.cellNone}`}>Unavailable</span>
          <span className={styles.legendText}>no forecast</span>
        </li>
        <li className={styles.noPrintTip}>
          <BandLevelsTip align="end" />
        </li>
      </ul>
    </div>
  );
}

// ---- Selected-day details ----------------------------------------------------

export function DayDetail({
  plan,
  weekDay,
  events,
}: {
  plan: PlanDay;
  weekDay: WeekDay | undefined;
  events: WeekEvent[];
}) {
  const name = FULL_DAY[plan.day as DayKey];
  const weather = weekDay?.weather ?? null;
  const peak = plan.peak;

  return (
    <section className={styles.detail} aria-labelledby="day-detail-title">
      <div className={styles.detailHead}>
        <div>
          <h2 id="day-detail-title" className={styles.detailTitle}>
            {name}, {monthDay(plan.date)}
            {plan.isToday && <span className={styles.todayTag}>Today</span>}
            {plan.isPast && <span className={styles.pastTag}>Earlier forecast</span>}
          </h2>
          <p className={styles.detailSub}>
            {peak && peak.score !== null
              ? `Demand peaks at ${peak.label.toLowerCase()} (${peak.band}, ${trimNumber(peak.score, 1)}).`
              : "No forecast is available for this day."}
            {events.length > 0 && ` ${plural(events.length, "nearby event")} may add to demand.`}
          </p>
        </div>
        <Link href={`/dashboard?date=${plan.date}`} className={styles.dailyLink}>
          View daily outlook
        </Link>
      </div>

      <div className={styles.detailCols}>
        <div>
          <h3 className={styles.blockTitle}>
            Demand score
            <InfoTip label="the day's demand score" align="start">
              The day&apos;s score is its busiest period&apos;s score, on a 0–150 scale. It describes your area, not
              your restaurant&apos;s own sales. &ldquo;vs. normal&rdquo; compares a period with its usual demand for
              your area, concept and day of the week; events and weather are included in the change.
            </InfoTip>
          </h3>
          <div className={styles.bigScore}>
            {peak && peak.score !== null ? (
              <>
                <BandPill band={peak.band ?? "Minimal"} />
                <span>{trimNumber(peak.score, 1)}</span>
                {vsText(peak.score, peak.base) && <span className={styles.vsNormal}>{vsText(peak.score, peak.base)}</span>}
              </>
            ) : (
              <span className={styles.muted}>Unavailable</span>
            )}
          </div>

          <ul className={styles.periodList}>
            {plan.cells.map((c) => (
              <li key={c.key} className={styles.periodRow}>
                <span>
                  <span className={styles.periodName}>{c.label}</span>
                  <span className={styles.periodWindow}>{c.window}</span>
                </span>
                {c.score === null ? (
                  <span className={styles.muted}>Unavailable</span>
                ) : (
                  <span className={styles.periodRight}>
                    {c.closed && <span className={styles.closedTag}>Closed</span>}
                    {vsText(c.score, c.base) && <span className={styles.vsSmall}>{vsText(c.score, c.base)}</span>}
                    <BandPill band={c.band ?? "Minimal"} />
                    <span className={styles.periodScore}>{trimNumber(c.score, 1)}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {plan.cells.some((c) => c.closed) && (
            <p className={styles.footnote}>Closed periods still show the area&apos;s demand.</p>
          )}
        </div>

        <div>
          <h3 className={styles.blockTitle}>Weather</h3>
          {weather ? (
            <div className={styles.weather}>
              <div className={styles.weatherIcon}>
                <WeatherIcon condition={weather.condition} />
              </div>
              <div>
                <div className={styles.weatherName}>{weather.condition}</div>
                <div className={styles.muted}>
                  {weather.tempF}°F · {Math.round(weather.precipChance)}% chance of precipitation
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.muted}>{plan.isPast ? "Not kept for earlier days." : "No forecast for this day."}</p>
          )}

          <h3 id="day-events" tabIndex={-1} className={`${styles.blockTitle} ${styles.eventsTitle}`}>
            Events ({events.length})
            <InfoTip label="events" align="start">
              Nearby events and the service period each one counts toward. Their estimated effect on demand is in
              the drivers list below.
            </InfoTip>
          </h3>
          {events.length === 0 ? (
            <p className={styles.muted}>{plan.isPast ? "Not kept for earlier days." : "No nearby events."}</p>
          ) : (
            <ul className={styles.events}>
              {events.map((e) => (
                <li key={`${e.eventId}-${e.date}`}>
                  <Link href={`/events-overview/${encodeURIComponent(e.eventId)}?date=${e.date}`} className={styles.event}>
                    <EventIcon eventClass={e.eventClass} size={22} />
                    <span className={styles.eventText}>
                      <span className={styles.eventName}>{e.name}</span>
                      <span className={styles.eventMeta}>
                        {[e.venue, e.time ? formatClock(e.time) : "Time not listed", eventPeriod(e.time)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
