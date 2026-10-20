"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  IconCalendarCheck,
  IconCloud,
  IconEventPin,
  IconGridLayout,
  IconSparkle,
  IconUtensils,
} from "@/app/components/dashboard-icons";
import { IconTrendUp } from "@/app/components/icons";
import type { ReplyCard } from "@/app/lib/aiPassTurns";
import styles from "./aiPass.module.css";

const FACTOR_ICON: Record<ReplyCard["factors"][number]["type"], ComponentType> = {
  event: IconEventPin,
  weather: IconCloud,
  pattern: IconCalendarCheck,
  demand: IconTrendUp,
  week: IconGridLayout,
  area: IconEventPin,
  concept: IconUtensils,
};

/** "2026-10-12" -> "Mon, Oct 12" (read at noon UTC so the date can't shift). */
export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function AiAvatar() {
  return (
    <span className={styles.aiAvatar} aria-hidden="true">
      <IconSparkle />
    </span>
  );
}

// One AI reply, laid out as in the design: the direct answer, the drivers behind
// it, and a highlighted net impact. Text is rendered as plain React text (never
// HTML), and the model's wording was already checked against the data on the
// server (convex/lib/aiPass/grounding.ts).
export function ReplyCardView({
  card,
  isLast,
  onAsk,
  retryQuestion,
  currentScope,
}: {
  card: ReplyCard;
  /** Follow-up suggestions only on the newest reply. */
  isLast: boolean;
  onAsk: (question: string) => void;
  /** The question to send again from a "Try again" button (data-only replies). */
  retryQuestion?: string;
  /** The chat's own scope (shown in the chips under the input); not repeated on every card. */
  currentScope?: { zone: string; concept: string; date: string };
}) {
  const degraded = card.kind === "degraded";
  // A pill only when this answer is about something other than the chat's current scope.
  const pills = card.scopes.filter(
    (s) =>
      !currentScope ||
      s.zone !== currentScope.zone ||
      s.concept !== currentScope.concept ||
      (s.date !== null && s.date !== currentScope.date),
  );
  const solo = card.factors.length === 1;
  return (
    <div className={`${styles.card} ${degraded ? styles.cardSoft : ""}`}>
      {pills.length > 0 && (
        <div className={styles.cardScopes} aria-label="This answer is about">
          {pills.map((s) => (
            <span key={`${s.zone}|${s.concept}|${s.date ?? ""}`} className={styles.scopePill}>
              {s.zone} · {s.concept}
              {s.date ? ` · ${shortDate(s.date)}` : ""}
            </span>
          ))}
        </div>
      )}

      <p className={styles.intro}>{card.intro}</p>

      {card.factors.length > 0 && (
        <ol className={`${styles.factors} ${solo ? styles.factorsSolo : ""}`}>
          {card.factors.map((f, i) => {
            const Icon = FACTOR_ICON[f.type] ?? IconSparkle;
            return (
              <li key={f.ref} className={styles.factor}>
                <span className={`${styles.factorIcon} ${styles[`icon_${f.type}`] ?? ""}`} aria-hidden="true">
                  <Icon />
                </span>
                <div>
                  <div className={styles.factorTitle}>
                    {solo ? "" : `${i + 1}. `}
                    {f.title}
                  </div>
                  <div className={styles.factorDetail}>{f.detail}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {card.netImpact && (
        <div className={styles.net}>
          <span className={styles.netIcon} aria-hidden="true">
            <IconTrendUp />
          </span>
          <div>
            <div className={styles.netLabel}>Net impact</div>
            <div className={styles.netText}>{card.netImpact}</div>
          </div>
        </div>
      )}

      {degraded && (
        <div className={styles.softActions}>
          {retryQuestion && (
            <button type="button" className={styles.softPrimary} onClick={() => onAsk(retryQuestion)}>
              Try again
            </button>
          )}
          <Link href="/dashboard" className={styles.softLink}>
            Open Daily Outlook
          </Link>
          <Link href="/weekly-outlook" className={styles.softLink}>
            Open Weekly Outlook
          </Link>
        </div>
      )}

      {isLast && card.followUps.length > 0 && (
        <div className={styles.followUps}>
          {card.followUps.map((q) => (
            <button key={q} type="button" className={styles.chip} onClick={() => onAsk(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
