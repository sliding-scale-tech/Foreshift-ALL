"use client";

import { useQuery } from "convex/react";
import { api } from "my-app/convex/_generated/api";

// Whether the signed-in user has completed restaurant onboarding — drives the
// redirect gate on "/" (see app/page.tsx) and the onboarding flow itself.
export function useMyOperator() {
  const operator = useQuery(api.operators.getMine);

  return {
    operator: operator ?? null,
    isLoading: operator === undefined,
    hasOnboarded: operator !== undefined && operator !== null,
  };
}
