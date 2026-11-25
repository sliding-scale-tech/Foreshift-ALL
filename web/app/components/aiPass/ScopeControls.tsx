"use client";

import { shortDate } from "./ReplyCardView";
import styles from "./aiPass.module.css";

export type Scope = { zone: string; concept: string; date: string };

/** The current scope as small chips above the input. */
export function ScopeChips({ scope, today }: { scope: Scope; today: string }) {
  return (
    <div className={styles.chipsRow} aria-label="Answers are about">
      <span className={styles.scopeChip}>{scope.zone}</span>
      <span className={styles.scopeChip}>{scope.concept}</span>
      <span className={styles.scopeChip}>{scope.date === today ? "Today" : shortDate(scope.date)}</span>
    </div>
  );
}
