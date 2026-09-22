"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import shared from "../shared.module.css";
import styles from "./billing.module.css";

const TIERS = [
  {
    name: "Event Intelligence",
    tag: "Know your city.",
    price: "$99",
    features: [
      "Weather forecast for the week",
      "Sports — all Detroit teams",
      "Concerts, tradeshows, festivals, 5Ks",
      "Demand signal per event for your zone",
      "Thirty seconds to start — zone and type only",
    ],
    buyable: true,
  },
  {
    name: "Dynamic Scheduling",
    tag: "Know your schedule.",
    price: "$199",
    features: [
      "Everything in Tier 1",
      "Shift-level staffing recommendations",
      "Estimated covers per daypart",
      "Server and kitchen crew counts",
      "Revenue estimate per shift",
    ],
    buyable: false,
  },
  {
    name: "Sales Forecasting",
    tag: "Know your numbers.",
    price: "$299",
    features: [
      "Everything in Tier 2",
      "Thirty-day forward revenue projection",
      "POS or CSV historical data upload",
      "Variance tracking: predicted vs actual",
      "Market intelligence for expansion",
    ],
    buyable: false,
  },
];

function CheckIcon() {
  return (
    <svg className={styles.check} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path d="m5.800 10.200 2.800 2.800 5.600-5.800" fill="none" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(ms));
}

// Billing — the three plan tiers (only Event Intelligence is purchasable; the
// other two are Bubble's static "coming later" cards) plus a status banner
// for the operator's own trial/subscription and the Stripe Checkout /
// billing-portal round trips.
function BillingContent() {
  const { operator } = useMyOperator();
  const router = useRouter();
  const search = useSearchParams();
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const createPortal = useAction(api.stripe.createPortalSession);
  const syncCheckout = useAction(api.stripe.syncCheckoutSession);

  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState("");
  const [justSubscribed, setJustSubscribed] = useState(false);

  // Stripe redirected back from Checkout — reconcile once, then drop the
  // query param so a refresh doesn't re-trigger it. The webhook (http.ts) is
  // the durable sync; this just avoids a stale first render.
  const checkoutParam = search.get("checkout");
  useEffect(() => {
    if (checkoutParam !== "success") return;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    router.replace("/billing");
    if (!sessionId) return;
    syncCheckout({ sessionId })
      .then((r) => setJustSubscribed(r !== null))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't confirm your subscription."));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for this redirect
  }, [checkoutParam]);

  async function upgrade() {
    setError("");
    setBusy("checkout");
    try {
      const { url } = await createCheckout({ origin: window.location.origin });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
      setBusy(null);
    }
  }

  async function manage() {
    setError("");
    setBusy("portal");
    try {
      const { url } = await createPortal({ origin: window.location.origin });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the billing portal.");
      setBusy(null);
    }
  }

  const access = operator?.access;

  return (
    <>
      <h1 className={shared.title}>Billing</h1>
      <p className={shared.subtitle}>Manage your subscription and payment details</p>

      {access && (
        <div className={styles.status}>
          <span>
            {access.isSubscribed ? (
              <>
                <span className={`${styles.statusLabel} ${!access.hasAccess ? styles.statusExpired : ""}`}>
                  {access.hasAccess ? "Event Intelligence — active" : "Event Intelligence — payment needed"}
                </span>
                {access.hasAccess && ` · renews ${formatDate(access.trialEndsAt)}`}
              </>
            ) : access.hasAccess ? (
              <>
                <span className={styles.statusLabel}>Free trial</span> · ends {formatDate(access.trialEndsAt)}
              </>
            ) : (
              <span className={`${styles.statusLabel} ${styles.statusExpired}`}>Your free trial has ended</span>
            )}
          </span>
          <span className={styles.statusActions}>
            {access.isSubscribed && (
              <button type="button" className={styles.manageBtn} onClick={manage} disabled={busy !== null}>
                {busy === "portal" ? "Opening…" : "Manage billing"}
              </button>
            )}
          </span>
        </div>
      )}

      {justSubscribed && (
        <p className={`${styles.checkoutMsg} ${styles.checkoutOk}`} role="status">
          You&apos;re subscribed to Event Intelligence. Thanks!
        </p>
      )}
      {checkoutParam === "cancelled" && (
        <p className={`${styles.checkoutMsg} ${styles.checkoutErr}`} role="status">
          Checkout was cancelled — no changes were made.
        </p>
      )}
      {error && (
        <p className={`${styles.checkoutMsg} ${styles.checkoutErr}`} role="alert">
          {error}
        </p>
      )}

      <h2 className={styles.heading}>Three tiers. One ecosystem.</h2>
      <div className={styles.tiers}>
        {TIERS.map((t) => {
          const isCurrent = t.buyable && access?.isSubscribed;
          return (
            <section key={t.name} className={`${styles.tier} ${isCurrent ? styles.current : ""}`}>
              <div className={styles.tierHead}>
                <h3 className={styles.tierName}>{t.name}</h3>
                <p className={styles.tierTag}>{t.tag}</p>
                <p className={styles.price}>{t.price}</p>
                <p className={styles.per}>per month</p>
              </div>
              <div className={styles.tierBody}>
                <ul className={styles.features}>
                  {t.features.map((f) => (
                    <li key={f} className={styles.feature}>
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                {t.buyable ? (
                  <button
                    type="button"
                    className={`${styles.cta} ${isCurrent ? styles.current : ""}`}
                    onClick={upgrade}
                    disabled={busy !== null || isCurrent}
                  >
                    {isCurrent ? "Current plan" : busy === "checkout" ? "Redirecting…" : "Upgrade"}
                  </button>
                ) : (
                  <button type="button" className={styles.cta} disabled>
                    Contact Sales
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  );
}
