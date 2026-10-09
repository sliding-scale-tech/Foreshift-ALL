"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRedirectIfSignedIn } from "@/app/hooks/useRedirectIfSignedIn";
import { AuthShell } from "@/app/components/AuthShell";
import { IconMail, IconEye, IconArrowRight, IconGoogle } from "@/app/components/icons";
import formStyles from "@/app/components/AuthForm.module.css";

export default function SignInPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  useRedirectIfSignedIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Set once Clerk asks for an emailed code to verify this browser.
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Forgot-password flow: ask for the email, then the emailed code + new password.
  const [view, setView] = useState<"signin" | "forgot" | "reset">("signin");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

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

  const goTo = (next: "signin" | "forgot" | "reset") => {
    setError("");
    setView(next);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter the email address for your account.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email });
      setView("reset");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        // Same answer whether or not the account exists (account-enumeration
        // risk), so move on to the code step either way.
        setView("reset");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
        return;
      }

      setError("Additional verification is required for this account.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        // Code and password problems are the user's to fix, so show Clerk's reason.
        setError(err.errors[0]?.longMessage || err.errors[0]?.message || "Couldn't reset the password.");
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

  if (view === "forgot") {
    return (
      <AuthShell
        title="Reset your password"
        subtitle="We'll email you a code to set a new one."
        headline="Know demand before you open."
        blurb="Demand intelligence for smarter operations."
      >
        <form onSubmit={handleForgot} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="reset-email">Email Address</label>
            <div className={formStyles.inputWrap}>
              <input
                id="reset-email"
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

          {error && <p className={formStyles.error}>{error}</p>}

          <button type="submit" className={formStyles.primaryBtn} disabled={submitting}>
            {submitting ? "Sending…" : "Send reset code"}
            {!submitting && <IconArrowRight />}
          </button>
        </form>

        <p className={formStyles.switchLine}>
          <button type="button" className={formStyles.linkBtn} onClick={() => goTo("signin")}>
            Back to sign in
          </button>
        </p>
      </AuthShell>
    );
  }

  if (view === "reset") {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Enter the code and choose a new password."
        headline="Know demand before you open."
        blurb="Demand intelligence for smarter operations."
      >
        <form onSubmit={handleReset} noValidate>
          <p className={formStyles.verifyNote}>
            If an account exists for <strong>{email}</strong>, we sent it a 6-digit code.
          </p>
          <div className={formStyles.field}>
            <label htmlFor="reset-code">Verification code</label>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={formStyles.input}
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              required
            />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="new-password">New password</label>
            <div className={formStyles.inputWrap}>
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className={formStyles.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-describedby="new-password-rules"
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
            <ul id="new-password-rules" className={formStyles.hints}>
              <li>At least 8 characters</li>
              <li>Not a common or previously breached password</li>
            </ul>
          </div>

          {error && <p className={formStyles.error}>{error}</p>}

          <button
            type="submit"
            className={formStyles.primaryBtn}
            disabled={submitting || !resetCode.trim() || !newPassword}
          >
            {submitting ? "Resetting…" : "Reset password"}
            {!submitting && <IconArrowRight />}
          </button>
        </form>

        <p className={formStyles.switchLine}>
          <button type="button" className={formStyles.linkBtn} onClick={() => goTo("forgot")}>
            Use a different email
          </button>
        </p>
      </AuthShell>
    );
  }

  if (needsCode) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Confirm it's you to finish signing in."
        headline="Know demand before you open."
        blurb="Demand intelligence for smarter operations."
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
      title="Welcome back"
      subtitle="Sign in to your ForeShift account."
      headline="Know demand before you open."
      blurb="Demand intelligence for smarter operations."
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
          <button type="button" className={formStyles.linkBtn} onClick={() => goTo("forgot")}>
            Forgot password?
          </button>
        </div>

        {error && <p className={formStyles.error}>{error}</p>}

        <button type="submit" className={formStyles.primaryBtn} disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
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
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      <p className={formStyles.switchLine}>
        Don&apos;t have an account?
        <Link href="/sign-up">Sign up</Link>
      </p>
      <p className={formStyles.switchLine}>
        Just looking?
        <Link href="/sample-outlook">See a sample outlook</Link>
      </p>
    </AuthShell>
  );
}
