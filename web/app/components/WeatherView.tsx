"use client";

import { useState } from "react";
import Link from "next/link";
import type { WeatherOutlookResult } from "my-app/convex/lib/outlook";
import type { DaypartWeather } from "@/app/hooks/useOutlook";
import type { useMyOperator } from "@/app/hooks/useMyOperator";
import type { WeekData } from "@/app/hooks/useWeek";
import { BandPill } from "@/app/components/BandPill";
import { InfoTip } from "@/app/components/InfoTip";
import { LastUpdated } from "@/app/components/LastUpdated";
import { IconSparkle } from "@/app/components/dashboard-icons";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import { DAYPARTS } from "@/app/lib/dayparts";
import { hasRestaurant, pageSubtitle } from "@/app/lib/displayName";
import { openDuring } from "@/app/lib/hours";
import {
  buildWeatherSummary,
  describePeriod,
  effectOf,
  fmtPct,
  fmtPoints,
  mostAffected,
  tempSummary,
  type WeatherPeriod,
} from "@/app/lib/weather";
import { FULL_DAY, longDate, monthDay, trimNumber, weekLabel, type DayKey } from "@/app/lib/week";
import shared from "@/app/(app)/shared.module.css";
import styles from "./WeatherView.module.css";

type Operator = ReturnType<typeof useMyOperator>["operator"];

// ---- Compact date selector ---------------------------------------------------

