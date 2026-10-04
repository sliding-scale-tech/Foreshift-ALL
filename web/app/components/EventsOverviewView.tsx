"use client";

import { useMemo, useState } from "react";
import type { useMyOperator } from "@/app/hooks/useMyOperator";
import type { WeekData } from "@/app/hooks/useWeek";
import { useNow } from "@/app/hooks/useNow";
import { EventDaySelector, REST_OF_WEEK } from "@/app/components/EventDaySelector";
import { EventsList, type EmptyKind } from "@/app/components/EventsList";
import { BriefcaseIcon, BuildingIcon, GlobeIcon, MusicIcon, PeopleIcon, RefreshIcon, TagIcon } from "@/app/components/event-icons";
import { InfoTip } from "@/app/components/InfoTip";
import { KeyEvents } from "@/app/components/KeyEvents";
import { LastUpdated } from "@/app/components/LastUpdated";
import { Select } from "@/app/components/Select";
import { StaleNotice } from "@/app/components/StaleNotice";
import { IconSparkle } from "@/app/components/dashboard-icons";
import { pageSubtitle } from "@/app/lib/displayName";
import {
  EVENT_TYPES,
  NO_FILTERS,
  activeFilterCount,
  buildSummary,
  filterEvents,
  groupListings,
  keyEventIds,
  rankEvents,
  sortEvents,
  topInfluence,
  weekdayName,
  type Filters,
  type Influence,
  type SortKey,
} from "@/app/lib/events";
import { longDate, monthDay, weekLabel } from "@/app/lib/week";
import shared from "@/app/(app)/shared.module.css";
import styles from "@/app/(app)/(intelligence)/events-overview/events.module.css";

const PAGE_SIZE = 10;

const ANY = (label: string) => ({ value: "", label });
const TYPE_CHOICES = [ANY("All event types"), ...EVENT_TYPES.map((t) => ({ value: t, label: t }))];
// Everything in the data is within 1.5 miles of a zone, so these are the useful cut-offs.
const DISTANCE_CHOICES = [
  ANY("Any distance"),
  { value: "0.25", label: "Within 0.25 mile" },
  { value: "0.5", label: "Within 0.5 mile" },
  { value: "1", label: "Within 1 mile" },
  { value: "1.5", label: "Within 1.5 miles" },
];

// General patterns only — possibilities, not predictions.
const SHAPES = [
  { icon: <MusicIcon />, text: "Concerts and nightlife may increase evening and after-show demand." },
  { icon: <BriefcaseIcon />, text: "Conferences and expos may bring steady lunch traffic." },
  { icon: <PeopleIcon />, text: "Large sports games can bring crowds in the hours before and after." },
];

