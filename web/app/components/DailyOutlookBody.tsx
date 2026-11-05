"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconSparkle,
  IconCalendarCheck,
  IconCloud,
} from "@/app/components/dashboard-icons";
import { IconArrowRight } from "@/app/components/icons";
import { DaypartColumns } from "@/app/components/DaypartColumns";
import { PeriodDetail } from "@/app/components/PeriodDetail";
import { BandPill } from "@/app/components/BandPill";
import { BandTip } from "@/app/components/BandTip";
import { DaypartIcon } from "@/app/components/DaypartIcon";
import { DemandBarChart } from "@/app/components/DemandBarChart";
import { DriversCard } from "@/app/components/DriversCard";
import { InfoTip } from "@/app/components/InfoTip";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import shared from "@/app/(app)/shared.module.css";
import {
  type DailyOutlook as DailyOutlookData,
  type DaypartOutlook,
} from "@/app/(app)/(intelligence)/dashboard/outlook-data";
import { BANDS, bandLabel } from "@/app/lib/bands";
import { MAX_SCORE } from "@/app/lib/bands";
import { openDuring, type SavedHours } from "@/app/lib/hours";
import styles from "@/app/(app)/(intelligence)/dashboard/dashboard.module.css";
import { SHOW_NUMBERS } from "@/app/lib/display";