function DaySelector({
  week,
  selected,
  onSelect,
}: {
  week: WeekData;
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className={styles.days} role="group" aria-label="Choose a day">
      {week.days.map((d) => {
        const past = d.date < week.today;
        const isToday = d.date === week.today;
        const w = d.weather;
        const impact = w ? d.weatherImpact : null;
        const label = `${FULL_DAY[d.day as DayKey]}, ${monthDay(d.date)}${isToday ? ", today" : ""}. ${
          w
            ? `${past ? "Earlier day, recorded weather: " : ""}${w.condition}, high ${Math.round(w.highF)}°F, low ${Math.round(w.lowF)}°F, ${Math.round(w.precipChance)}% chance of precipitation${
                impact ? `, estimated weather effect on demand ${fmtPct(impact.percent)}` : ""
              }`
            : past
              ? "Earlier day, no weather recorded"
              : "No forecast"
        }`;
        return (
          <button
            key={d.date}
            type="button"
            className={`${styles.day} ${d.date === selected ? styles.dayOn : ""} ${past ? styles.past : ""}`}
            aria-pressed={d.date === selected}
            aria-label={label}
            onClick={() => onSelect(d.date)}
          >
            <span className={styles.dow}>{d.day}</span>
            <span className={styles.date}>{monthDay(d.date)}</span>
            {/* No icon without a reading: an empty cloud would read as "Cloudy". */}
            <span className={styles.dayIcon}>{w && <WeatherIcon condition={w.condition} />}</span>
            {w ? (
              <>
                <span className={styles.dayTemp}>
                  {Math.round(w.highF)}°<span className={styles.dayLow}> / {Math.round(w.lowF)}°</span>
                </span>
                <span className={styles.dayNote}>{Math.round(w.precipChance)}% rain</span>
                {/* Percent, the same figure the summary's "Estimated weather effect" shows for this day. */}
                {impact && (
                  <span
                    className={`${styles.dayImpact} ${
                      effectOf(impact.percent, w.severity).kind === "lower"
                        ? styles.pctLowerOnLight
                        : effectOf(impact.percent, w.severity).kind === "raise"
                          ? styles.pctRaise
                          : ""
                    }`}
                  >
                    Impact {fmtPct(impact.percent)}
                  </span>
                )}
              </>
            ) : (
              <span className={styles.dayNote}>{past ? "Not recorded" : "No forecast"}</span>
            )}
            {isToday && <span className={styles.today}>Today</span>}
            {past && <span className={styles.earlierTag}>Earlier</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---- One period row, opened for its explanation -----------------------------------

function PeriodRow({ p, open, onToggle, past }: { p: WeatherPeriod; open: boolean; onToggle: () => void; past: boolean }) {
  const effect = effectOf(p.pct, p.severity);
  const id = `period-${p.key}`;
  return (
    <li className={`${styles.row} ${open ? styles.rowOpen : ""}`}>
      <button type="button" className={styles.rowBtn} aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className={styles.cellPeriod}>
          <span className={styles.periodName}>
            {p.label}
            {p.closed && <span className={styles.closedTag}>Closed</span>}
          </span>
          <span className={styles.periodWindow}>{p.window}</span>
        </span>

        <span className={styles.cellCond}>
          <span className={styles.srOnly}>Conditions: </span>
          {p.condition ? (
            <>
              <span className={styles.condIcon}>
                <WeatherIcon condition={p.condition} />
              </span>
              {p.condition}
            </>
          ) : (
            <span className={styles.muted}>{past ? "Not recorded" : "No forecast"}</span>
          )}
        </span>

        <span className={styles.cellTemp}>
          <span className={styles.srOnly}>Temperature: </span>
          {p.tempF === null ? "—" : `${Math.round(p.tempF)}°F`}
        </span>

        <span className={styles.cellRain}>
          <span className={styles.srOnly}>Chance of precipitation: </span>
          {p.precip === null ? "—" : `${Math.round(p.precip)}%`}
        </span>

        <span className={styles.cellEffect}>
          <span className={styles.srOnly}>Estimated demand effect: </span>
          {effect.kind === "unavailable" && <span className={styles.muted}>Unavailable</span>}
          {effect.kind === "none" && <span className={styles.effectNone}>{effect.text}</span>}
          {(effect.kind === "lower" || effect.kind === "raise") && (
            <>
              <span className={`${styles.pct} ${effect.kind === "lower" ? styles.pctLower : styles.pctRaise}`}>
                {fmtPct(p.pct ?? 0)}
              </span>
              <span className={styles.effectLabel}>{effect.text}</span>
            </>
          )}
          {effect.kind !== "unavailable" && p.impactScore !== null && (
            <span className={styles.impactScore}>Impact score {fmtPoints(p.impactScore)}</span>
          )}
        </span>

        <svg className={styles.chevron} viewBox="0 0 10 6" aria-hidden="true">
          <path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div id={id} className={styles.rowDetail}>
          {describePeriod(p, past)}
        </div>
      )}
    </li>
  );
}

// ---- The page body -------------------------------------------------------------------

export function WeatherView({
  week,
  selected,
  onSelect,
  operator,
  result,
  periodWeather,
}: {
  week: WeekData;
  selected: string;
  onSelect: (date: string) => void;
  operator: Operator;
  /** The selected day's weather outlook; null while it's being generated. */
  result: WeatherOutlookResult | null;
  periodWeather: DaypartWeather | null;
}) {
  const day = week.days.find((d) => d.date === selected);
  // An earlier day this week: the weather shown is what was recorded, not a forecast.
  const past = selected < week.today;
  const hours = hasRestaurant(operator) ? operator?.operatingHours : undefined;

  const periods: WeatherPeriod[] = DAYPARTS.map((dp) => {
    const w = result?.weather.find((x) => x.daypart === dp.key);
    const pw = periodWeather?.[dp.key];
    return {
      key: dp.key,
      label: dp.label,
      window: dp.window,
      condition: w ? w.condition : null,
      tempF: w ? w.temp_f : null,
      precip: w && pw ? pw.precipChance : null,
      pct: w ? w.weather_impact_percent : null,
      impactScore: w ? w.weather_impact_score : null,
      severity: w ? w.severity : 0,
      closed: hours ? openDuring(hours, selected, dp.start, dp.end) === false : false,
    };
  });

  const hasForecast = periods.some((p) => p.condition !== null);
  const parsed = result ? parseFloat(result.day_summary.weather_percent) : NaN;
  const dayPct = hasForecast && Number.isFinite(parsed) ? parsed : null;
  const strongest = Math.max(0, ...periods.map((p) => p.severity));
  const dayEffect = effectOf(dayPct, strongest);
  const sentences = buildWeatherSummary({ dayName: FULL_DAY[(day?.day ?? "Mon") as DayKey], dayPct, periods, past });
  const temps = tempSummary(periods);
  const conditions = [...new Set(periods.map((p) => p.condition).filter((c): c is string => c !== null))];
  const firstOpen = mostAffected(periods)[0]?.key ?? null;
  const [openKey, setOpenKey] = useState<string | null | undefined>(undefined);
  const openNow = openKey === undefined ? firstOpen : openKey;

  return (
    <>
      <h1 className={shared.title}>Weather outlook</h1>
      <p className={shared.subtitle}>{pageSubtitle(operator, weekLabel(week.weekStart))}</p>
      <LastUpdated generatedAt={week.syncedAt} />

      <h2 className={`${shared.sectionTitle} ${styles.titleWithTip}`}>
        Choose a day
        <InfoTip label="the day selector" align="start">
          Pick a day to see how its weather may affect demand. Each day shows its warmest and coolest temperature
          across the four service periods (high / low), the chance of precipitation, and the weather&apos;s estimated effect
          on demand for the whole day (the same figure as &ldquo;Estimated weather effect on demand&rdquo; below). Today and later days show
          the forecast; earlier days this week show the weather that was recorded.
        </InfoTip>
      </h2>
      <DaySelector
        week={week}
        selected={selected}
        onSelect={(d) => {
          setOpenKey(undefined);
          onSelect(d);
        }}
      />

      <section className={styles.summary} aria-labelledby="weather-summary-title" aria-live="polite">
        <div className={styles.summaryMain}>
          <h2 id="weather-summary-title" className={styles.summaryTitle}>
            <IconSparkle />
            Weather impact at a glance
          </h2>
          <p className={styles.where}>
            {longDate(selected)}
            {operator?.zone ? ` · ${operator.zone}` : ""}
            {past ? " · Earlier day: recorded weather" : ""}
          </p>

          {result === null ? (
            <p className={styles.updating}>Updating for this day…</p>
          ) : (
            <>
              {hasForecast && (
                <div className={styles.overview}>
                  <span className={styles.overviewIcon}>
                    <WeatherIcon condition={conditions[0] ?? ""} />
                  </span>
                  <div>
                    <div className={styles.overviewCond}>{conditions.join(" / ")}</div>
                    <div className={styles.overviewTemp}>
                      {day?.weather ? `Average ${Math.round(day.weather.tempF)}°F` : "Temperature"}
                      {temps && ` · ${temps.min}–${temps.max}°F across service periods`}
                    </div>
                  </div>
                </div>
              )}
              <ul className={styles.sentences}>
                {sentences.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className={styles.metric}>
          <div className={styles.metricLabel}>
            Estimated weather effect on demand
            <InfoTip label="the daily weather effect" align="end">
              How much the weather may change demand for the whole day, compared with a normal day. It combines the
              four service periods, counting busier periods more, so it isn&apos;t a simple average of the period
              figures below.
            </InfoTip>
          </div>
          {result === null ? (
            <div className={styles.metricNone}>Updating…</div>
          ) : dayEffect.kind === "unavailable" ? (
            <div className={styles.metricNone}>Unavailable</div>
          ) : dayEffect.kind === "none" ? (
            <div className={styles.metricNone}>{past ? "No material weather effect" : "No material weather effect expected"}</div>
          ) : (
            <>
              <div className={`${styles.metricValue} ${dayEffect.kind === "lower" ? styles.pctLowerOnLight : styles.pctRaise}`}>
                {fmtPct(dayPct ?? 0)}
              </div>
              <div className={styles.metricSub}>{dayEffect.text}</div>
            </>
          )}
          <div className={styles.metricNote}>For the whole day</div>
        </div>

        {day?.demand && (
          <p className={styles.overall}>
            Overall demand that day: <BandPill band={day.demand.peakBand} />
            <span className={styles.overallScore}>{trimNumber(day.demand.peakScore, 1)}</span> (busiest period; it
            includes events as well as weather).{" "}
            <Link href={`/dashboard?date=${selected}`}>View demand outlook for this date</Link>
          </p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="weather-during-title">
        <h2 id="weather-during-title" className={`${styles.cardTitle} ${styles.titleWithTip}`}>
          Weather during service
          <InfoTip label="the period comparison" align="start">
            Each row is one service period. Select a row for the explanation. Closed periods still show the weather,
            but your restaurant isn&apos;t open then. A missing forecast is shown as Unavailable, never as no effect.
          </InfoTip>
        </h2>

        {result === null ? (
          <p className={styles.updating}>Updating for this day…</p>
        ) : !hasForecast ? (
          <div className={styles.empty} role="status">
            <strong>{past ? "No weather was recorded for this day." : "No weather forecast for this day."}</strong>
            <span>
              {past
                ? "This is different from a day with no weather effect."
                : "Forecasts cover today and the days ahead. This is different from a day with no weather effect."}
            </span>
          </div>
        ) : (
          <>
            <div className={styles.columns} aria-hidden="true">
              <span>Period</span>
              <span>Conditions</span>
              <span className={styles.colWithTip}>
                Temperature
                <InfoTip label="temperature" align="center">
                  The average temperature during the period. The day&apos;s figure above is the daily average.
                </InfoTip>
              </span>
              <span className={styles.colWithTip}>
                Rain chance
                <InfoTip label="rain chance" align="center">
                  The chance of precipitation (rain or snow) during the period, from the forecast. A high chance can
                  lower demand even when the condition isn&apos;t labelled rain.
                </InfoTip>
              </span>
              <span className={styles.colWithTip}>
                Estimated demand effect
                <InfoTip label="estimated demand effect" align="end">
                  The estimated change in demand for the period from weather alone, compared with a normal one. It
                  isn&apos;t a weather warning. The impact score is the same change in demand-score points: what
                  the weather adds to or takes off the period&apos;s score.
                </InfoTip>
              </span>
              <span />
            </div>
            <ul className={styles.list}>
              {periods.map((p) => (
                <PeriodRow key={p.key} p={p} past={past} open={openNow === p.key} onToggle={() => setOpenKey(openNow === p.key ? null : p.key)} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={styles.about} aria-label="About this forecast">
        <h2 className={styles.aboutTitle}>About this forecast</h2>
        <ul>
          <li>Weather comes from WeatherAPI. All times are Detroit local time (ET).</li>
          <li>“Last updated” is when the forecast numbers were last recalculated from the latest weather and events.</li>
          <li>Earlier days this week show the weather that was recorded for them, not a forecast.</li>
          <li>Demand effects are estimates for your area, not weather warnings.</li>
          <li>
            Wind, gusts, feels-like temperature, rain amount and official weather alerts aren&apos;t shown yet.
          </li>
        </ul>
      </section>
    </>
  );
}
