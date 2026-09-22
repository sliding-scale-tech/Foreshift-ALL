"use client";

import { useMyOperator } from "./useMyOperator";

export type AccessInfo = {
  hasAccess: boolean;
  reason: "trial" | "subscribed" | "expired";
  trialEndsAt: number;
  isSubscribed: boolean;
};

// Whether the signed-in operator can see the Intelligence pages right now —
// the trial/subscription decision itself lives server-side (lib/access.ts) so
// there is one definition; this just re-shapes it for the pages/gate.
export function useAccess(): { isLoading: boolean; access: AccessInfo | null } {
  const { operator, isLoading } = useMyOperator();
  return { isLoading, access: operator?.access ?? null };
}
