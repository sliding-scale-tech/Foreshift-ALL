"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { AuthShell } from "@/app/components/AuthShell";
import { IconMail, IconEye, IconArrowRight, IconGoogle } from "@/app/components/icons";
import formStyles from "@/app/components/AuthForm.module.css";

const FEATURES = [
  "14-day free trial, no card needed",
  "Setup in under 5 minutes",
  "AI recommendations from day one",
];

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();

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
        headline="Start forecasting smarter today."
        blurb="Join ForeShift to predict demand and reduce waste."
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
      title="Create Account"
      subtitle="Get started with your ForeShift account."
      headline="Start forecasting smarter today."
      blurb="Join ForeShift to predict demand and reduce waste."
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

        {error && <p className={formStyles.error}>{error}</p>}

        <button type="submit" className={formStyles.primaryBtn} disabled={submitting}>
          {submitting ? "Creating account…" : "Create Account"}
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
        Already have an account?
        <Link href="/sign-in">Login</Link>
      </p>
    </AuthShell>
  );
}
