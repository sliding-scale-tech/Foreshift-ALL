// What the model sees of earlier turns. Pure (no Convex or AI imports) so it can
// be tested on its own.

import type { ModelMessage } from "ai";

type Part = { type: string; [key: string]: unknown };

/** One line standing in for an earlier `reply` card. */
function cardLine(input: Record<string, unknown>): string {
  const factors = Array.isArray(input.factors) ? (input.factors as { title?: string }[]) : [];
  const titles = factors.map((f) => f.title).filter(Boolean).join(", ");
  const net = typeof input.netImpact === "string" && input.netImpact ? ` Net: ${input.netImpact}` : "";
  const intro = typeof input.intro === "string" ? input.intro : "";
  return `[Earlier answer] ${intro}${titles ? ` Drivers: ${titles}.` : ""}${net}`.trim();
}

// The model gets the last 20 chat messages (your questions and its answers, about 10 exchanges).
export const MAX_HISTORY_MESSAGES = 20;

// A size cap on top of that, in characters (about 3k tokens).
// Oldest turns are dropped first, so what the person said recently, like their
// name, is what survives.
export const HISTORY_CHAR_BUDGET = 12_000;

const sizeOf = (m: ModelMessage) => (typeof m.content === "string" ? m.content.length : JSON.stringify(m.content).length);

/**
 * Earlier turns for the model: user questions as they were, each earlier answer
 * as one line of text, and no tool calls or tool results (they're large and the
 * model will fetch fresh data for the new question anyway).
 */
export function compactHistory(messages: ModelMessage[], budget: number = HISTORY_CHAR_BUDGET): ModelMessage[] {
  const out: ModelMessage[] = [];
  for (const m of messages) {
    if (m.role === "tool" || m.role === "system") continue;
    if (m.role === "user") {
      out.push(m);
      continue;
    }
    if (m.role === "assistant") {
      if (typeof m.content === "string") {
        if (m.content.trim()) out.push(m);
        continue;
      }
      const lines: string[] = [];
      for (const part of m.content as Part[]) {
        if (part.type === "text" && typeof part.text === "string" && part.text.trim()) lines.push(part.text);
        // The Agent stores a tool call's arguments as `args`; the AI SDK calls them `input`.
        const callInput = part.input ?? part.args;
        if (part.type === "tool-call" && part.toolName === "reply" && callInput && typeof callInput === "object") {
          lines.push(cardLine(callInput as Record<string, unknown>));
        }
      }
      if (lines.length) out.push({ role: "assistant", content: lines.join("\n") });
    }
  }

  // Newest first, at most MAX_HISTORY_MESSAGES, until the budget is used, then back to order. History must open
  // with the user, so a leading answer whose question was cut is dropped too.
  const kept: ModelMessage[] = [];
  let used = 0;
  for (let i = out.length - 1; i >= Math.max(0, out.length - MAX_HISTORY_MESSAGES); i--) {
    used += sizeOf(out[i]);
    if (used > budget && kept.length > 0) break;
    kept.unshift(out[i]);
  }
  while (kept.length > 0 && kept[0].role !== "user") kept.shift();
  return kept;
}
