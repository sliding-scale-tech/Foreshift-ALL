"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventOutlookResult } from "my-app/convex/lib/outlook";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { operatorLabel } from "@/app/lib/displayName";
import { useOutlook } from "@/app/hooks/useOutlook";
import { useWeek, type WeekData, type WeekEvent } from "@/app/hooks/useWeek";
import { EVENT_CLASS_ORDER, EventIcon } from "@/app/components/EventIcon";
import { DatePicker } from "@/app/components/DatePicker";
import { PageLoading } from "@/app/components/PageLoading";
import { IconSparkle } from "@/app/components/dashboard-icons";
import { FULL_DAY, shortDate, trimNumber, weekLabel } from "@/app/lib/week";
import shared from "../../shared.module.css";
import styles from "./events.module.css";

const PAGE_SIZE = 10;

// Radius filter: 0.1 … 1.5 miles in 0.1 steps (the Bubble dropdown's values).
const RADIUS_OPTIONS = Array.from({ length: 15 }, (_, i) => (i + 1) / 10);

// Venue Types filter: Bubble's fixed venue list, in its order.
const VENUES = [
  "Comerica Park",
  "Saint Andrew's Hall",
  "The Colosseum at Caesars Windsor",
  "Little Caesars Arena",
  "The Fillmore Detroit",
  "El Club",
  "Music Hall Center",
  "Sound Board at MotorCity Casino Hotel",
  "Russell Industrial Center",
  "Magic Stick",
  "Majestic Theatre-MI",
  "Masonic Temple - Detroit",
  "Detroit Opera House",
  "Ford Field",
  "Huntington Place",
];

