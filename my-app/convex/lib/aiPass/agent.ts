// The AI Pass agent: Gemini through the Convex Agent component, which stores the
// thread and its messages and streams replies to the browser.
//
// Two hooks keep it cheap and consistent:
//   contextHandler — what the model sees of earlier turns. Raw tool data is not
//     replayed; each earlier answer becomes one short line, so a follow-up
//     ("what about lunch?") keeps its context for a fraction of the tokens.
//   usageHandler   — token accounting per user per day (aiPass.recordUsage).

import { Agent } from "@convex-dev/agent";
import { components, internal } from "../../_generated/api";
import { aiPassModel } from "./model";
import { compactHistory } from "./history";

// How many earlier messages the model gets. Each is small once tool data is stripped.
export const RECENT_MESSAGES = 10;

export function aiPassAgent() {
  return new Agent(components.agent, {
    name: "AI Pass",
    languageModel: aiPassModel(),
    contextOptions: { recentMessages: RECENT_MESSAGES, excludeToolMessages: false },
    // The current turn is inputPrompt / existingResponses; only the older `recent` is compacted.
    contextHandler: async (_ctx, args) => [
      ...compactHistory(args.recent),
      ...args.inputMessages,
      ...args.inputPrompt,
      ...args.existingResponses,
    ],
    usageHandler: async (ctx, args) => {
      if (!args.userId) return;
      const u = args.usage;
      await ctx.runMutation(internal.aiPass.recordUsage, {
        clerkId: args.userId,
        inputTokens: u.inputTokens ?? 0,
        outputTokens: u.outputTokens ?? 0,
        cachedInputTokens: u.inputTokenDetails?.cacheReadTokens ?? 0,
        reasoningTokens: u.outputTokenDetails?.reasoningTokens ?? 0,
      });
    },
  });
}
