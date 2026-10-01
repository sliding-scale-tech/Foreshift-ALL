"use client";

import Link from "next/link";
import { EventIcon } from "@/app/components/EventIcon";
import { InfoTip } from "@/app/components/InfoTip";
import { Select } from "@/app/components/Select";
import {
  influenceOf,
  isCrossBorder,
  type EventGroup,
  type Influence,
  type SortKey,
} from "@/app/lib/events";
import type { WeekEvent } from "@/app/hooks/useWeek";
import { formatClock, trimNumber } from "@/app/lib/week";
import styles from "./EventsList.module.css";

export type EventRowData = EventGroup<WeekEvent>;

export type EmptyKind = "earlier" | "none" | "filtered" | null;

const SORTS = [
  { value: "time", label: "Start time" },
  { value: "distance", label: "Distance" },
  { value: "influence", label: "Estimated influence" },
];

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );

function InfluencePill({ influence }: { influence: Influence }) {
  return <span className={`${styles.pill} ${styles[`pill${influence}`]}`}>{influence}</span>;
}

function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function EventRow({ e, isKey }: { e: EventRowData; isKey: boolean }) {
  const influence = influenceOf(e.proximity);
  const when = e.time ? formatClock(e.time) : "No start time listed";
  const distance = e.distanceMiles === null ? "—" : `${trimNumber(e.distanceMiles, 1)} mi`;
  const relatedNames = e.related.map((r) => r.name).join("; ");

  return (
    <li className={styles.row}>
      <div className={styles.cellEvent}>
        <span className={styles.icon}>
          <EventIcon eventClass={e.eventClass} size={28} />
        </span>
        <div className={styles.eventText}>
          <Link
            href={`/events-overview/${encodeURIComponent(e.eventId)}?date=${e.date}`}
            className={styles.name}
          >
            {e.name}
          </Link>
          <div className={styles.meta}>
            {e.eventClass} · {e.venue || "Venue not listed"}
          </div>
          {(isKey || isCrossBorder(e.venue) || e.related.length > 0) && (
            <div className={styles.tags}>
              {isKey && <span className={styles.keyTag}>Key event</span>}
              {isCrossBorder(e.venue) && (
                <span className={styles.tagWithTip}>
                  <span className={styles.borderTag}>Across the border</span>
                  <InfoTip label="cross-border venues" align="start">
                    This venue is in Windsor, Canada. Crossing the border can make it a very different trip from a
                    Detroit venue the same distance away, so it may matter less to your area.
                  </InfoTip>
                </span>
              )}
              {e.related.length > 0 && (
                <span className={styles.related} title={relatedNames}>
                  + {e.related.length} related {e.related.length === 1 ? "listing" : "listings"} (e.g. {e.related[0].name})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.cellWhen}>
        <span className={styles.srOnly}>Date and time: </span>
        <span className={styles.whenDate}>{dateLabel(e.date)}</span>
        <span className={e.time ? styles.whenTime : styles.whenNone}>{when}</span>
      </div>

      <div className={styles.cellDistance}>
        <span className={styles.srOnly}>Distance: </span>
        {distance}
      </div>

      <div className={styles.cellInfluence}>
        <span className={styles.srOnly}>Estimated influence: </span>
        <InfluencePill influence={influence} />
      </div>

      <Chevron />
    </li>
  );
}

// The event table: four columns (event and venue, date and time, distance,
// estimated influence), sortable, with Previous / Next paging and a result
// count. Phones get stacked cards.
export function EventsList({
  rows,
  total,
  page,
  pageSize,
  onPage,
  sort,
  onSort,
  keyIds,
  empty,
  onClear,
}: {
  rows: EventRowData[]; // the current page
  total: number; // all results after filters
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  keyIds: Set<string>;
  empty: EmptyKind;
  onClear: () => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <section className={styles.card} aria-labelledby="events-list-title">
      <div className={styles.head}>
        <div>
          <h2 id="events-list-title" className={styles.title}>
            Nearby events
          </h2>
          <p className={styles.zone}>All times are Detroit local time (ET).</p>
        </div>
        <div className={styles.sort}>
          <label className={styles.sortLabel} htmlFor="events-sort">
            Sort by
          </label>
          <div className={styles.sortSelect}>
            <Select id="events-sort" variant="filter" value={sort} onChange={(v) => onSort(v as SortKey)} options={SORTS} />
          </div>
        </div>
      </div>

      {empty === null && (
        <>
          <div className={styles.columns} aria-hidden="true">
            <span>Event and venue</span>
            <span>Date and time</span>
            <span className={styles.colWithTip}>
              Distance
              <InfoTip label="distance" align="center">
                Straight-line distance from the venue to the centre of your area. It isn&apos;t travel time or the
                distance from your door.
              </InfoTip>
            </span>
            <span className={styles.colWithTip}>
              Estimated influence
              <InfoTip label="estimated influence" align="end">
                How strongly an event could affect your area, based only on how close it is: High up to 0.6 miles,
                Moderate up to 1.5 miles. It doesn&apos;t include the event&apos;s size. Open an event to see its
                estimated effect on demand.
              </InfoTip>
            </span>
            <span />
          </div>
          <ul className={styles.list}>
            {rows.map((e) => (
              <EventRow key={`${e.eventId}-${e.date}`} e={e} isKey={keyIds.has(e.eventId)} />
            ))}
          </ul>

          <nav className={styles.pager} aria-label="Pages of events">
            <p className={styles.count} aria-live="polite">
              Showing {from}–{to} of {total} {total === 1 ? "event" : "events"}
            </p>
            <div className={styles.pagerBtns}>
              <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
                Previous
              </button>
              <span className={styles.pageNo}>
                Page {page} of {pages}
              </span>
              <button type="button" className={styles.pageBtn} disabled={page >= pages} onClick={() => onPage(page + 1)}>
                Next
              </button>
            </div>
          </nav>
        </>
      )}

      {empty === "earlier" && (
        <div className={styles.empty} role="status">
          <strong>Event data isn&apos;t available for earlier days.</strong>
          <span>Events are only kept from today onward. Choose today or a later day.</span>
        </div>
      )}
      {empty === "none" && (
        <div className={styles.empty} role="status">
          <strong>No nearby events are listed for this day.</strong>
          <span>That doesn&apos;t mean data is missing. Nothing near your area is scheduled.</span>
        </div>
      )}
      {empty === "filtered" && (
        <div className={styles.empty} role="status">
          <strong>No events match your filters.</strong>
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
