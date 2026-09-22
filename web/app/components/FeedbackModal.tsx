"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import { DAYPARTS, type DaypartKey } from "@/app/lib/dayparts";
import { IconClose } from "./icons";
import {
  DpDinner,
  DpLate,
  DpMidday,
  DpMorning,
  RateBusy,
  RateClosed,
  RateDead,
  RateSlammed,
  RateSlow,
  RateSteady,
} from "./feedback-icons";
import { PageLoading } from "./PageLoading";
import styles from "./FeedbackModal.module.css";

const RATINGS = [
  { key: "Dead", Icon: RateDead },
  { key: "Slow", Icon: RateSlow },
  { key: "Steady", Icon: RateSteady },
  { key: "Busy", Icon: RateBusy },
  { key: "Slammed", Icon: RateSlammed },
  { key: "Closed", Icon: RateClosed },
] as const;
type Rating = (typeof RATINGS)[number]["key"];

const DP_ICON: Record<DaypartKey, { Icon: () => React.ReactNode; className: string }> = {
  morning: { Icon: DpMorning, className: styles.dpMorning },
  midday: { Icon: DpMidday, className: styles.dpMidday },
  dinner: { Icon: DpDinner, className: styles.dpDinner },
  late: { Icon: DpLate, className: styles.dpLate },
};

// The forecast bands map onto the same five-step scale the operator rates
// with (the FAQ's "you reported Busy, the forecast was High").
const BAND_TO_RATING: Record<string, Exclude<Rating, "Closed">> = {
  Minimal: "Dead",
  Light: "Slow",
  Moderate: "Steady",
  High: "Busy",
  Peak: "Slammed",
  Exceptional: "Slammed",
};

// "How was your day?" — opened from the sidebar's Feedback Loop, on any page.
// Saves one row per operator per day (resubmitting replaces it).
export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const today = useQuery(api.feedback.getToday);
  const submit = useMutation(api.feedback.submit);

  // What the user changed on top of what's already saved for today
  // (null = cleared). Deriving `picked` avoids copying server data into state.
  const [edits, setEdits] = useState<Partial<Record<DaypartKey, Rating | null>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  const picked = useMemo(() => {
    const out: Partial<Record<DaypartKey, Rating>> = {};
    for (const d of today?.dayparts ?? []) {
      if (d.actual) out[d.daypart as DaypartKey] = d.actual as Rating;
    }
    for (const [dp, v] of Object.entries(edits)) {
      if (v) out[dp as DaypartKey] = v;
      else delete out[dp as DaypartKey];
    }
    return out;
  }, [today, edits]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!thanks) return;
    const t = setTimeout(onClose, 1600);
    return () => clearTimeout(t);
  }, [thanks, onClose]);

  const count = Object.keys(picked).length;

  async function handleSubmit() {
    if (count === 0 || saving) return;
    setError("");
    setSaving(true);
    try {
      await submit({
        dayparts: DAYPARTS.filter((d) => picked[d.key]).map((d) => ({
          daypart: d.key,
          actual: picked[d.key] as string,
        })),
      });
      setThanks(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your feedback. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Portal to <body>: rendered inside the sidebar it would sit in the sidebar's
  // stacking context and page content (e.g. an open FAQ chevron) would paint over it.
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="How was your day?"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>How was your day?</h2>
            <p className={styles.subtitle}>
              Your feedback helps us fine-tune predictions and serve you better.
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <hr className={styles.divider} />

        {thanks ? (
          <div className={styles.state}>
            <p className={styles.thanks}>Thank you!</p>
            <p>Your feedback for today has been saved.</p>
          </div>
        ) : today === undefined ? (
          <PageLoading label="Loading today’s forecast…" />
        ) : today === null ? (
          <p className={styles.state}>Finish onboarding to share feedback.</p>
        ) : (
          <>
            <div className={styles.grid}>
              <div className={styles.colHead}>Daypart</div>
              <div className={`${styles.colHead} ${styles.center}`}>How was it?</div>
              <div className={`${styles.colHead} ${styles.end}`}>Predicted</div>

              {DAYPARTS.map((dp) => {
                const info = today.dayparts.find((d) => d.daypart === dp.key);
                const predicted = info?.predictedBand ? BAND_TO_RATING[info.predictedBand] : undefined;
                const { Icon, className } = DP_ICON[dp.key];
                return (
                  <div key={dp.key} className={styles.row}>
                    <div className={styles.rowLabel}>
                      <div className={`${styles.dpIcon} ${className}`}>
                        <Icon />
                      </div>
                      <div>
                        <div className={styles.dpName}>{dp.key}</div>
                        <div className={styles.dpWindow}>{dp.window}</div>
                      </div>
                    </div>
                    <div className={styles.options} role="radiogroup" aria-label={`${dp.label} rating`}>
                      {RATINGS.map(({ key, Icon: RIcon }) => (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={picked[dp.key] === key}
                          className={`${styles.option} ${picked[dp.key] === key ? styles.selected : ""}`}
                          onClick={() =>
                            setEdits((e) => ({ ...e, [dp.key]: picked[dp.key] === key ? null : key }))
                          }
                        >
                          <RIcon />
                          <span className={styles.optionLabel}>{key}</span>
                        </button>
                      ))}
                    </div>
                    <div className={styles.predicted}>
                      {predicted ? (
                        <span className={`${styles.pill} ${styles[`pill${predicted}`]}`}>{predicted}</span>
                      ) : (
                        <span className={styles.dpWindow}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className={`${styles.divider} ${styles.footerDivider}`} />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.footer}>
              <button type="button" className={`${styles.btn} ${styles.cancel}`} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.submit}`}
                disabled={count === 0 || saving}
                onClick={handleSubmit}
              >
                {saving ? "Saving…" : "Submit Feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
