"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
// Whole minutes, so the snapshot is stable between reads within a minute.
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;

/** The current time (ms), read in the browser only: `null` while rendering on the server and during hydration,
 * so the server and the browser never disagree about it. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, minuteNow, () => null);
}
