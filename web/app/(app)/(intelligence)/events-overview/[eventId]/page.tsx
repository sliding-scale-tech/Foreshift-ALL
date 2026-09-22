"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import { BandPill } from "@/app/components/BandPill";
import { DaypartIcon } from "@/app/components/DaypartIcon";
import { EventIcon } from "@/app/components/EventIcon";
import { PageLoading } from "@/app/components/PageLoading";
import { useStickyValue } from "@/app/hooks/useStickyValue";
import { DAYPARTS } from "@/app/lib/dayparts";
import { shortDate, trimNumber } from "@/app/lib/week";
import shared from "../../../shared.module.css";
import styles from "./event.module.css";

// Event Outlook — one event's isolated effect on the operator's demand, per
// daypart (base score + THIS event's lift only). Opened from the Events
// Overview table rows and the Top Event Today card.
export default function EventOutlookPage() {
  return (
    <Suspense fallback={null}>
      <EventOutlook />
    </Suspense>
  );
}

function EventOutlook() {
  const { eventId } = useParams<{ eventId: string }>();
  const search = useSearchParams();
  const date = search.get("date") ?? undefined;
  const isTop = search.get("top") === "1";

  const liveImpact = useQuery(api.outlookApp.getEventImpact, {
    eventId: decodeURIComponent(eventId),
    date,
  });
  const impact = useStickyValue(`event:${eventId}:${date ?? ""}`, liveImpact);

  return (
    <>
      <Link href="/events-overview" className={styles.back}>
        <ArrowLeft />
        Back to events overview
      </Link>
      <h1 className={`${shared.title} ${styles.title}`}>Event Outlook</h1>

      {impact === undefined && <PageLoading label="Loading the event…" />}
      {impact === null && (
        <p className={`${shared.status} ${shared.statusError}`} role="alert">
          This event is no longer in your forecast window.
        </p>
      )}

      {impact && (
        <div className={styles.layout}>
          <section className={`${shared.card} ${styles.eventCard}`}>
            <h2 className={styles.cardTitle}>{isTop ? "Top Event Today" : "Event Details"}</h2>

            <div className={styles.eventHead}>
              <div className={styles.dateChip}>{shortDate(impact.event.date).replace(", ", ",\n")}</div>
              <EventIcon eventClass={impact.event.eventClass} size={36} />
              <div>
                <div className={styles.name}>{impact.event.name}</div>
                <div className={styles.venue}>{impact.event.venue}</div>
              </div>
            </div>

            <div className={styles.impactRow}>
              <BandPill band={impact.impactBand} />
              <span className={styles.impactPct}>{trimNumber(impact.headlinePercent, 1)}%</span>
            </div>

            <div className={styles.facts}>
              <div className={styles.fact}>
                <span className={styles.factLabel}>
                  <ClockIcon />
                  Event Time
                </span>
                <span className={styles.factValue}>{impact.event.time ?? "All day"}</span>
              </div>
              <div className={styles.fact}>
                <span className={styles.factLabel}>
                  <TagIcon />
                  Event Type
                </span>
                <span className={styles.factValue}>{impact.event.eventClass}</span>
              </div>
            </div>
          </section>

          <div>
            <h2 className={styles.impactTitle}>Impact by Daypart</h2>
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
                      <span className={styles.dpPct}>
                        {d && d.percent > 0 && <TrendUp />}
                        +{(d?.percent ?? 0).toFixed(1)}%
                      </span>
                      <span className={styles.dpScore}>{d?.score == null ? "—" : d.score.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
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

function ArrowLeft() {
  return (
    <svg {...stroke}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
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
function TrendUp() {
  return (
    <svg {...stroke} strokeWidth={2.4}>
      <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />
    </svg>
  );
}
