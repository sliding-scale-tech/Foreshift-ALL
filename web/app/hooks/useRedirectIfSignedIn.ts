"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

// The sign-in and sign-up pages are for signed-out visitors. proxy.ts already
// redirects a signed-in request on the server; this covers what it can't see:
// the Back button restoring a cached form, and signing in from another tab
// while this one is still open.
export function useRedirectIfSignedIn() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);
}
