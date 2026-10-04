"use client";

import Link from "next/link";
import type { useQuery } from "convex/react";
import type { api } from "my-app/convex/_generated/api";
import { BandPill } from "@/app/components/BandPill";
import { DaypartIcon } from "@/app/components/DaypartIcon";
import { EventIcon } from "@/app/components/EventIcon";
import { InfoTip } from "@/app/components/InfoTip";
import type { SourceState } from "@/app/hooks/useEventSource";
import { DAYPARTS } from "@/app/lib/dayparts";
import { influenceOf, isCrossBorder } from "@/app/lib/events";
import { formatClock, trimNumber } from "@/app/lib/week";
import { eventPeriod } from "@/app/lib/weekPlan";
import shared from "@/app/(app)/shared.module.css";
import styles from "@/app/(app)/(intelligence)/events-overview/[eventId]/event.module.css";

const SUPPORT_EMAIL = "support@foreshift.ai";

// "Thu, Oct 1" split over two short lines for the small date chip.
const chipDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T12:00:00Z`))
    .replace(", ", ",\n");

export type EventImpact = NonNullable<ReturnType<typeof useQuery<typeof api.outlookApp.getEventImpact>>>;

const checkedAt = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Detroit",
    timeZoneName: "short",
  }).format(new Date(ms));

export function EventBody({ impact, zone, source }: { impact: EventImpact; zone?: string; source?: SourceState }) {
  const e = impact.event;
  const period = eventPeriod(e.time);
  const influence = influenceOf(e);
  const when = e.time ? formatClock(e.time) : null;
  const distance = e.distanceMiles === null ? null : `${trimNumber(e.distanceMiles, 1)} mi`;
  // Details from the source (address, link, status); null until it answers or when it can't.
  const info = source?.status === "ready" && source.info.available ? source.info : null;
  const address = info?.address ?? null;
  const warn = info && ["cancelled", "postponed", "rescheduled"].includes(info.status) ? info.status : null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address ? `${e.venue}, ${address}` : `${e.venue} Detroit`,
  )}`;
  const reportUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Incorrect event: ${e.name}`)}&body=${encodeURIComponent(
    `Event: ${e.name}\nVenue: ${e.venue}\nDate: ${e.date}\n\nWhat's wrong:\n`,
  )}`;

  // One plain-language reason, hedged: the effect is an estimate.
  const reason = [
    `${e.name} is ${distance ? `${distance} from` : "near"} the centre of your area${zone ? `, ${zone}` : ""},`,
    when
      ? `and starts at ${when}${period && period !== "All day" ? `, in the ${period.toLowerCase()} period` : ""}.`
      : "and has no start time listed, so it counts toward every period.",
    "It may increase demand for your restaurant then.",
  ].join(" ");

  return (
    <div className={styles.layout}>
      <section className={`${shared.card} ${styles.eventCard}`}>
        <h2 className={styles.cardTitle}>Event details</h2>

        {warn && (
          <p className={styles.statusBanner} role="alert">
            <strong>The source lists this event as {warn}.</strong> It may not happen as shown, so treat its effect on
            demand as uncertain.
          </p>
        )}

        <div className={styles.eventHead}>
          <div className={styles.dateChip}>{chipDate(e.date)}</div>
          <EventIcon eventClass={e.eventClass} size={36} />
          <div>
            <div className={styles.name}>{e.name}</div>
            <div className={styles.venue}>{e.venue}</div>
            {address && <div className={styles.address}>{address}</div>}
          </div>
        </div>

        <div className={styles.impactRow}>
          <div>
            <div className={styles.impactCaption}>
              Estimated effect on demand
              <InfoTip label="estimated effect" align="start">
                What this event alone may add to your busiest period, compared with normal. It&apos;s an estimate and
                doesn&apos;t include weather or other events.
              </InfoTip>
            </div>
            <div className={styles.impactBandRow}>
              <BandPill band={impact.impactBand} />
              <span className={impact.headlinePercent > 0 ? styles.impactPct : styles.impactNone}>
                {impact.headlinePercent > 0 ? `+${Math.round(impact.headlinePercent)}%` : "No effect"}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.facts}>
          <div className={styles.fact}>
            <span className={styles.factLabel}>
              <ClockIcon />
              Local start time
            </span>
            <span className={styles.factValue}>
              {when ? `${when} (Detroit time)` : "No start time listed"}
            </span>
          </div>
          {info?.endTime && (
            <div className={styles.fact}>
              <span className={styles.factLabel}>
                <ClockIcon />
                Local end time
              </span>
              <span className={styles.factValue}>{formatClock(info.endTime)} (Detroit time)</span>
            </div>
          )}
          <div className={styles.fact}>
            <span className={styles.factLabel}>
              <PeriodIcon />
              Service period
            </span>
            <span className={styles.factValue}>{period ?? "Outside service hours"}</span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factLabel}>
              <TagIcon />
              Event type
            </span>
            <span className={styles.factValue}>{e.eventClass}</span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factLabel}>
              <PinIcon />
              Distance
              <InfoTip label="distance" align="start">
                Straight-line distance from the venue to the centre of your area. It isn&apos;t travel time or the
                distance from your door.
              </InfoTip>
            </span>
            <span className={styles.factValue}>{distance ?? "Not available"}</span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factLabel}>
              <SignalIcon />
              Estimated influence
              <InfoTip label="estimated influence" align="start">
                How strongly this event could affect your area, based on the kind of event and how close it is. An
                estimate, not your demand forecast. The effect on your own demand is shown above.
              </InfoTip>
            </span>
            <span className={styles.factValue}>{influence}</span>
          </div>
        </div>

        <h3 className={styles.whyTitle}>Why it matters to you</h3>
        <p className={styles.why}>{reason}</p>
        {isCrossBorder(e.venue) && (
          <p className={styles.note}>
            This venue is in Windsor, Canada. Crossing the border can make it a very different trip from a Detroit
            venue the same distance away, so it may matter less to your area.
          </p>
        )}

        <div className={styles.actions}>
          <Link href={`/dashboard?date=${e.date}`} className={styles.primaryAction}>
            View demand outlook for this date
          </Link>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
            Open venue in Google Maps
          </a>
          {info?.url && (
            <a href={info.url} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
              View original listing
            </a>
          )}
          <a href={reportUrl} className={styles.linkAction}>
            Report incorrect event
          </a>
        </div>
        <p className={styles.sourceNote} role="status">
          {source?.status === "loading" && "Checking the source for the address, link and status…"}
          {source?.status === "error" && "Source details (address, link, status) couldn't be loaded right now."}
          {source?.status === "ready" && !source.info.available && "Source details (address, link, status) aren't available for this event."}
          {info &&
            `Source: ${info.source}. Checked ${checkedAt(info.checkedAt)}.${
              info.status === "unknown" ? " Cancellation status isn't checked for this source." : ""
            }`}
        </p>
      </section>

      <div>
        <h2 className={styles.impactTitle}>
          Impact by service period
          <InfoTip label="impact by service period" align="start">
            This event&apos;s estimated effect in each period, as a change from that period&apos;s normal demand. The
            score is the day&apos;s forecast for the period, including weather and other events.
          </InfoTip>
        </h2>
        <div className={styles.grid}>
          {DAYPARTS.map((dp) => {
            const d = impact.dayparts.find((x) => x.daypart === dp.key);
            return (
              <div key={dp.key} className={`${shared.card} ${styles.dpCard}`}>
                <div className={styles.dpHead}>
                  <DaypartIcon daypart={dp.key} />
                  <div className={styles.dpText}>
                    <div className={styles.dpTitle}>{dp.label}</div>
                    <div className={styles.dpWindow}>{dp.window}</div>
                  </div>
                  {d?.band && <BandPill band={d.band} />}
                </div>
                <div className={styles.dpBottom}>
                  {d && d.percent > 0 ? (
                    <span className={styles.dpPct}>
                      <TrendUp />+{Math.round(d.percent)}%
                    </span>
                  ) : (
                    <span className={styles.dpNone}>No effect</span>
                  )}
                  <span className={styles.dpScore}>{d?.score == null ? "—" : d.score.toFixed(1)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ClockIcon() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function PeriodIcon() {
  return (
    <svg {...stroke}>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg {...stroke}>
      <path d="M3 12V4h8l10 10-8 8L3 12Z" />
      <circle cx="7.5" cy="8.5" r="1.2" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
function SignalIcon() {
  return (
    <svg {...stroke}>
      <path d="M5 19v-4M10 19v-8M15 19V8M20 19V4" />
    </svg>
  );
}
function TrendUp() {
  return (
    <svg {...stroke} strokeWidth={2.4}>
      <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />
    </svg>
  );
}
