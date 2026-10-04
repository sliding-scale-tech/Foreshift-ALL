"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import type { EventSourceInfo } from "my-app/convex/lib/ticketmasterDetail";

export type SourceState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; info: EventSourceInfo };

// The event's address, link back to the listing, end time and cancelled /
// postponed status, read from the source when the page opens. It never blocks
// the page: until it answers (or if it can't) the rest of the event page shows
// as usual.
export function useEventSource(eventId: string, enabled: boolean): SourceState {
  const lookup = useAction(api.outlookApp.eventSource);
  const [done, setDone] = useState<{ id: string; value: SourceState } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    lookup({ eventId })
      .then((info) => alive && setDone({ id: eventId, value: { status: "ready", info } }))
      .catch(() => alive && setDone({ id: eventId, value: { status: "error" } }));
    return () => {
      alive = false;
    };
  }, [eventId, enabled, lookup]);

  return done && done.id === eventId ? done.value : { status: "loading" };
}
