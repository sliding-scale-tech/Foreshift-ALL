"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import type { AccessInfo } from "@/app/hooks/useAccess";
import styles from "./UpgradeGate.module.css";

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// Full-page block shown in place of a Daily/Weekly/Events/Weather Outlook
// page once the operator's one-week trial has ended and they haven't
// subscribed. Settings/Billing/FAQS/Feedback Loop stay reachable — the
// sidebar isn't gated, only the four Intelligence pages' content is.
export function UpgradeGate({ access }: { access: AccessInfo }) {
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function upgrade() {
    setError("");
    setLoading(true);
    try {
      const { url } = await createCheckout({ origin: window.location.origin });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card} role="dialog" aria-label="Upgrade required">
        <div className={styles.icon}>
          <LockIcon />
        </div>
        <h1 className={styles.title}>
          {access.reason === "expired" && access.isSubscribed
            ? "Your subscription has ended"
            : "Your free trial has ended"}
        </h1>
        <p className={styles.body}>
          {access.isSubscribed
            ? "Your last payment didn't go through, so access is paused. Update your billing to pick up right where you left off."
            : "You've had a full week of Daily, Weekly, Events and Weather Outlook. Upgrade to Event Intelligence to keep seeing zone demand for your restaurant."}
        </p>
        <p className={styles.price}>
          Event Intelligence — <span className={styles.priceAmount}>$99</span>/month
        </p>
        <button type="button" className={styles.cta} onClick={upgrade} disabled={loading}>
          {loading ? "Redirecting to checkout…" : "Upgrade now"}
        </button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