// "+19%", "-9%", and plain "0%" (no change isn't a gain). Shown only with SHOW_NUMBERS.
function formatPct(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : ""}${r === 0 ? 0 : r}%`;
}

// The old layout (four daypart cards plus the Apex bar chart) is hidden for
// now: "Demand throughout the day" is DaypartColumns, and selecting a period
// opens its card. The code stays so it can be switched back on.
const SHOW_DAYPART_CARDS = false;

// The Daily Outlook body (brief, daypart cards, chart, drivers) — shared by the
// signed-in Daily Outlook page and the public sample outlook. `hours` is the
// operator's saved schedule; without it (the sample) nothing is marked closed.
export function OutlookBody({
  data,
  date,
  hours,
}: {
  data: DailyOutlookData;
  date: string;
  hours?: SavedHours[];
}) {
  // Per daypart: true open, false closed, null unknown (no hours for that day).
  const open = data.dayparts.map((dp) =>
    hours ? openDuring(hours, date, dp.start, dp.end) : true,
  );
  const hoursMissing = hours !== undefined && open.some((o) => o === null);
  // The strongest period gets a tag and a blue border (the first one if tied; none when every score is 0).
  const top = Math.max(...data.dayparts.map((dp) => dp.score ?? 0));
  const busiestKey =
    top > 0 ? data.dayparts.find((dp) => dp.score === top)?.key : undefined;

  const [selected, setSelected] = useState<string | null>(null);
  const picked = data.dayparts.findIndex((dp) => dp.key === selected);

  return (
    <>
      <section className={styles.brief}>
        <div className={styles.glanceLabel}>
          <IconSparkle />
          Today at a glance
        </div>
        <h2 className={styles.glanceHeadline}>{headline(data)}</h2>
        <p className={styles.glanceText}>{data.brief}</p>
        {/* The demand score box (hidden: the dashboard shows levels only). */}
        {SHOW_NUMBERS && (
          <div className={styles.glanceScore}>
            <div className={styles.scoreHead}>
              <span className={styles.bandName}>{bandLabel(data.band)}</span>
              <span>{data.score.toFixed(1)}</span>
            </div>
            <div className={styles.scoreTrack}>
              <div className={styles.scoreFill} style={{ width: `${Math.min(100, (data.score / MAX_SCORE) * 100)}%` }} />
            </div>
            <div className={styles.scoreScale}>
              <span>0</span>
              <span>{MAX_SCORE / 2}</span>
              <span>{MAX_SCORE}</span>
            </div>
          </div>
        )}
        {data.briefIsFactual && (
          <p className={styles.factualNote}>
            The AI summary is unavailable right now, so this summary is written straight from the forecast.
          </p>
        )}
      </section>

      {hoursMissing && (
        <p className={styles.hoursPrompt}>
          Add your operating hours to see which periods you&apos;re open. <Link href="/settings">Add hours</Link>
        </p>
      )}
      {data.dayparts.every((dp) => dp.score === null) && (
        <p className={styles.hoursPrompt} role="status">
          No forecast is available for this day yet.
        </p>
      )}

      <DaypartColumns
        dayparts={data.dayparts}
        closed={open.map((o) => o === false)}
        busiestKey={busiestKey}
        selected={selected}
        onSelect={setSelected}
      />

      {/* A selected period opens its details, full width under the columns. */}
      {picked >= 0 && (
        <PeriodDetail
          dp={data.dayparts[picked]}
          closed={open[picked] === false}
          busiest={data.dayparts[picked].key === busiestKey}
          canEditHours={hours !== undefined}
          onClose={() => setSelected(null)}
        />
      )}

      {SHOW_DAYPART_CARDS && (
        <>
          <div className={styles.dayparts}>
            {data.dayparts.map((dp, i) => (
              <DaypartCard
                key={dp.key}
                dp={dp}
                closed={open[i] === false}
                busiest={dp.key === busiestKey}
                canEditHours={hours !== undefined}
              />
            ))}
          </div>
          {/* The Apex bar chart that sat beside the cards. */}
          <section className={`${shared.card} ${styles.chartCard}`}>
            <h2 className={`${shared.cardTitle} ${styles.chartTitle}`}>Demand level by period</h2>
            <DemandBarChart
              emphasizePeak
              items={data.dayparts.map((dp, i) => ({
                label: dp.label,
                score: dp.score,
                band: dp.band,
                liftPct: dp.liftPct,
                closed: open[i] === false,
              }))}
            />
          </section>
        </>
      )}

      <div className={styles.lower}>
        <section className={`${shared.card} ${styles.influence}`} aria-labelledby="influence-title">
          <h2 id="influence-title" className={styles.influenceTitle}>
            What&apos;s influencing today
          </h2>
          <div className={styles.influenceCols}>
            <div className={styles.influenceItem}>
              <span className={styles.influenceIcon}>
                <IconCalendarCheck />
              </span>
              <div>
                <h3>Events</h3>
                <p>{eventsLine(data)}</p>
                <Link href="/events-overview" className={styles.influenceLink}>
                  View nearby events <IconArrowRight />
                </Link>
              </div>
            </div>
            <div className={styles.influenceItem}>
              <span className={styles.influenceIcon}>
                <IconCloud />
              </span>
              <div>
                <h3>Weather</h3>
                <p>{weatherLine(data)}</p>
                <Link href="/weather-outlook" className={styles.influenceLink}>
                  View weather details <IconArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <DriversCard drivers={data.drivers} subtitle="Factors influencing today's forecast." />
      </div>

      <HowItWorks />
    </>
  );
}

// ---- Plain-words lines for the glance and "What's influencing today" --------

const PERIOD: Record<string, string> = { morning: "morning", midday: "midday", dinner: "dinner", late: "late night" };
// "… at dinner", "… in the morning": a period inside a sentence.
const AT: Record<string, string> = {
  morning: "in the morning",
  midday: "at midday",
  dinner: "at dinner",
  late: "late at night",
};

/** "A", "A and B", "A, B and C". */
function joinWords(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** Tour titles run long ("Band: The Big Tour", "X (with Y)"): keep the part people recognise. */
function shortName(name: string): string {
  const cut = name.split(/:\s|\s+\(|\s+feat\.|\s+w\/|\s+[-–]\s+/i)[0].trim() || name;
  return cut.length > 56 ? `${cut.slice(0, 53).trimEnd()}...` : cut;
}

/** "Dinner leads the day" / "Midday and dinner lead the day" / "A quiet day ahead". */
function headline(data: DailyOutlookData): string {
  const top = data.dayparts.filter((dp) => dp.band !== null && dp.band === data.band);
  if (top.length === 0 || data.band === "Minimal") return "A quiet day ahead";
  if (top.length === data.dayparts.length) return `${bandLabel(data.band)} all day`;
  const names = top.map((dp) => PERIOD[dp.key]);
  return `${cap(joinWords(names))} ${names.length > 1 ? "lead" : "leads"} the day`;
}

/** Events by the period they fall in: "Red Wings vs. Blackhawks may bring more people at dinner." */
function eventsLine(data: DailyOutlookData): string {
  if (data.events.length === 0) return "No big events nearby today.";
  const shown = data.events.slice(0, 2);
  const names = shown.map((e) => shortName(e.name));
  const periods = [...new Set(shown.map((e) => AT[e.daypart]))];
  const more = data.events.length - shown.length;
  const who = more > 0 ? `${names.join(", ")} and ${more} more` : joinWords(names);
  return `${who} may bring more people ${joinWords(periods)}.`;
}

/** "Rain in the morning and at midday, then cloudy at dinner. It may keep some people home at midday." */
function weatherLine(data: DailyOutlookData): string {
  const withWx = data.dayparts.filter((dp) => dp.weather);
  if (withWx.length === 0) return "No weather forecast is available for today.";
  const runs: { condition: string; periods: string[] }[] = [];
  for (const dp of withWx) {
    const c = dp.weather!.condition.toLowerCase();
    const last = runs[runs.length - 1];
    if (last && last.condition === c) last.periods.push(AT[dp.key]);
    else runs.push({ condition: c, periods: [AT[dp.key]] });
  }
  const conditions =
    runs.length === 1
      ? `${cap(runs[0].condition)} all day`
      : cap(runs.map((r) => `${r.condition} ${joinWords(r.periods)}`).join(", then "));
  const lower = withWx.filter((dp) => dp.weatherPct <= -1).map((dp) => AT[dp.key]);
  const higher = withWx.filter((dp) => dp.weatherPct >= 1).map((dp) => AT[dp.key]);
  const effect =
    lower.length > 0
      ? `It may keep some people home ${joinWords(lower)}.`
      : higher.length > 0
        ? `It may bring more people out ${joinWords(higher)}.`
        : "Little effect on demand is expected.";
  return `${conditions}. ${effect}`;
}

function DaypartCard({
  dp,
  closed,
  busiest,
  canEditHours,
}: {
  dp: DaypartOutlook;
  closed: boolean;
  busiest: boolean;
  // Shows the edit-hours link beside "Closed". Signed-in only: the public sample has no hours to edit.
  canEditHours: boolean;
}) {
  return (
    <div
      className={`${shared.card} ${styles.dpCard} ${busiest ? styles.dpBusiest : ""}`}
    >
      {busiest && <span className={styles.busiestTag}>Busiest period</span>}
      <div className={styles.dpHead}>
        <DaypartIcon daypart={dp.key} />
        <div className={styles.dpHeadText}>
          <div className={styles.dpTitle}>{dp.label}</div>
          <div className={styles.dpWindow}>{dp.window}</div>
        </div>
        {closed && (
          <div className={styles.dpCorner}>
            <span className={styles.closedBadge}>Closed</span>
            {canEditHours && (
              <Link
                href="/settings#operating-hours"
                className={styles.editHours}
                aria-label="Edit operating hours"
                title="Edit operating hours"
              >
                <IconPencil />
              </Link>
            )}
          </div>
        )}
      </div>

      <div className={styles.dpMeta}>
        {dp.band ? (
          <span className={styles.bandCell}>
            <BandPill band={dp.band} />
            <BandTip band={dp.band} align="start" />
          </span>
        ) : (
          <span className={styles.unavailable}>No forecast</span>
        )}
        {/* "vs. normal" is shown only with SHOW_NUMBERS (lib/display.ts). */}
        {!SHOW_NUMBERS ? null : dp.liftPct === null ? (
          <span className={styles.unavailable}>Comparison not available</span>
        ) : (
          <span className={styles.lift}>
            {formatPct(dp.liftPct)} vs. normal
            <InfoTip label="vs. normal" align="end">
              Compared with this period&apos;s usual demand for your area,
              concept and day of the week, before events and weather. The change
              includes both.
            </InfoTip>
          </span>
        )}
      </div>

      <div className={styles.weather}>
        <div className={styles.weatherIcon}>
          <WeatherIcon condition={dp.weather?.condition ?? ""} />
        </div>
        <div>
          <div className={styles.weatherName}>
            {dp.weather?.condition ?? "No forecast"}
          </div>
          {dp.weather && (
            <div className={styles.weatherTemp}>{dp.weather.tempF}°F</div>
          )}
        </div>
      </div>

      <div className={styles.eventHead}>
        <IconCalendarCheck />
        What&apos;s driving demand
        <InfoTip label="event impact" align="end">
          Nearby events in this period. An event&apos;s estimated impact is the
          extra demand it may add, counted in the period it falls in (events
          with no start time count across the whole day).
        </InfoTip>
      </div>
      <p className={styles.eventNote}>{dp.eventNote}</p>
      {closed && (
        <p className={styles.closedNote}>
          Your restaurant is closed during this period.
        </p>
      )}
    </div>
  );
}

function IconPencil() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.5 7.5 3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Longer explanations the tooltips point to. Wording stays general on
// purpose: the model's coefficients are not shown to operators.
function HowItWorks() {
  return (
    <details className={styles.howItWorks}>
      <summary>How this outlook works</summary>
      <div className={styles.howBody}>
        <p>
          ForeShift patent-pending technology combines typical demand patterns for your restaurant concept, area, and
          time of day with nearby events, weather, and seasonal trends. The outlook uses simple demand levels&mdash;from
          Very quiet to Exceptional&mdash;to help you understand when your area may be busiest.
        </p>

        <h3>What it measures</h3>
        <p>
          ForeShift forecasts zone demand: how busy your area is likely to be
          for restaurants of your concept in each part of the day. It&apos;s an
          estimate for the area. It doesn&apos;t know your own sales, bookings
          or staffing.
        </p>

        <h3>How a demand level is set</h3>
        <p>
          Each period starts from a baseline for your zone, concept and day of
          the week. Nearby events can add demand on top of that, and the weather
          can raise or lower it. The result is shown as a level, from Very quiet
          to Exceptional.
        </p>

        <h3>Today&apos;s demand level</h3>
        <p>The level of the day&apos;s busiest period.</p>

        {SHOW_NUMBERS && (
          <>
            <h3>&ldquo;vs. normal&rdquo;</h3>
            <p>
              The change from that period&apos;s baseline, with events and weather included. +50% means about one and
              a half times the usual demand for that period.
            </p>
          </>
        )}

        <h3>Demand levels</h3>
        <table className={styles.bandTable}>
          <thead>
            <tr>
              <th scope="col">Level</th>
              {SHOW_NUMBERS && <th scope="col">Score</th>}
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {BANDS.map((b) => (
              <tr key={b.name}>
                <td>
                  <BandPill band={b.name} />
                </td>
                {SHOW_NUMBERS && (
                  <td>
                    {b.min}–{b.max}
                  </td>
                )}
                <td>{b.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Events and weather</h3>
        <p>
          Event impact and weather effects are estimates. An event counts toward
          the period it falls in. &ldquo;No effect&rdquo; means no material
          change is expected.
        </p>
      </div>
    </details>
  );
}
