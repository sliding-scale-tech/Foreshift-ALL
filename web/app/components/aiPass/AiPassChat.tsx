"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import { PageLoading } from "@/app/components/PageLoading";
import { errorText, useAiActions, useAiThread, useAiTurns } from "@/app/hooks/useAiPass";
import type { ReplyCard, Turn } from "@/app/lib/aiPassTurns";
import shared from "@/app/(app)/shared.module.css";
import { AiAvatar, ReplyCardView } from "./ReplyCardView";
import { ScopeChips, ScopeControls, type Scope } from "./ScopeControls";
import styles from "./aiPass.module.css";

const SUGGESTIONS = [
  "Why is dinner busy tonight?",
  "How does this week look?",
  "Any events driving demand?",
  "How will the weather affect today?",
];

/** A reply that never arrived after this long is shown as failed so the person isn't left waiting. */
const STALE_MS = 150_000;
const MAX_CHARS = 600;

const time = (ms: number | null) =>
  ms === null ? "" : new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Shown when even the data-only answer couldn't be saved (very rare). Same soft card as
// a normal fallback, so the person always has a next step.
const SOFT_ERROR: ReplyCard = {
  kind: "degraded",
  intro: "I couldn't finish that just now. Your forecast is safe and up to date. Try again in a moment, or open one of the outlook pages.",
  factors: [],
  netImpact: null,
  scopes: [],
  followUps: [],
  usedFallback: true,
};

