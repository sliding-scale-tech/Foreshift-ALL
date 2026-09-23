"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { AuthShell } from "@/app/components/AuthShell";
import { IconMail, IconEye, IconArrowRight, IconGoogle } from "@/app/components/icons";
import formStyles from "@/app/components/AuthForm.module.css";

export default function SignInPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Set once Clerk asks for an emailed code to verify this browser.
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isLoaded || !signIn || !setActive) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const created = await signIn.create({ identifier: email, password });

      // Passing the password to create() doesn't always authenticate it on its
      // own — Clerk can come back asking for the first factor to be attempted
      // explicitly, which is what actually checks the password.
      const result =
        created.status === "needs_first_factor"
          ? await signIn.attemptFirstFactor({ strategy: "password", password })
          : created;

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
        return;
      }

      // Signing in from a browser Clerk doesn't recognise yet: the password
      // was accepted, but Clerk wants the device confirmed with an emailed
      // code before it will hand over a session.
      if (result.status === "needs_client_trust" || result.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setNeedsCode(true);
        return;
      }

      // Anything left (a forced password reset, say) has no UI yet — log it
      // so an unhandled case is identifiable rather than anonymous.
      console.warn("[sign-in] unhandled status:", result.status, result);
      setError("Additional verification is required for this account.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        // Don't parrot Clerk's specific reason (account-enumeration risk).
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
        return;
      }

      setError("That code didn't work. Please check and try again.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage || err.errors[0]?.message || "Verification failed.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch {
      setError("Couldn't start Google sign-in. Please try again.");
      setGoogleLoading(false);
    }
  };

  if (needsCode) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Confirm it's you to finish signing in."
        headline="Predictive clarity for your operations."
        blurb="Access intelligent forecasts and operational insights designed for modern management."
      >
        <form onSubmit={handleVerifyCode} noValidate>
          <p className={formStyles.verifyNote}>
            We sent a 6-digit code to <strong>{email}</strong> to verify this device.
          </p>
          <div className={formStyles.field}>
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={formStyles.input}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          {error && <p className={formStyles.error}>{error}</p>}

          <button type="submit" className={formStyles.primaryBtn} disabled={submitting}>
            {submitting ? "Verifying…" : "Verify and sign in"}
            {!submitting && <IconArrowRight />}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to your ForeShift account."
      headline="Predictive clarity for your operations."
      blurb="Access intelligent forecasts and operational insights designed for modern management."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className={formStyles.field}>
          <label htmlFor="email">Email Address</label>
          <div className={formStyles.inputWrap}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className={formStyles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className={formStyles.inputIcon}>
              <IconMail />
            </span>
          </div>
        </div>

        <div className={formStyles.field}>
          <label htmlFor="password">Password</label>
          <div className={formStyles.inputWrap}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={formStyles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className={formStyles.eyeButton}
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <IconEye off={showPassword} />
            </button>
          </div>
        </div>

        <div className={formStyles.forgotRow}>
          <span>Forgot password?</span>
        </div>

        {error && <p className={formStyles.error}>{error}</p>}

        <button type="submit" className={formStyles.primaryBtn} disabled={submitting}>
          {submitting ? "Signing in…" : "Login"}
          {!submitting && <IconArrowRight />}
        </button>
      </form>

      <button
        type="button"
        className={formStyles.googleBtn}
        onClick={handleGoogle}
        disabled={googleLoading}
      >
        <IconGoogle />
        {googleLoading ? "Redirecting…" : "Google"}
      </button>

      <p className={formStyles.switchLine}>
        Don&apos;t have an account?
        <Link href="/sign-up">Signup</Link>
      </p>
    </AuthShell>
  );
}
