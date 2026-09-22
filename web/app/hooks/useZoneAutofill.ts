"use client";

import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "my-app/convex/_generated/api";

export type ZoneNote = { kind: "loading" | "ok" | "warn"; text: string } | null;

// Shared by onboarding and Settings: picking an address suggestion identifies
// the zone (same lookup as the "Find my zone" modal) and fills it in through
// `setZone`. A zone the user chose by hand is never overwritten by a failed
// lookup, and a manual choice wins over any lookup still in flight.
export function useZoneAutofill(setZone: (zone: string) => void) {
  const findMyZone = useAction(api.zones.findMyZone);
  const [zoneNote, setZoneNote] = useState<ZoneNote>(null);
  const request = useRef(0);
  const wasAuto = useRef(false); // true while the current zone came from a lookup

  async function onAddressPicked(picked: string) {
    const id = ++request.current;
    setZoneNote({ kind: "loading", text: "Finding your zone…" });
    let note: { kind: "ok" | "warn"; text: string };
    try {
      const r = await findMyZone({ address: picked });
      if (id !== request.current) return; // a newer pick or a manual choice took over
      if (r.status === "ok") {
        setZone(r.zone);
        wasAuto.current = true;
        note = { kind: "ok", text: "Zone identified from your address." };
      } else if (r.status === "outside_coverage") {
        note = {
          kind: "warn",
          text: "That address is outside our current coverage area (Detroit). Please choose your zone from the list.",
        };
      } else {
        note = { kind: "warn", text: "We couldn't place that address in a zone. Please choose your zone from the list." };
      }
    } catch {
      if (id !== request.current) return;
      note = { kind: "warn", text: "Couldn't identify your zone automatically. Please choose it from the list." };
    }
    // The address changed but no zone matches it: drop a zone a previous lookup
    // filled in (never one the user chose by hand).
    if (note.kind === "warn" && wasAuto.current) {
      setZone("");
      wasAuto.current = false;
    }
    setZoneNote(note);
  }

  /** The user picked a zone from the dropdown. */
  function onManualZone(zone: string) {
    request.current++;
    wasAuto.current = false;
    setZone(zone);
    setZoneNote(null);
  }

  /** The "Find my zone" modal found one. */
  function onModalFound(zone: string) {
    request.current++;
    wasAuto.current = true;
    setZone(zone);
    setZoneNote({ kind: "ok", text: "Zone identified from your address." });
  }

  return { zoneNote, onAddressPicked, onManualZone, onModalFound };
}
