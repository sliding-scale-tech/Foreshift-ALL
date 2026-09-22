"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RedirectToSignIn, Show } from "@clerk/nextjs";
import { useMyOperator } from "@/app/hooks/useMyOperator";

// This is the new, standalone operator-facing frontend — a separate Next.js
// app/codebase from the Bubble app and from the admin console
// (foreshift-new/my-app). It shares the same Convex deployment and Clerk
// instance (see ConvexClientProvider + .env.local), not the same codebase.
//
// "/" is purely a routing gate — both signup paths (Google OAuth and
// email/password) and every later sign-in land here after auth completes.
// First-time users with no operator profile yet go to /onboarding; everyone
// else goes straight to /dashboard. No UI of its own.
export default function Home() {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <RoutingGate />
      </Show>
    </>
  );
}

function RoutingGate() {
  const router = useRouter();
  const { isLoading, hasOnboarded } = useMyOperator();

  useEffect(() => {
    if (isLoading) return;
    router.replace(hasOnboarded ? "/dashboard" : "/onboarding");
  }, [isLoading, hasOnboarded, router]);

  return null;
}
