"use client";

import { useState, type ReactNode } from "react";
import styles from "./WeekCarousel.module.css";

/** Split a forecast into pages of seven days. One page is the original layout. */
export function weekSlices<T>(items: T[], size = 7): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// One week on screen. Further weeks slide in from the side, the same seven-day
// layout. A single week renders with no arrows.
export function WeekCarousel({
  count,
  index,
  onIndex,
  children,
}: {
  count: number;
  index: number;
  onIndex: (index: number) => void;
  children: ReactNode;
}) {
  const [direction, setDirection] = useState<1 | -1>(1);
  if (count <= 1) return <>{children}</>;

  const go = (next: number) => {
    if (next < 0 || next >= count || next === index) return;
    setDirection(next > index ? 1 : -1);
    onIndex(next);
  };

  return (
    <div className={styles.carousel}>
      <button
        type="button"
        className={`${styles.arrow} ${styles.noPrint}`}
        aria-label="Previous week"
        disabled={index === 0}
        onClick={() => go(index - 1)}
      >
        <Chevron direction="left" />
      </button>
      <div className={styles.viewport}>
        <div key={index} className={direction === 1 ? styles.slideNext : styles.slidePrev}>
          {children}
        </div>
      </div>
      <button
        type="button"
        className={`${styles.arrow} ${styles.noPrint}`}
        aria-label="Next week"
        disabled={index === count - 1}
        onClick={() => go(index + 1)}
      >
        <Chevron direction="right" />
      </button>
      <div className={`${styles.dots} ${styles.noPrint}`} role="tablist" aria-label="Forecast weeks">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            className={i === index ? styles.dotOn : styles.dot}
            aria-selected={i === index}
            aria-label={`Week ${i + 1} of ${count}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d={direction === "left" ? "M14.5 6.5 9 12l5.5 5.5" : "M9.5 6.5 15 12l-5.5 5.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
