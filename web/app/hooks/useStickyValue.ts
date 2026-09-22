"use client";

// Keeps the last defined value alive across a Convex `useQuery`'s transient
// `undefined`. Convex has no built-in stale-time cache (unlike React Query) —
// the moment a query's last subscriber unmounts, its cached result is
// dropped, so switching between pages re-fetches from zero every single
// time, even for a page visited seconds ago. This bridges that gap: while
// the live subscription is re-establishing, keep showing the last real value
// for this key instead of falling back to a loading state.
//
// Deliberately a module-level cache (survives remounts), not per-instance
// state — that's the whole point. It only ever holds what THIS browser tab
// has actually seen, and a live value always overwrites it immediately, so
// staleness is bounded by "however long the resubscribe takes" (well under a
// second), never longer.
const cache = new Map<string, unknown>();

export function useStickyValue<T>(key: string, value: T | undefined): T | undefined {
  if (value !== undefined) {
    cache.set(key, value);
    return value;
  }
  return cache.has(key) ? (cache.get(key) as T) : undefined;
}
