"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import { EventBody } from "@/app/components/EventBody";
import { PageLoading } from "@/app/components/PageLoading";
import { useEventSource } from "@/app/hooks/useEventSource";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { useStickyValue } from "@/app/hooks/useStickyValue";
import shared from "../../../shared.module.css";
import styles from "./event.module.css";

// Event Outlook — one event's isolated effect on the operator's demand, per
// service period (base score + THIS event's lift only). Opened from the Events
// Overview list.
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
  const { operator } = useMyOperator();

  const liveImpact = useQuery(api.outlookApp.getEventImpact, {
    eventId: decodeURIComponent(eventId),
    date,
  });
  const impact = useStickyValue(`event:${eventId}:${date ?? ""}`, liveImpact);
  const source = useEventSource(decodeURIComponent(eventId), Boolean(impact));

  return (
    <>
      <Link href="/events-overview" className={styles.back}>
        <ArrowLeft />
        Back to events overview
      </Link>
      <h1 className={`${shared.title} ${styles.title}`}>Event outlook</h1>

      {impact === undefined && <PageLoading label="Gathering demand insight…" />}
      {impact === null && (
        <p className={`${shared.status} ${shared.statusError}`} role="alert">
          This event is no longer in your forecast window.
        </p>
      )}

      {impact && (
        <EventBody impact={impact} zone={operator?.zone} source={source} />
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
