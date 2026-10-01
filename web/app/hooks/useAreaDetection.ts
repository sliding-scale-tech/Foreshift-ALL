"use client";

import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "my-app/convex/_generated/api";

export type AreaStatus =
  | { kind: "idle" } // no address yet
  | { kind: "unconfirmed" } // typed, but not picked from the suggestions
  | { kind: "loading" }
  | { kind: "found"; zone: string } // detected from the picked address
  | { kind: "saved"; zone: string } // already on the profile (Settings)
  | { kind: "manual"; zone: string } // chosen by hand after detection failed
  | { kind: "outside" } // a real address, outside the 13 zones
  | { kind: "not_found" } // couldn't be placed in any zone
  | { kind: "error" }; // the lookup itself failed

// Shared by onboarding and Settings: the operator enters their address once
// and the zone is detected from it. Picking a new address re-detects; editing
// the text without picking clears the zone, so an old zone is never saved
// against a different address. Manual choice is offered only when detection
// can't place the address.
export function useAreaDetection(savedZone = "") {
  const findMyZone = useAction(api.zones.findMyZone);
  const initial: AreaStatus = savedZone ? { kind: "saved", zone: savedZone } : { kind: "idle" };
  const [status, setStatus] = useState<AreaStatus>(initial);
  const request = useRef(0);
  const lastPicked = useRef("");

  async function detect(address: string) {
    const id = ++request.current;
    lastPicked.current = address;
    setStatus({ kind: "loading" });
    try {
      const r = await findMyZone({ address });
      if (id !== request.current) return; // a newer pick, edit or manual choice took over
      setStatus(
        r.status === "ok"
          ? { kind: "found", zone: r.zone }
          : r.status === "outside_coverage"
            ? { kind: "outside" }
            : { kind: "not_found" },
      );
    } catch {
      if (id === request.current) setStatus({ kind: "error" });
    }
  }

  return {
    status,
    /** The zone to save, or "" while there isn't one. */
    zone: "zone" in status ? status.zone : "",
    /** Every keystroke in the address field. */
    onAddressChange(text: string) {
      request.current++;
      // Clearing the field goes back to what the profile had (nothing, during onboarding).
      setStatus(text.trim() ? { kind: "unconfirmed" } : initial);
    },
    /** A suggestion was picked. */
    onAddressPicked: detect,
    retry() {
      if (lastPicked.current) void detect(lastPicked.current);
    },
    chooseManually(zone: string) {
      request.current++;
      setStatus(zone ? { kind: "manual", zone } : { kind: "not_found" });
    },
  };
}

export type AreaDetection = ReturnType<typeof useAreaDetection>;

/** Why the address/area can't be saved yet, or null. `outside` is already
 * explained by the area line itself, so it gets no second message. */
export function addressError(status: AreaStatus): string | null {
  switch (status.kind) {
    case "idle":
      return "Enter your restaurant's address.";
    case "unconfirmed":
      return "Choose your address from the suggestions.";
    case "loading":
      return "Wait a moment while we detect your area.";
    case "not_found":
    case "error":
      return "Choose your area to continue.";
    default:
      return null;
  }
}