// Events Overview — the week's events near the operator: a per-day calendar,
// filters, a paged table, and today's headline event. The AI brief comes from
// the cached "events" outlook; everything else is the live week query.
export default function EventsOverviewPage() {
  const { operator } = useMyOperator();
  const week = useWeek();
  const outlook = useOutlook<EventOutlookResult>("events");

  const [date, setDate] = useState("");
  const [radius, setRadius] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("");

  const filtered = useMemo(() => {
    if (!week) return [];
    return week.events.filter(
      (e) =>
        (!date || e.date === date) &&
        (!radius || (e.distanceMiles ?? Infinity) <= Number(radius)) &&
        (!type || e.venue === type),
    );
  }, [week, date, radius, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const reset = () => setFilter(() => {
    setDate("");
    setRadius("");
    setType("");
  });

  const topEvent =
    outlook.status === "ready"
      ? [...outlook.result.events].sort((a, b) => b.lift_score - a.lift_score)[0]
      : undefined;

  // The outlook's event carries no id, so find the same event in the week list.
  const topId =
    topEvent && outlook.status === "ready"
      ? week?.events.find(
          (e) => e.name === topEvent.name && e.venue === topEvent.venue && e.date === outlook.date,
        )?.eventId
      : undefined;

  // Nothing renders until the week AND the events outlook are both ready.
  if (outlook.status === "error") {
    return (
      <p className={`${shared.status} ${shared.statusError}`} role="alert">
        {outlook.message}
      </p>
    );
  }
  if (!week || outlook.status !== "ready") return <PageLoading label="Preparing your events…" />;

  return (
    <>
      <h1 className={shared.title}>Events Overview</h1>
      <p className={shared.subtitle}>
        {weekLabel(week.weekStart)} - {operatorLabel(operator)} - {operator?.conceptType}
      </p>

      <section className={shared.banner}>
        <div className={shared.bannerTitle}>
          <IconSparkle />
          Event Demand Impact
        </div>
        <p className={shared.bannerText}>{outlook.result.narration}</p>
      </section>

      <h2 className={shared.sectionTitle}>Events Calendar</h2>
      <Calendar
        week={week}
        selected={date}
        onSelect={(d) => setFilter(() => setDate(d === date ? "" : d))}
      />

      <div className={styles.filters}>
        <div className={styles.field}>
          <span className={styles.label}>Date</span>
          <DatePicker
            value={date}
            today={week.today}
            onChange={(d) => setFilter(() => setDate(d))}
          />
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Radius</span>
          <select
            className={styles.control}
            value={radius}
            onChange={(e) => setFilter(() => setRadius(e.target.value))}
          >
            <option value="">Choose an option...</option>
            {RADIUS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Venue Types</span>
          <select
            className={styles.control}
            value={type}
            onChange={(e) => setFilter(() => setType(e.target.value))}
          >
            <option value="">Choose an option...</option>
            {VENUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.reset} onClick={reset}>
          <ResetIcon />
          Reset Filters
        </button>
      </div>

      <div className={styles.lower}>
        <section className={`${shared.card} ${styles.tableCard}`}>
          <h2 className={`${shared.cardTitle} ${styles.tableTitle}`}>Nearby Events</h2>
          <div className={styles.head}>
            <span>Events</span>
            <span>Venue</span>
            <span>Date</span>
            <span>Time</span>
            <span>Distance</span>
            <span>Est. Impact</span>
            <span />
          </div>
          {rows.map((e) => (
            <EventRow key={`${e.eventId}-${e.date}`} event={e} />
          ))}
          {rows.length === 0 && <p className={styles.empty}>No events match these filters.</p>}

          <div className={styles.pager}>
            <div className={styles.pages}>
              <PageBtn label="First page" disabled={current === 1} onClick={() => setPage(1)}>
                <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
              </PageBtn>
              <PageBtn label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
                <path d="m15 18-6-6 6-6" />
              </PageBtn>
              <span>
                {current} of {pageCount}
              </span>
              <PageBtn label="Next page" disabled={current === pageCount} onClick={() => setPage(current + 1)}>
                <path d="m9 18 6-6-6-6" />
              </PageBtn>
              <PageBtn label="Last page" disabled={current === pageCount} onClick={() => setPage(pageCount)}>
                <path d="m6 17 5-5-5-5M13 17l5-5-5-5" />
              </PageBtn>
            </div>
            <form
              className={styles.goBox}
              onSubmit={(e) => {
                e.preventDefault();
                const n = Math.floor(Number(pageInput));
                if (n >= 1 && n <= pageCount) setPage(n);
                setPageInput("");
              }}
            >
              <input
                className={styles.pageInput}
                inputMode="numeric"
                placeholder="Page"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                aria-label="Go to page"
              />
              <button type="submit" className={styles.goBtn}>
                Go
              </button>
            </form>
          </div>
        </section>

        <div className={styles.side}>
          <section className={`${shared.card} ${styles.sideCard}`}>
            <h2 className={styles.sideTitle}>Top Event Today</h2>
            {topEvent ? (
              <Link
                href={
                  topId
                    ? `/events-overview/${encodeURIComponent(topId)}?date=${outlook.date}&top=1`
                    : "/events-overview"
                }
                className={styles.topEvent}
              >
                <EventIcon eventClass={topEvent.class} size={24} />
                <div className={styles.topEventText}>
                  <div className={styles.eventName}>{topEvent.name}</div>
                  <div className={styles.topEventVenue}>
                    {[topEvent.venue, topEvent.time].filter(Boolean).join(" - ")}
                  </div>
                </div>
                <Chevron />
              </Link>
            ) : (
              <p className={styles.topEventVenue} style={{ marginTop: 12 }}>
                No events today.
              </p>
            )}
          </section>

          <ShapeCard />
        </div>
      </div>
    </>
  );
}

function Calendar({
  week,
  selected,
  onSelect,
}: {
  week: WeekData;
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className={styles.calendar}>
      {week.days.map((day) => {
        const events = week.events.filter((e) => e.date === day.date);
        const classes = EVENT_CLASS_ORDER.filter((c) => events.some((e) => e.eventClass === c));
        // The badge is the closeness (Est. Impact) of the day's first event.
        const first = events[0];
        return (
          <button
            key={day.date}
            type="button"
            className={`${shared.card} ${styles.dayCard} ${selected === day.date ? styles.selected : ""}`}
            onClick={() => onSelect(day.date)}
          >
            <div className={styles.dayName}>{FULL_DAY[day.day]}</div>
            <div className={styles.dayDate}>{shortDate(day.date)}</div>
            <div className={styles.icons}>
              {classes.map((c) => (
                <EventIcon key={c} eventClass={c} size={30} />
              ))}
            </div>
            <div className={styles.count}>
              {events.length === 0 ? "No events" : `${events.length} ${events.length === 1 ? "event" : "events"}`}
            </div>
            {first ? (
              <span className={styles.badge}>{trimNumber(first.proximity)}</span>
            ) : (
              <div className={styles.badgeSpacer} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function EventRow({ event: e }: { event: WeekEvent }) {
  const distance = e.distanceMiles === null ? "—" : `${trimNumber(e.distanceMiles, 1)} mi`;
  return (
    <Link href={`/events-overview/${encodeURIComponent(e.eventId)}?date=${e.date}`} className={styles.row}>
      {/* Desktop: one grid row across the 7 table columns. */}
      <div className={styles.tableRow}>
        <div className={styles.eventCell}>
          <div className={styles.eventIcon}>
            <EventIcon eventClass={e.eventClass} size={30} />
          </div>
          <div>
            <div className={styles.eventName}>{e.name}</div>
            <div className={styles.eventClass}>{e.eventClass}</div>
          </div>
        </div>
        <span>{e.venue || "—"}</span>
        <span>{shortDate(e.date)}</span>
        <span>{e.time ?? "—"}</span>
        <span>{e.distanceMiles === null ? "—" : trimNumber(e.distanceMiles, 1)}</span>
        <span>{trimNumber(e.proximity)}</span>
        <Chevron />
      </div>

      {/* Mobile: a compact card — the 7-column table has no room on a phone. */}
      <div className={styles.mobileRow}>
        <div className={styles.eventIcon}>
          <EventIcon eventClass={e.eventClass} size={28} />
        </div>
        <div className={styles.mobileBody}>
          <div className={styles.eventName}>{e.name}</div>
          <div className={styles.eventClass}>
            {e.eventClass}
            {e.venue && ` · ${e.venue}`}
          </div>
          <div className={styles.mobileMeta}>
            <span>{shortDate(e.date)}</span>
            {e.time && <span>{e.time}</span>}
            <span>{distance}</span>
            <span>Impact {trimNumber(e.proximity)}</span>
          </div>
        </div>
        <Chevron />
      </div>
    </Link>
  );
}

function ShapeCard() {
  return (
    <section className={`${shared.card} ${styles.sideCard}`}>
      <h2 className={styles.sideTitle}>How Events Shape Demand</h2>
      <div className={styles.shape}>
        <div className={styles.shapeRow}>
          <span className={`${styles.shapeIcon} ${styles.shapePurple}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="8" r="3.2" />
              <circle cx="5.5" cy="10" r="2.4" />
              <circle cx="18.5" cy="10" r="2.4" />
              <path d="M12 12.5c-3 0-5.5 1.7-5.5 4V19h11v-2.5c0-2.3-2.5-4-5.5-4ZM5.5 13c-2.2 0-4 1.3-4 3v2h3.8v-1.8c0-1.2.5-2.2 1.3-3A5 5 0 0 0 5.5 13Zm13 0a5 5 0 0 0-1.1.2c.8.8 1.3 1.8 1.3 3V18h3.8v-2c0-1.7-1.8-3-4-3Z" />
            </svg>
          </span>
          Concerts and nightlife increase evening and post-event orders.
        </div>
        <div className={styles.shapeRow}>
          <span className={`${styles.shapeIcon} ${styles.shapeOrange}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 4h6a1.5 1.5 0 0 1 1.5 1.5V7H20a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 4 7h3.5V5.5A1.5 1.5 0 0 1 9 4Zm.5 3h5v-.5h-5V7Z" />
            </svg>
          </span>
          Conferences and expos create steady lunch traffic.
        </div>
        <div className={styles.shapeRow}>
          <span className={`${styles.shapeIcon} ${styles.shapeBlue}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 17.5a3 3 0 1 1-2-2.8V6.2l11-2.2v10.5a3 3 0 1 1-2-2.8V7.4L9 8.8v8.7Z" />
            </svg>
          </span>
          Concerts and nightlife increase evening and post-event orders.
        </div>
      </div>
      <p className={styles.shapeFoot}>Use this insight to plan staffing, prep, and promotions ahead of time.</p>
    </section>
  );
}

function Chevron() {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PageBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={styles.pageBtn} aria-label={label} disabled={disabled} onClick={onClick}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

function ResetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
