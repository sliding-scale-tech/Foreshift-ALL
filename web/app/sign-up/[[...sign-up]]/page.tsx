"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRedirectIfSignedIn } from "@/app/hooks/useRedirectIfSignedIn";
import { AuthShell } from "@/app/components/AuthShell";
import { IconMail, IconEye, IconArrowRight, IconGoogle } from "@/app/components/icons";
import formStyles from "@/app/components/AuthForm.module.css";
import { TERMS_URL, PRIVACY_URL } from "@/app/lib/legalLinks";

const FEATURES = [
  "14-day free trial. No credit card required.",
  "Get started in a few simple steps.",
  "AI-powered demand insights tailored to your restaurant from day one.",
];

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();
  useRedirectIfSignedIn();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [step, setStep] = useState<"register" | "verify">("register");
  const [code, setCode] = useState("");

  if (!isLoaded || !signUp || !setActive) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
        return;
      }

      await signUp.prepareVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage || err.errors[0]?.message || "Sign up failed.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signUp.attemptVerification({ strategy: "email_code", code });

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
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch {
      setError("Couldn't start Google sign-up. Please try again.");
      setGoogleLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Verify your ForeShift account."
        headline="Know demand before you open."
        blurb="Demand intelligence for smarter operations."
        features={FEATURES}
      >
        <form onSubmit={handleVerify} noValidate>
          <p className={formStyles.verifyNote}>
            We sent a 6-digit code to <strong>{email}</strong>.
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
            {submitting ? "Verifying…" : "Verify email"}
            {!submitting && <IconArrowRight />}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start your 14-day free trial."
      headline="Know demand before you open."
      blurb="Demand intelligence for smarter operations."
      features={FEATURES}
    >
      <form onSubmit={handleRegister} noValidate>
        <div className={formStyles.row2}>
          <div className={formStyles.field}>
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              className={formStyles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              className={formStyles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

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
              autoComplete="new-password"
              className={formStyles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              aria-describedby="password-rules"
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
          <ul id="password-rules" className={formStyles.hints}>
            <li>At least 8 characters</li>
            <li>Not a common or previously breached password</li>
          </ul>
        </div>

        {error && <p className={formStyles.error}>{error}</p>}

        {/* Clerk bot protection mounts its Smart CAPTCHA here (used by both
            signUp.create and the Google redirect). Without it Clerk falls back
            to the invisible widget and logs a console error. */}
        <div id="clerk-captcha" />

        <button type="submit" className={formStyles.primaryBtn} disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
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

      {/* New tab, so following a link doesn't wipe what's typed in the form. */}
      <p className={formStyles.legal}>
        By creating an account, you agree to our{" "}
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
          Terms and Conditions
        </a>{" "}
        and{" "}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        .
      </p>

      <p className={formStyles.switchLine}>
        Already have an account?
        <Link href="/sign-in">Sign in</Link>
      </p>
      <p className={formStyles.switchLine}>
        Just looking?
        <Link href="/sample-outlook">See a sample outlook</Link>
      </p>
    </AuthShell>
  );
}
