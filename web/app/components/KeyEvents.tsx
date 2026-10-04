"use client";

import Link from "next/link";
import { EventBadge } from "@/app/components/EventBadge";
import { InfluencePill } from "@/app/components/InfluencePill";
import { InfoTip } from "@/app/components/InfoTip";
import { influenceOf, type EventGroup } from "@/app/lib/events";
import type { WeekEvent } from "@/app/hooks/useWeek";
import { formatClock, trimNumber } from "@/app/lib/week";
import styles from "./KeyEvents.module.css";

// The few most relevant events for the chosen day, beside the list. They are the
// same events the list tags "Key event" (one ranking), so the two can't disagree,
// and the filters don't change them.
export function KeyEvents({
  title,
  events,
  note,
}: {
  title: string;
  events: EventGroup<WeekEvent>[];
  /** Shown instead of the list when there is nothing to highlight. */
  note: string;
}) {
  return (
    <section className={styles.card} aria-labelledby="key-events-title">
      <h2 id="key-events-title" className={styles.title}>
        {title}
        <InfoTip label="key events" align="end">
          The most relevant events for the day you chose, ranked by estimated influence: the kind of event and how
          close it is. The list tags the same events &ldquo;Key event&rdquo;. The filters don&apos;t change them.
        </InfoTip>
      </h2>

      {events.length === 0 ? (
        <p className={styles.note}>{note}</p>
      ) : (
        <ul className={styles.list}>
          {events.map((e) => (
            <li key={`${e.eventId}-${e.date}`} className={styles.row}>
              <EventBadge eventClass={e.eventClass} size={40} />
              <div className={styles.text}>
                <Link href={`/events-overview/${encodeURIComponent(e.eventId)}?date=${e.date}`} className={styles.name}>
                  {e.name}
                </Link>
                <div className={styles.meta}>{e.venue || "Venue not listed"}</div>
                <div className={styles.when}>{e.time ? formatClock(e.time) : "No start time listed"}</div>
              </div>
              <div className={styles.right}>
                <InfluencePill influence={influenceOf(e)} />
                <span className={styles.dist}>{e.distanceMiles === null ? "—" : `${trimNumber(e.distanceMiles, 1)} mi`}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
