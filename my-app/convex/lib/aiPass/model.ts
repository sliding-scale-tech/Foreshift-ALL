// Which Gemini models AI Pass talks to, and how they are configured for speed.
//
// Same key as the rest of the app (GEMINI_API_KEY). The main model is
// AI_PASS_MODEL, else GEMINI_MODEL (so it never drifts from what the outlook
// narration uses). When the main model keeps failing, AI Pass tries a Pro model:
// AI_PASS_FALLBACK_MODEL, else the "latest Pro" alias.

import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function aiPassModelName(): string {
  return process.env.AI_PASS_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

/** The Pro model used after the main one fails. */
export function aiPassFallbackModelName(): string {
  return process.env.AI_PASS_FALLBACK_MODEL ?? "gemini-pro-latest";
}

export function aiPassModel(name: string = aiPassModelName()) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Run: npx convex env set GEMINI_API_KEY <key>");
  }
  return createGoogleGenerativeAI({ apiKey })(name);
}

/**
 * Keep reasoning to a minimum: the data tools already did the thinking, and
 * thinking tokens are the slowest, most expensive part of a reply.
 *   2.x Flash: a token budget, 0 = off.     2.x Pro: thinking can't be off, 128 is the floor.
 *   3.x Flash: a level, "minimal" is the floor.   3.x / latest Pro: "low" is the floor.
 */
export function aiPassProviderOptions(name: string = aiPassModelName()) {
  const pro = /pro/.test(name);
  const legacy = /gemini-2\./.test(name);
  const thinkingConfig = legacy
    ? { thinkingBudget: pro ? 128 : 0 }
    : { thinkingLevel: pro ? ("low" as const) : ("minimal" as const) };
  return { google: { thinkingConfig } };
}