// Events Overview — "which nearby events could affect my restaurant, when, and
// why?" One selected day (or the rest of the week) drives the summary, the
// date selector's count and the list, all from the same week query, so they
// can't disagree.
export function EventsOverviewView({
  week,
  operator,
}: {
  week: WeekData;
  operator: ReturnType<typeof useMyOperator>["operator"];
}) {
  const [picked, setPicked] = useState<string | null>(null); // a date, REST_OF_WEEK, or null = today
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SortKey>("time");
  const [page, setPage] = useState(1);
  const [explainerOpen, setExplainerOpen] = useState(false);
  // Event data is refreshed once a day. If the last successful refresh is over 36 hours old (or there
  // never was one) "no events" can't be trusted, so say so instead of showing an empty list as fact.
  // Read the clock after mount so the server and browser render the same thing.
  const now = useNow();
  const dataGap =
    week.syncedAt === null ? "unavailable" : now !== null && now - week.syncedAt > 36 * 60 * 60 * 1000 ? "stale" : null;

  const scope = picked ?? week.today;
  const range = scope === REST_OF_WEEK;

  // Events for the chosen scope, with ticket packages folded into their show.
  const scoped = useMemo(() => {
    const inScope = week.events.filter((e) => (range ? e.date >= week.today : e.date === scope));
    return groupListings(inScope);
  }, [week, scope, range]);

  // Per day: how many events, and the strongest estimated influence among them.
  const dayInfo = useMemo(() => {
    const info: Record<string, { count: number; top: Influence | null }> = {};
    for (const d of week.days) {
      const events = groupListings(week.events.filter((e) => e.date === d.date));
      info[d.date] = { count: events.length, top: topInfluence(events) };
    }
    return info;
  }, [week]);

  const venues = useMemo(
    () => [...new Set(week.events.map((e) => e.venue).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [week],
  );

  const results = useMemo(() => sortEvents(filterEvents(scoped, filters), sort), [scoped, filters, sort]);
  const keyIds = useMemo(() => keyEventIds(scoped), [scoped]);
  const topEvents = useMemo(() => rankEvents(scoped).slice(0, 3), [scoped]);

  const earlier = !range && scope < week.today;
  // In range mode `scope` isn't a date, so only a single day gets a weekday name.
  const label = range ? "the rest of this week" : scope === week.today ? "today" : weekdayName(scope);
  const summary = buildSummary({ events: scoped, label, range, earlier });
  const keyTitle = range
    ? "Key events for the rest of this week"
    : scope === week.today
      ? "Top events today"
      : `Key events for ${weekdayName(scope)}, ${monthDay(scope)}`;

  const filterCount = activeFilterCount(filters);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const empty: EmptyKind =
    results.length > 0 ? null : scoped.length === 0 ? "none" : "filtered";

  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const clear = () => {
    setFilters(NO_FILTERS);
    setPage(1);
  };

  const chips: { key: keyof Filters; text: string }[] = [
    filters.search.trim() ? { key: "search" as const, text: `Search: “${filters.search.trim()}”` } : null,
    filters.type ? { key: "type" as const, text: filters.type } : null,
    filters.venue ? { key: "venue" as const, text: filters.venue } : null,
    filters.maxMiles ? { key: "maxMiles" as const, text: `Within ${filters.maxMiles} mi` } : null,
  ].filter((c): c is { key: keyof Filters; text: string } => c !== null);

  return (
    <>
      <h1 className={shared.title}>Events overview</h1>
      <p className={shared.subtitle}>{pageSubtitle(operator, weekLabel(week.weekStart))}</p>
      <LastUpdated generatedAt={week.syncedAt} />
      {dataGap === "unavailable" && (
        <StaleNotice title="Event data isn't available right now.">
          {" "}An empty list below doesn&apos;t mean there are no events. Please check back later.
        </StaleNotice>
      )}
      {dataGap === "stale" && (
        <StaleNotice title="Event data may be out of date.">
          {" "}It was last updated more than a day and a half ago, so new events may not be listed yet.
        </StaleNotice>
      )}

      <section className={shared.banner} aria-live="polite">
        <div className={shared.bannerTitle}>
          <IconSparkle />
          Event impact at a glance
        </div>
        <p className={shared.bannerText}>{summary}</p>
      </section>

      <h2 className={`${shared.sectionTitle} ${styles.titleWithTip}`}>
        Choose a day
        <InfoTip label="the day selector" align="start">
          Pick a day, or the rest of this week. The summary and the event list below update together. The label under
          each count is the strongest estimated influence among that day&apos;s events. Event data covers this week,
          Monday to Sunday: earlier days show the events that were listed for them. Next week isn&apos;t covered yet.
        </InfoTip>
      </h2>
      <EventDaySelector
        value={scope}
        onChange={(v) => {
          setPicked(v);
          setPage(1);
        }}
        days={week.days.map((d) => ({
          date: d.date,
          day: d.day,
          count: dayInfo[d.date]?.count ?? 0,
          top: dayInfo[d.date]?.top ?? null,
          isToday: d.date === week.today,
          isPast: d.date < week.today,
        }))}
      />
      <p className={styles.showing}>
        Showing events for{" "}
        <strong>{range ? `the rest of this week (${monthDay(week.today)} – ${monthDay(week.weekEnd)})` : longDate(scope)}</strong>
        {earlier && " (an earlier day)"}
      </p>

      <div className={styles.filters} role="search" aria-label="Filter events">
        <div className={`${styles.field} ${styles.search}`}>
          <label className={styles.label} htmlFor="events-search">
            Search events or venues
          </label>
          <input
            id="events-search"
            type="search"
            className={styles.input}
            placeholder="e.g. Ford Field, Mastodon"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="events-type">
            Event type
          </label>
          <Select
            id="events-type"
            variant="filter"
            icon={<TagIcon />}
            value={filters.type}
            onChange={(v) => update({ type: v })}
            options={TYPE_CHOICES}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="events-venue">
            Venues
          </label>
          <Select
            id="events-venue"
            variant="filter"
            icon={<BuildingIcon />}
            value={filters.venue}
            onChange={(v) => update({ venue: v })}
            options={[ANY("All venues"), ...venues.map((v) => ({ value: v, label: v }))]}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="events-distance">
            Distance
          </label>
          <Select
            id="events-distance"
            variant="filter"
            icon={<GlobeIcon />}
            value={filters.maxMiles}
            onChange={(v) => update({ maxMiles: v })}
            options={DISTANCE_CHOICES}
          />
        </div>
        <div className={styles.resetWrap}>
          <button type="button" className={styles.reset} onClick={clear} disabled={filterCount === 0}>
            <RefreshIcon />
            Clear filters
          </button>
        </div>
      </div>

      {filterCount > 0 && (
        <div className={styles.active} aria-label="Active filters">
          {chips.map((c) => (
            <span key={c.key} className={styles.chip}>
              {c.text}
              <button
                type="button"
                className={styles.chipX}
                aria-label={`Remove filter: ${c.text}`}
                onClick={() => update({ [c.key]: "" })}
              >
                ×
              </button>
            </span>
          ))}
          <span className={styles.resultCount} aria-live="polite">
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          <EventsList
            rows={rows}
            total={results.length}
            page={current}
            pageSize={PAGE_SIZE}
            onPage={setPage}
            sort={sort}
            onSort={(s) => {
              setSort(s);
              setPage(1);
            }}
            keyIds={keyIds}
            empty={empty}
            onClear={clear}
          />
        </div>

        <aside className={styles.side} aria-label="Key events and how events shape demand">
          <KeyEvents
            title={keyTitle}
            events={topEvents}
            note={earlier ? "No nearby events were recorded for this day." : "No nearby events to highlight for this day."}
          />

          <details className={styles.explainer} open={explainerOpen} onToggle={(e) => setExplainerOpen(e.currentTarget.open)}>
            <summary>
              How events shape demand
              <span className={styles.explainerToggle}>
                {explainerOpen ? "Hide" : "Show"}
                <svg className={styles.chevron} viewBox="0 0 10 6" aria-hidden="true">
                  <path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <div className={styles.explainerBody}>
              <ul className={styles.shapes}>
                {SHAPES.map((s) => (
                  <li key={s.text}>
                    <span className={styles.shapeIcon} aria-hidden="true">
                      {s.icon}
                    </span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ul>
              <p>
                These are general patterns, not predictions. An event&apos;s effect depends on its size and how close
                it is. Open an event to see its estimated effect on your demand, period by period.
              </p>
            </div>
          </details>
        </aside>
      </div>
    </>
  );
}
