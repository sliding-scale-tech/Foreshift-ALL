import Link from "next/link";
import { IconSparkle, IconCalendarCheck } from "@/app/components/dashboard-icons";
import { BandPill } from "@/app/components/BandPill";
import { BandTip } from "@/app/components/BandTip";
import { DaypartIcon } from "@/app/components/DaypartIcon";
import { DemandBarChart } from "@/app/components/DemandBarChart";
import { DriversCard } from "@/app/components/DriversCard";
import { InfoTip } from "@/app/components/InfoTip";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import shared from "@/app/(app)/shared.module.css";
import {
  MAX_SCORE,
  type DailyOutlook as DailyOutlookData,
  type DaypartOutlook,
} from "@/app/(app)/(intelligence)/dashboard/outlook-data";
import { BANDS } from "@/app/lib/bands";
import { openDuring, type SavedHours } from "@/app/lib/hours";
import styles from "@/app/(app)/(intelligence)/dashboard/dashboard.module.css";

// "+19%", "-9%", and plain "0%" (no change isn't a gain).
function formatPct(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : ""}${r === 0 ? 0 : r}%`;
}

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
  const open = data.dayparts.map((dp) => (hours ? openDuring(hours, date, dp.start, dp.end) : true));
  const hoursMissing = hours !== undefined && open.some((o) => o === null);
  // The strongest period gets a tag and a blue border (the first one if tied; none when every score is 0).
  const top = Math.max(...data.dayparts.map((dp) => dp.score ?? 0));
  const busiestKey = top > 0 ? data.dayparts.find((dp) => dp.score === top)?.key : undefined;

  return (
    <>
      <section className={styles.brief}>
        <div>
          <div className={shared.bannerTitle}>
            <IconSparkle />
            Today&apos;s demand brief
          </div>
          <p className={shared.bannerText}>{data.brief}</p>
          {data.briefIsFactual && (
            <p className={styles.factualNote}>
              The AI summary is unavailable right now, so this brief is written straight from the numbers below.
            </p>
          )}
        </div>
        <div>
          <div className={styles.scoreLabel}>
            Demand score
            <InfoTip label="demand score" tone="dark" align="end">
              How busy your area is likely to be for restaurants of your concept, on a 0–{MAX_SCORE} scale.
              It describes the area, not your restaurant&apos;s own sales.
            </InfoTip>
          </div>
          <div className={styles.scoreHead}>
            <span className={styles.bandName}>
              {data.band}
              <BandTip band={data.band} tone="dark" align="start" />
            </span>
            <span>{data.score.toFixed(1)}</span>
          </div>
          <div className={styles.scoreTrack}>
            <div
              className={styles.scoreFill}
              style={{ width: `${Math.min(100, (data.score / MAX_SCORE) * 100)}%` }}
            />
          </div>
          <div className={styles.scoreScale}>
            <span>0</span>
            <span>{MAX_SCORE / 2}</span>
            <span>{MAX_SCORE}</span>
          </div>
          <div className={styles.peakNote}>
            <span>Busiest period: {data.peakLabel}</span>
            <span className={styles.peakCalc}>
              Daily score calculation
              <InfoTip label="how the daily score is calculated" tone="dark" align="end">
                The daily score is the score of your busiest period, on the same 0&ndash;{MAX_SCORE} scale. It
                isn&apos;t an average of the four periods.
              </InfoTip>
            </span>
          </div>
        </div>
      </section>

      <h2 className={`${shared.sectionTitle} ${styles.titleWithTip}`}>
        Demand throughout the day
        <InfoTip label="demand levels" align="start">
          <span className={styles.tipList}>
            {BANDS.map((b) => (
              <span key={b.name}>
                <strong>{b.name}</strong> {b.min}–{b.max}: {b.meaning.toLowerCase()}
              </span>
            ))}
          </span>
        </InfoTip>
      </h2>

      {hoursMissing && (
        <p className={styles.hoursPrompt}>
          Add your operating hours to see which periods you&apos;re open.{" "}
          <Link href="/settings">Add hours</Link>
        </p>
      )}

      {data.dayparts.every((dp) => dp.score === null) && (
        <p className={styles.hoursPrompt} role="status">
          No forecast is available for this day yet.
        </p>
      )}

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

      <div className={styles.lower}>
        <section className={`${shared.card} ${styles.chartCard}`}>
          <h2 className={`${shared.cardTitle} ${styles.chartTitle}`}>Demand score by period</h2>
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

        <DriversCard drivers={data.drivers} subtitle="Factors influencing today's forecast." />
      </div>

      <HowItWorks />
    </>
  );
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
    <div className={`${shared.card} ${styles.dpCard} ${busiest ? styles.dpBusiest : ""}`}>
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
        {dp.liftPct === null ? (
          <span className={styles.unavailable}>Comparison not available</span>
        ) : (
          <span className={styles.lift}>
            {formatPct(dp.liftPct)} vs. normal
            <InfoTip label="vs. normal" align="end">
              Compared with this period&apos;s usual demand for your area, concept and day of the week, before
              events and weather. The change includes both.
            </InfoTip>
          </span>
        )}
      </div>

      <div className={styles.weather}>
        <div className={styles.weatherIcon}>
          <WeatherIcon condition={dp.weather?.condition ?? ""} />
        </div>
        <div>
          <div className={styles.weatherName}>{dp.weather?.condition ?? "No forecast"}</div>
          {dp.weather && <div className={styles.weatherTemp}>{dp.weather.tempF}°F</div>}
        </div>
      </div>

      <div className={styles.eventHead}>
        <IconCalendarCheck />
        What&apos;s driving demand
        <InfoTip label="event impact" align="end">
          Nearby events in this period. An event&apos;s estimated impact is the extra demand it may add, counted
          in the period it falls in (events with no start time count across the whole day).
        </InfoTip>
      </div>
      <p className={styles.eventNote}>{dp.eventNote}</p>
      {closed && <p className={styles.closedNote}>Your restaurant is closed during this period.</p>}
    </div>
  );
}

function IconPencil() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m14.5 7.5 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Longer explanations the tooltips point to. Wording stays general on
// purpose: the model's coefficients are not shown to operators.
function HowItWorks() {
  return (
    <details className={styles.howItWorks}>
      <summary>How this forecast works</summary>
      <div className={styles.howBody}>
        <h3>What it measures</h3>
        <p>
          ForeShift forecasts zone demand: how busy your area is likely to be for restaurants of your concept in
          each part of the day. It&apos;s an estimate for the area. It doesn&apos;t know your own sales, bookings
          or staffing.
        </p>

        <h3>How a score is built</h3>
        <p>
          Each period starts from a baseline for your zone, concept and day of the week. Nearby events can add
          demand on top of that, and the weather can raise or lower it. Scores run from 0 to {MAX_SCORE}.
        </p>

        <h3>Today&apos;s demand score</h3>
        <p>The score of the day&apos;s busiest period.</p>

        <h3>&ldquo;vs. normal&rdquo;</h3>
        <p>
          The change from that period&apos;s baseline, with events and weather included. +50% means about one and
          a half times the usual demand for that period.
        </p>

        <h3>Demand levels</h3>
        <table className={styles.bandTable}>
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col">Score</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {BANDS.map((b) => (
              <tr key={b.name}>
                <td>
                  <BandPill band={b.name} />
                </td>
                <td>
                  {b.min}–{b.max}
                </td>
                <td>{b.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Events and weather</h3>
        <p>
          Event impact and weather effects are estimates. An event counts toward the period it falls in.
          &ldquo;No effect&rdquo; means no material change is expected.
        </p>
      </div>
    </details>
  );
}
