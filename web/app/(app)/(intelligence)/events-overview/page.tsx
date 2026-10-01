"use client";

import { useMyOperator } from "@/app/hooks/useMyOperator";
import { useWeek } from "@/app/hooks/useWeek";
import { EventsOverviewView } from "@/app/components/EventsOverviewView";
import { PageLoading } from "@/app/components/PageLoading";

// Events Overview — the week's nearby events. Data comes from the live week
// query (no AI text), so there is nothing to generate and nothing to wait for
// beyond the query itself; the view does the rest.
export default function EventsOverviewPage() {
  const { operator } = useMyOperator();
  const week = useWeek();
  if (!week) return <PageLoading label="Gathering demand insight…" />;
  return <EventsOverviewView week={week} operator={operator} />;
}
