"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Shared landing spot for both sign-in and sign-up Google OAuth redirects
// (see signIn.authenticateWithRedirect / signUp.authenticateWithRedirect in
// the sign-in and sign-up pages). Clerk finalizes the session here and sends
// the user on to redirectUrlComplete ("/").
export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
