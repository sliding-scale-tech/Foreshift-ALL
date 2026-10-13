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

/**
 * Earlier turns for the model: user questions as they were, each earlier answer
 * as one line of text, and no tool calls or tool results (they're large and the
 * model will fetch fresh data for the new question anyway).
 */
export function compactHistory(messages: ModelMessage[]): ModelMessage[] {
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
        if (part.type === "tool-call" && part.toolName === "reply" && part.input && typeof part.input === "object") {
          lines.push(cardLine(part.input as Record<string, unknown>));
        }
      }
      if (lines.length) out.push({ role: "assistant", content: lines.join("\n") });
    }
  }
  return out;
}
