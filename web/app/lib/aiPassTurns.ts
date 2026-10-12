// Turns the Agent component's stream of messages into the chat the person sees:
// one turn per question, each with the card that answered it (or the progress
// of getting there). Pure, so it can be tested on its own.
//
// A turn's messages share an `order`: the user's question, then the assistant's
// steps (data tool calls, then the `reply` tool whose output is the card). A
// try that failed (a model error before a retry or the Pro fallback succeeded)
// leaves a failed assistant message in the same turn; it is never shown when
// the turn has a card.

import type { ReplyCard } from "my-app/convex/lib/aiPass/grounding";

export type { ReplyCard };

type PartLike = { type: string; state?: string; output?: unknown; text?: string };

export type MessageLike = {
  key?: string;
  order: number;
  stepOrder: number;
  status: string;
  role: string;
  parts: PartLike[];
  text?: string;
  _creationTime?: number;
};

export type Turn = {
  order: number;
  question: string;
  askedAt: number | null;
  card: ReplyCard | null;
  answeredAt: number | null;
  /** Data tools the model has called so far, as short labels ("Checking the day's forecast"). */
  progress: string[];
  /** No card and nothing is still running for this turn. */
  failed: boolean;
};

const TOOL_LABEL: Record<string, string> = {
  "tool-get_day_outlook": "Checking the day's forecast",
  "tool-get_week_overview": "Looking at the week",
  "tool-list_events": "Finding nearby events",
  "tool-get_event_impact": "Measuring the event's impact",
  "tool-get_weather": "Checking the weather",
};

function cardOf(parts: PartLike[]): ReplyCard | null {
  for (const p of parts) {
    if (p.type === "tool-reply" && p.state === "output-available" && p.output && typeof p.output === "object") {
      return p.output as ReplyCard;
    }
  }
  return null;
}

function userText(m: MessageLike): string {
  if (typeof m.text === "string" && m.text) return m.text;
  return m.parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

export function groupTurns(messages: MessageLike[]): Turn[] {
  const byOrder = new Map<number, MessageLike[]>();
  for (const m of messages) {
    const list = byOrder.get(m.order) ?? [];
    list.push(m);
    byOrder.set(m.order, list);
  }

  const turns: Turn[] = [];
  for (const order of [...byOrder.keys()].sort((a, b) => a - b)) {
    const msgs = byOrder.get(order)!.sort((a, b) => a.stepOrder - b.stepOrder);
    const user = msgs.find((m) => m.role === "user");
    if (!user) continue;
    const assistants = msgs.filter((m) => m.role === "assistant");

    let card: ReplyCard | null = null;
    let answeredAt: number | null = null;
    for (const m of assistants) {
      const c = cardOf(m.parts);
      if (c) {
        card = c;
        answeredAt = m._creationTime ?? null;
      }
    }

    const progress: string[] = [];
    for (const m of assistants) {
      if (m.status === "failed") continue; // a failed try never counts as progress
      for (const p of m.parts) {
        const label = TOOL_LABEL[p.type];
        if (label && !progress.includes(label)) progress.push(label);
      }
    }

    const running = assistants.some((m) => m.status === "streaming" || m.status === "pending");
    const lastFailed = assistants.length > 0 && assistants.every((m) => m.status === "failed");
    turns.push({
      order,
      question: userText(user),
      askedAt: user._creationTime ?? null,
      card,
      answeredAt,
      progress,
      // Failed only when nothing is in flight and no card arrived.
      failed: !card && !running && lastFailed,
    });
  }
  return turns;
}

/** Is a reply still on its way? (the last turn has no card yet and hasn't failed) */
export function isWaiting(turns: Turn[]): boolean {
  const last = turns[turns.length - 1];
  return Boolean(last && !last.card && !last.failed);
}
