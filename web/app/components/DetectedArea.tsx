"use client";

import { useId } from "react";
import { ZONES } from "my-app/convex/lib/vocab";
import type { AreaDetection } from "@/app/hooks/useAreaDetection";
import styles from "./DetectedArea.module.css";

// The line under the address field: the detected area, or why there isn't
// one — with a retry when the lookup failed and a manual choice when the
// address couldn't be placed.
export function DetectedArea({ area }: { area: AreaDetection }) {
  const selectId = useId();
  const { status } = area;

  return (
    <div className={styles.area} aria-live="polite">
      {status.kind === "idle" && (
        <p className={styles.muted}>We&apos;ll detect your area from the address.</p>
      )}
      {status.kind === "unconfirmed" && (
        <p className={styles.muted}>Choose your address from the suggestions to detect your area.</p>
      )}
      {status.kind === "loading" && <p className={styles.muted}>Detecting your area…</p>}

      {(status.kind === "found" || status.kind === "saved" || status.kind === "manual") && (
        <p className={styles.found}>
          <PinIcon />
          <span>
            {status.kind === "found" ? "Detected area" : "Area"}: <strong>{status.zone}</strong>
            {status.kind === "manual" && <span className={styles.muted}> (chosen manually)</span>}
          </span>
        </p>
      )}

      {status.kind === "outside" && (
        <p className={styles.warn}>
          Restaurant is outside of supported coverage zones. ForeShift currently covers Detroit.
        </p>
      )}
      {status.kind === "not_found" && (
        <p className={styles.warn}>We couldn&apos;t place this address in an area.</p>
      )}
      {status.kind === "error" && (
        <p className={styles.warn}>
          We couldn&apos;t detect your area right now.{" "}
          <button type="button" className={styles.linkBtn} onClick={area.retry}>
            Try again
          </button>
        </p>
      )}

      {(status.kind === "not_found" || status.kind === "error" || status.kind === "manual") && (
        <div className={styles.manual}>
          <label htmlFor={selectId} className={styles.manualLabel}>
            {status.kind === "manual" ? "Change area" : "Or choose your area manually"}
          </label>
          <select
            id={selectId}
            className={styles.select}
            value={status.kind === "manual" ? status.zone : ""}
            onChange={(e) => area.chooseManually(e.target.value)}
          >
            <option value="">Choose an area…</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      className={styles.pin}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