// The AI Pass chat. `threadId` null = a new chat (created on the first question).
export function AiPassChat({ threadId }: { threadId: string | null }) {
  const router = useRouter();
  const thread = useAiThread(threadId);
  const fresh = useQuery(api.aiPass.newChatContext, threadId ? "skip" : {});
  const { turns, waiting, loading, canLoadMore, loadMore } = useAiTurns(threadId);
  const actions = useAiActions();

  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // New chat: scope picked before the chat exists, applied when the first question creates it.
  const [pending, setPending] = useState<{ zone?: string; concept?: string; date?: string | null }>({});
  const [now, setNow] = useState(() => Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Ticks only while a reply is pending, to notice one that never arrives.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [waiting]);

  // Keep the newest message in view as replies arrive.
  const last = turns[turns.length - 1];
  const lastSignal = `${turns.length}:${last?.card ? "card" : last?.progress.length ?? 0}`;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [lastSignal]);

  const ctx = thread ?? fresh ?? null;
  const scope: Scope | null = useMemo(() => {
    if (!ctx) return null;
    if (thread) return { zone: thread.zone, concept: thread.concept, date: thread.date };
    return {
      zone: pending.zone ?? ctx.homeZone,
      concept: pending.concept ?? ctx.homeConcept,
      date: pending.date ?? ctx.today,
    };
  }, [ctx, thread, pending]);

  if ((threadId && thread === undefined) || (!threadId && fresh === undefined) || loading) {
    return <PageLoading label="Loading AI Pass…" />;
  }
  if (threadId && thread === null) {
    return (
      <div className={styles.page}>
        <h1 className={shared.title}>AI Pass</h1>
        <div className={styles.notFound} role="status">
          <p>This chat isn&apos;t available. It may have been deleted.</p>
          <Link href="/ai-pass" className={styles.softPrimary}>
            Start a new chat
          </Link>
        </div>
      </div>
    );
  }
  if (!ctx || !scope) return <PageLoading label="Loading AI Pass…" />;

  const stuck = Boolean(waiting && last?.askedAt && now - last.askedAt > STALE_MS && !thread?.running);
  const working = busy || (waiting && !stuck) || Boolean(thread?.running);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || working) return;
    if (question.length > MAX_CHARS) {
      setError(`Keep questions under ${MAX_CHARS} characters.`);
      return;
    }
    setError("");
    setBusy(true);
    setDraft("");
    try {
      let id = threadId;
      if (!id) {
        id = (await actions.createThread({})).threadId;
        if (Object.keys(pending).length > 0) await actions.setScope({ threadId: id, ...pending });
      }
      await actions.send({ threadId: id, prompt: question });
      if (!threadId) router.replace(`/ai-pass/${id}`);
    } catch (e) {
      setDraft(question); // give the question back so nothing is lost
      setError(errorText(e, "That didn't send. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function changeScope(patch: Partial<{ zone: string; concept: string; date: string | null }>) {
    setError("");
    if (threadId) {
      actions.setScope({ threadId, ...patch }).catch((e) => setError(errorText(e, "Couldn't change that.")));
    } else {
      setPending((p) => ({ ...p, ...patch }));
    }
  }

  function resetScope() {
    setError("");
    if (threadId) actions.resetScope({ threadId }).catch((e) => setError(errorText(e, "Couldn't change that.")));
    else setPending({});
  }

  return (
    <div className={styles.page}>
      <h1 className={shared.title}>AI Pass</h1>
      <p className={shared.subtitle}>Ask ForeShift about demand, staffing, events, and today&apos;s outlook.</p>

      <div className={styles.stream} role="log" aria-live="polite" aria-label="Conversation">
        {canLoadMore && (
          <button type="button" className={styles.loadMore} onClick={loadMore}>
            Show earlier messages
          </button>
        )}

        {turns.length === 0 && (
          <div className={styles.empty}>
            <AiAvatar />
            <p className={styles.emptyText}>
              Ask me anything about your forecast. I answer from the same numbers you see in Daily Outlook, Weekly
              Outlook, Events and Weather.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((q) => (
                <button key={q} type="button" className={styles.chip} disabled={working} onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <TurnView
            key={turn.order}
            turn={turn}
            isLast={i === turns.length - 1}
            stuck={stuck && i === turns.length - 1}
            disabled={working}
            onAsk={ask}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.inputArea}>
        <ScopeChips scope={scope} today={ctx.today} />
        <form
          className={styles.inputBar}
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <ScopeControls
            scope={scope}
            home={{ zone: ctx.homeZone, concept: ctx.homeConcept }}
            today={ctx.today}
            week={ctx.week}
            onChange={changeScope}
            onReset={resetScope}
            disabled={working}
          />
          <textarea
            ref={inputRef}
            className={styles.textarea}
            rows={1}
            maxLength={MAX_CHARS}
            placeholder="Ask AI Pass anything about today's operations..."
            aria-label="Your question"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
          />
          <button type="submit" className={styles.send} aria-label="Send message" disabled={working || !draft.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
            </svg>
          </button>
        </form>
        <p className={styles.fine}>
          AI Pass explains your forecast from your demand data. It can&apos;t see your sales, bookings or staffing.
        </p>
      </div>
    </div>
  );
}

function TurnView({
  turn,
  isLast,
  stuck,
  disabled,
  onAsk,
}: {
  turn: Turn;
  isLast: boolean;
  stuck: boolean;
  disabled: boolean;
  onAsk: (q: string) => void;
}) {
  const failed = turn.failed || stuck;
  return (
    <section className={styles.turn}>
      <div className={styles.userRow}>
        <div className={styles.userBubble}>{turn.question}</div>
        <span className={styles.userAvatar} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </span>
      </div>
      <div className={styles.timeRight}>{time(turn.askedAt)}</div>

      <div className={styles.aiRow}>
        <AiAvatar />
        <div className={styles.aiBody}>
          {turn.card ? (
            <ReplyCardView card={turn.card} isLast={isLast && !disabled} onAsk={onAsk} retryQuestion={turn.question} />
          ) : failed ? (
            <ReplyCardView card={SOFT_ERROR} isLast={false} onAsk={onAsk} retryQuestion={turn.question} />
          ) : (
            <div className={styles.thinking} role="status">
              <span className={styles.dots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>{turn.progress.length > 0 ? `${turn.progress[turn.progress.length - 1]}…` : "Reading your forecast…"}</span>
            </div>
          )}
          {turn.card && <div className={styles.timeLeft}>{time(turn.answeredAt)}</div>}
        </div>
      </div>
    </section>
  );
}
