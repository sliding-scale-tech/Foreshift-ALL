"use client";

import { useQuery } from "convex/react";
import { api } from "my-app/convex/_generated/api";

// Single source of truth for "who is signed in" on this frontend — wraps the
// same api.users.me query the admin console uses (convex/users.ts), synced
// from Clerk via the shared webhook. Use this wherever a screen needs to
// gate on auth or read the current user's role, instead of calling
// useQuery(api.users.me) directly in every component.
export function useCurrentUser() {
  const me = useQuery(api.users.me);

  return {
    user: me ?? null,
    // undefined = Convex hasn't answered yet; null = answered, signed out.
    isLoading: me === undefined,
    isSignedIn: me !== undefined && me !== null,
  };
}
