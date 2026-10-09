import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Sign-in and sign-up are for signed-out visitors only. /sso-callback is
// deliberately not listed: Google OAuth lands there while the session is still
// being finalized.
const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

// The bare root: a signed-in visitor (app.foreshift.ai/) goes straight to the dashboard.
const isRoot = createRouteMatcher(["/"]);

export default clerkMiddleware(async (auth, req) => {
  // Optimistic check on the session cookie only (no Convex lookup), so someone
  // who hasn't finished onboarding is sent on by the (app) layout instead.
  // app/page.tsx stays as the client-side fallback for signed-out visitors and
  // for a session the proxy can't see yet right after sign-in.
  if (isAuthPage(req) || isRoot(req)) {
    const { userId } = await auth();
    if (userId) return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
