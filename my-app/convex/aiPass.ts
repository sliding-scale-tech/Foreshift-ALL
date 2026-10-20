// AI Pass — the web app's chat with ForeShift. Threads and messages live in the
// Agent component; this file is the app-facing API around them.
//
//   createThread / listThreads / getThread / renameThread / deleteThread
//   setScope / resetScope   — the "Add context" chips (zone, restaurant type, day)
//   send                    — save the question and start the reply
//   listThreadMessages      — the chat history, with replies streaming in live
//
// Security: every function re-checks who is calling. A thread belongs to the
// Clerk user that created it; anyone else gets "Chat not found." (never "not
// yours", so ids can't be probed). Zone, restaurant type and day are validated
// against the vocabulary and this week, and the operator's own zone and type
// always come from their `operators` row, never from arguments.

import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { hasSuccessfulToolCall, listUIMessages, saveMessage, saveMessages, stepCountIs, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { computeAccess } from "./lib/access";
import { ZONES, CONCEPTS, detroitDate, keepKnown } from "./lib/vocab";
import { aiPassAgent } from "./lib/aiPass/agent";
import { aiPassFallbackModelName, aiPassModel, aiPassModelName, aiPassProviderOptions } from "./lib/aiPass/model";
import { TOTAL_BUDGET_MS, backoffMs, isPermanentError, planSteps } from "./lib/aiPass/retry";
import { SYSTEM_PROMPT, contextBlock } from "./lib/aiPass/prompt";
import { FactBag, degradedCard, type ReplyCard } from "./lib/aiPass/grounding";
import { makeTools } from "./lib/aiPass/tools";
import {
  conceptsNamedIn,
  nearMisses,
  effectiveDate,
  effectiveScope,
  weekCalendar,
  zonesNamedIn,
  type EffectiveScope,
} from "./lib/aiPass/scope";

// A reply that never finishes (crashed action) stops blocking its thread after this.
const RUN_LOCK_MS = 2 * 60 * 1000;
const MAX_QUESTION_CHARS = 600;
const MAX_TITLE_CHARS = 80;
const NEW_CHAT = "New chat";

// ---------------------------------------------------------------------------
// Who is calling
// ---------------------------------------------------------------------------

async function requireOperator(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in.");
  const op = await ctx.db
    .query("operators")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!op) throw new Error("Finish onboarding first.");
  const [zone] = keepKnown([op.zone], ZONES);
  const [concept] = keepKnown([op.conceptType], CONCEPTS);
  if (!zone || !concept) throw new Error("Your zone or restaurant type needs updating in Settings.");
  return { clerkId: identity.subject, op, zone, concept };
}

function requireAccess(op: Doc<"operators">) {
  const access = computeAccess({ createdAt: op._creationTime, subscriptionStatus: op.subscriptionStatus });
  if (!access.hasAccess) throw new Error("Your free trial has ended. Upgrade to keep using AI Pass.");
}

async function ownThread(ctx: QueryCtx, threadId: string, clerkId: string) {
  const t = await ctx.db
    .query("aiPassThreads")
    .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
    .unique();
  // Same message for "doesn't exist" and "isn't yours".
  if (!t || t.clerkId !== clerkId) throw new Error("Chat not found.");
  return t;
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export const createThread = mutation({
  args: {},
  handler: async (ctx): Promise<{ threadId: string }> => {
    const { clerkId, op, zone, concept } = await requireOperator(ctx);
    requireAccess(op);
    const { threadId } = await aiPassAgent().createThread(ctx, { userId: clerkId, title: NEW_CHAT });
    const now = Date.now();
    await ctx.db.insert("aiPassThreads", {
      threadId,
      clerkId,
      title: NEW_CHAT,
      zone,
      concept,
      date: null,
      createdAt: now,
      updatedAt: now,
    });
    return { threadId };
  },
});

export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("aiPassThreads")
      .withIndex("by_clerkId_and_updatedAt", (q) => q.eq("clerkId", identity.subject))
      .order("desc")
      .take(50);
    return rows.map((t) => ({ threadId: t.threadId, title: t.title, updatedAt: t.updatedAt }));
  },
});

/** What a brand-new chat starts from: the operator's own zone and type, today, and this week's days. */
export const newChatContext = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const op = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!op) return null;
    const { today, days } = weekCalendar();
    return { homeZone: op.zone, homeConcept: op.conceptType, today, week: days };
  },
});

/** The thread's scope for the chips, plus the operator's own scope to go back to. Null if not theirs. */
export const getThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const t = await ctx.db
      .query("aiPassThreads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .unique();
    if (!t || t.clerkId !== identity.subject) return null;
    const op = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    const scope = effectiveScope(t);
    const { today, days } = weekCalendar();
    return {
      threadId: t.threadId,
      title: t.title,
      // What the next answer will be about.
      zone: scope?.zone ?? t.zone,
      concept: scope?.concept ?? t.concept,
      date: scope?.date ?? today,
      pinnedDate: t.date,
      homeZone: op?.zone ?? t.zone,
      homeConcept: op?.conceptType ?? t.concept,
      today,
      week: days,
      running: t.runningSince !== undefined && Date.now() - t.runningSince < RUN_LOCK_MS,
    };
  },
});

export const renameThread = mutation({
  args: { threadId: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const { clerkId } = await requireOperator(ctx);
    const t = await ownThread(ctx, args.threadId, clerkId);
    const title = args.title.replace(/\s+/g, " ").trim();
    if (!title) throw new Error("A chat needs a name.");
    await ctx.db.patch("aiPassThreads", t._id, { title: clip(title, MAX_TITLE_CHARS) });
    return null;
  },
});

export const deleteThread = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const { clerkId } = await requireOperator(ctx);
    const t = await ownThread(ctx, args.threadId, clerkId);
    await aiPassAgent().deleteThreadAsync(ctx, { threadId: args.threadId });
    await ctx.db.delete("aiPassThreads", t._id);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Scope chips
// ---------------------------------------------------------------------------

/** Pin a zone, restaurant type and/or day for the thread. Anything omitted is left as is. */
export const setScope = mutation({
  args: {
    threadId: v.string(),
    zone: v.optional(v.string()),
    concept: v.optional(v.string()),
    date: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { clerkId } = await requireOperator(ctx);
    const t = await ownThread(ctx, args.threadId, clerkId);
    const patch: Partial<Doc<"aiPassThreads">> = { updatedAt: Date.now() };

    if (args.zone !== undefined) {
      const [zone] = keepKnown([args.zone], ZONES);
      if (!zone) throw new Error("Unknown zone.");
      patch.zone = zone;
      patch.focusZone = undefined; // an explicit choice replaces whatever a question set
    }
    if (args.concept !== undefined) {
      const [concept] = keepKnown([args.concept], CONCEPTS);
      if (!concept) throw new Error("Unknown restaurant type.");
      patch.concept = concept;
      patch.focusConcept = undefined;
    }
    if (args.date !== undefined) {
      if (args.date !== null && effectiveDate(args.date) !== args.date) {
        throw new Error("Pick a day from this week.");
      }
      patch.date = args.date;
    }
    await ctx.db.patch("aiPassThreads", t._id, patch);
    return null;
  },
});

/** Back to the operator's own zone and restaurant type, today. */
export const resetScope = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const { clerkId, zone, concept } = await requireOperator(ctx);
    const t = await ownThread(ctx, args.threadId, clerkId);
    await ctx.db.patch("aiPassThreads", t._id, {
      zone,
      concept,
      date: null,
      focusZone: undefined,
      focusConcept: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Asking
// ---------------------------------------------------------------------------

/** Save the question and start the reply. The reply streams into listThreadMessages. */
export const send = mutation({
  args: { threadId: v.string(), prompt: v.string() },
  handler: async (ctx, args): Promise<{ messageId: string }> => {
    const { clerkId, op } = await requireOperator(ctx);
    requireAccess(op);
    const t = await ownThread(ctx, args.threadId, clerkId);

    const question = args.prompt.replace(/\s+/g, " ").trim();
    if (!question) throw new Error("Type a question first.");
    if (question.length > MAX_QUESTION_CHARS) throw new Error(`Keep questions under ${MAX_QUESTION_CHARS} characters.`);
    if (t.runningSince !== undefined && Date.now() - t.runningSince < RUN_LOCK_MS) {
      throw new Error("Still working on your last question.");
    }

    // A question that names one zone / restaurant type moves the conversation
    // there, so follow-ups ("what about lunch?") stay on it.
    const zones = zonesNamedIn(question);
    const concepts = conceptsNamedIn(question);
    const now = Date.now();
    const patch: Partial<Doc<"aiPassThreads">> = { runningSince: now, updatedAt: now };
    if (zones.length === 1) patch.focusZone = zones[0];
    if (concepts.length === 1) patch.focusConcept = concepts[0];
    if (t.title === NEW_CHAT) patch.title = clip(question, 40);
    await ctx.db.patch("aiPassThreads", t._id, patch);

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: clerkId,
      prompt: question,
    });
    await bumpUsage(ctx, clerkId, { questions: 1 });
    await ctx.scheduler.runAfter(0, internal.aiPass.generateReply, {
      threadId: args.threadId,
      promptMessageId: messageId,
      prompt: question,
    });
    return { messageId };
  },
});

export const listThreadMessages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator, streamArgs: vStreamArgs },
  handler: async (ctx, args) => {
    const { clerkId } = await requireOperator(ctx);
    await ownThread(ctx, args.threadId, clerkId);
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});

// ---------------------------------------------------------------------------
// Generating the reply (internal)
// ---------------------------------------------------------------------------

export const runContext = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("aiPassThreads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .unique();
    if (!thread) return null;
    const op = await ctx.db
      .query("operators")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", thread.clerkId))
      .unique();
    if (!op) return null;
    return { thread, restaurantName: op.restaurantName, homeZone: op.zone, homeConcept: op.conceptType };
  },
});

export const finishRun = internalMutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const t = await ctx.db
      .query("aiPassThreads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .unique();
    if (t) await ctx.db.patch("aiPassThreads", t._id, { runningSince: undefined, updatedAt: Date.now() });
    return null;
  },
});

type ReplyArgs = {
  threadId: string;
  clerkId: string;
  promptMessageId: string;
  prompt: string;
  scope: EffectiveScope;
  restaurantName: string;
  homeZone: string;
  homeConcept: string;
};

/** One try with one model: the model calls the data tools, then `reply`. Streams into the thread. */
async function attemptReply(ctx: ActionCtx, a: ReplyArgs, modelName: string): Promise<FactBag> {
  const bag = new FactBag();
  const tools = makeTools({
    clerkId: a.clerkId,
    scope: a.scope,
    named: { zones: new Set(zonesNamedIn(a.prompt)), concepts: new Set(conceptsNamedIn(a.prompt)) },
    bag,
  });
  const system =
    SYSTEM_PROMPT +
    contextBlock({
      restaurantName: a.restaurantName,
      homeZone: a.homeZone,
      homeConcept: a.homeConcept,
      scope: a.scope,
      unconfirmed: nearMisses(a.prompt),
    });

  // The stream reports failures through onError instead of throwing; keep the real
  // error so runReply can tell a transient failure (retry) from a permanent one (move on).
  const failure: { error?: unknown } = {};

  const result = await aiPassAgent().streamText(
    ctx,
    { threadId: a.threadId, userId: a.clerkId },
    {
      promptMessageId: a.promptMessageId,
      model: aiPassModel(modelName),
      onError: (e: unknown) => {
        failure.error = (e as { error?: unknown } | null)?.error ?? e;
      },
      system,
      tools,
      // Every step must call a tool; the answer is the `reply` tool, so we stop when it succeeds.
      toolChoice: "required",
      stopWhen: [hasSuccessfulToolCall("reply"), stepCountIs(4)],
      // Last allowed step: only `reply` is on the table, so a long tool chase still ends in an answer.
      prepareStep: ({ stepNumber }) =>
        stepNumber >= 3 ? { toolChoice: { type: "tool", toolName: "reply" }, activeTools: ["reply"] } : undefined,
      temperature: 0.2,
      maxOutputTokens: 1200,
      providerOptions: aiPassProviderOptions(modelName),
      // Retries are ours (runReply), so the counts and pauses are exactly what the plan says.
      maxRetries: 0,
    },
    { saveStreamDeltas: { chunking: "word", throttleMs: 150 } },
  );
  await result.consumeStream();
  // A stream that ends without the answer (an error mid-stream) counts as a failed try.
  if (!bag.calls.includes("reply")) {
    if (failure.error instanceof Error) throw failure.error;
    // Keep the original on `cause` so isPermanentError can still read its status code.
    throw new Error("The model ended without an answer.", { cause: failure.error });
  }
  return bag;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type ReplyOutcome = {
  bag: FactBag | null;
  /** The model that answered; null when every try failed and a data-only answer was saved. */
  model: string | null;
  tries: { model: string; ok: boolean; error?: string }[];
};

/**
 * The reply with recovery: the main model (first try + 3 retries), then a Pro
 * model (2 tries), then, if all of that failed, a data-only answer from the
 * forecast itself (saved as the reply, so the chat never ends on an error).
 */
async function runReply(ctx: ActionCtx, a: ReplyArgs, models?: { primary?: string; fallback?: string }): Promise<ReplyOutcome> {
  const steps = planSteps(models?.primary ?? aiPassModelName(), models?.fallback ?? aiPassFallbackModelName());
  const tries: ReplyOutcome["tries"] = [];
  const started = Date.now();

  for (const step of steps) {
    for (let attempt = 1; attempt <= step.tries; attempt++) {
      if (Date.now() - started > TOTAL_BUDGET_MS) break;
      await sleep(backoffMs(attempt));
      try {
        const bag = await attemptReply(ctx, a, step.model);
        tries.push({ model: step.model, ok: true });
        return { bag, model: step.model, tries };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        tries.push({ model: step.model, ok: false, error: message.slice(0, 200) });
        console.error(`[aiPass] ${step.model} try ${attempt}/${step.tries} failed:`, message);
        if (isPermanentError(err)) break; // retrying the same model can't help
      }
    }
  }

  await saveDegradedReply(ctx, a);
  return { bag: null, model: null, tries };
}

/** Save a card as the reply, stored exactly like a normal one (a `reply` tool call and its result). */
async function saveReplyCard(
  ctx: ActionCtx,
  a: { threadId: string; clerkId: string; promptMessageId: string },
  card: ReplyCard,
) {
  const toolCallId = `fallback-${Date.now()}`;
  await saveMessages(ctx, components.agent, {
    threadId: a.threadId,
    userId: a.clerkId,
    promptMessageId: a.promptMessageId,
    messages: [
      { role: "assistant", content: [{ type: "tool-call", toolCallId, toolName: "reply", input: card }] },
      { role: "tool", content: [{ type: "tool-result", toolCallId, toolName: "reply", output: { type: "json", value: card } }] },
    ],
  });
}

/** Last resort: the forecast for the scope, built without the AI, saved as the reply. */
async function saveDegradedReply(ctx: ActionCtx, a: ReplyArgs) {
  let card: ReplyCard;
  try {
    const res = await ctx.runQuery(internal.aiPassData.dayData, {
      zone: a.scope.zone,
      concept: a.scope.concept,
      date: a.scope.date,
      clerkId: a.clerkId,
    });
    const peak = (res.model as { peak?: { daypart?: string } }).peak;
    card = degradedCard(res.bag ? { ...res.bag, peakDaypart: peak?.daypart } : null);
  } catch {
    card = degradedCard(null);
  }
  await saveReplyCard(ctx, a, card);
}

export const generateReply = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string(), prompt: v.string() },
  handler: async (ctx, args) => {
    const rc = await ctx.runQuery(internal.aiPass.runContext, { threadId: args.threadId });
    if (!rc) return null;
    try {
      const scope = effectiveScope(rc.thread);
      if (!scope) throw new Error("This chat's zone or restaurant type is no longer valid.");
      await runReply(ctx, {
        threadId: args.threadId,
        clerkId: rc.thread.clerkId,
        promptMessageId: args.promptMessageId,
        prompt: args.prompt,
        scope,
        restaurantName: rc.restaurantName,
        homeZone: rc.homeZone,
        homeConcept: rc.homeConcept,
      });
    } catch (err) {
      // Not a model failure (e.g. the thread's scope is no longer valid): still end on a friendly reply.
      console.error("[aiPass] reply failed:", err instanceof Error ? err.message : err);
      try {
        await saveReplyCard(
          ctx,
          { threadId: args.threadId, clerkId: rc.thread.clerkId, promptMessageId: args.promptMessageId },
          degradedCard(null),
        );
      } catch {
        /* the chat shows its own error row if even this fails */
      }
    } finally {
      await ctx.runMutation(internal.aiPass.finishRun, { threadId: args.threadId });
    }
    return null;
  },
});

/**
 * Ask one question the way the chat would and return the card, the tools called
 * and the time taken. For testing from the CLI (internal: no browser can call it):
 *   npx convex run aiPass:evalAsk '{"question":"Why is dinner busy tonight?","zone":"Midtown","concept":"Coffee Shop"}'
 * Pass `threadId` from a previous call to test follow-ups; `keep: true` keeps the thread.
 */
export const evalAsk = internalAction({
  args: {
    question: v.string(),
    zone: v.string(),
    concept: v.string(),
    date: v.optional(v.union(v.string(), v.null())),
    threadId: v.optional(v.string()),
    keep: v.optional(v.boolean()),
    // Override the models to test the retry / Pro fallback / data-only paths.
    primaryModel: v.optional(v.string()),
    fallbackModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [zone] = keepKnown([args.zone], ZONES);
    const [concept] = keepKnown([args.concept], CONCEPTS);
    if (!zone || !concept) throw new Error("Unknown zone or restaurant type.");
    const clerkId = "eval";
    const agent = aiPassAgent();
    const threadId = args.threadId ?? (await agent.createThread(ctx, { userId: clerkId, title: "eval" })).threadId;
    const { messageId } = await saveMessage(ctx, components.agent, { threadId, userId: clerkId, prompt: args.question });

    // The same scope rules as `send`: a question that names a zone / type moves the focus.
    const zones = zonesNamedIn(args.question);
    const concepts = conceptsNamedIn(args.question);
    const scope = effectiveScope({
      zone,
      concept,
      date: args.date ?? null,
      ...(zones.length === 1 ? { focusZone: zones[0] } : {}),
      ...(concepts.length === 1 ? { focusConcept: concepts[0] } : {}),
    });
    if (!scope) throw new Error("Bad scope.");

    const started = Date.now();
    const outcome = await runReply(
      ctx,
      {
        threadId,
        clerkId,
        promptMessageId: messageId,
        prompt: args.question,
        scope,
        restaurantName: "Eval Kitchen",
        homeZone: zone,
        homeConcept: concept,
      },
      { primary: args.primaryModel, fallback: args.fallbackModel },
    );
    const ms = Date.now() - started;

    const page = await listUIMessages(ctx, components.agent, { threadId, paginationOpts: { numItems: 20, cursor: null } });
    let card: unknown = null;
    for (const m of page.page) {
      for (const part of m.parts as { type: string; state?: string; output?: unknown }[]) {
        if (part.type === "tool-reply" && part.state === "output-available") card = part.output;
      }
    }
    if (!args.keep) await agent.deleteThreadSync(ctx, { threadId });
    return {
      threadId: args.keep ? threadId : null,
      ms,
      scopeUsed: scope,
      toolCalls: outcome.bag?.calls ?? [],
      answeredBy: outcome.model,
      tries: outcome.tries,
      card,
    };
  },
});

// ---------------------------------------------------------------------------
// Usage (logging only in v1: no cap)
// ---------------------------------------------------------------------------

async function bumpUsage(
  ctx: MutationCtx,
  clerkId: string,
  add: { questions?: number; inputTokens?: number; outputTokens?: number; cachedInputTokens?: number; reasoningTokens?: number },
) {
  const day = detroitDate();
  const row = await ctx.db
    .query("aiPassUsage")
    .withIndex("by_clerkId_and_day", (q) => q.eq("clerkId", clerkId).eq("day", day))
    .unique();
  if (!row) {
    await ctx.db.insert("aiPassUsage", {
      clerkId,
      day,
      questions: add.questions ?? 0,
      inputTokens: add.inputTokens ?? 0,
      outputTokens: add.outputTokens ?? 0,
      cachedInputTokens: add.cachedInputTokens ?? 0,
      reasoningTokens: add.reasoningTokens ?? 0,
    });
    return;
  }
  await ctx.db.patch("aiPassUsage", row._id, {
    questions: row.questions + (add.questions ?? 0),
    inputTokens: row.inputTokens + (add.inputTokens ?? 0),
    outputTokens: row.outputTokens + (add.outputTokens ?? 0),
    cachedInputTokens: row.cachedInputTokens + (add.cachedInputTokens ?? 0),
    reasoningTokens: row.reasoningTokens + (add.reasoningTokens ?? 0),
  });
}

export const recordUsage = internalMutation({
  args: {
    clerkId: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cachedInputTokens: v.number(),
    reasoningTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const { clerkId, ...tokens } = args;
    await bumpUsage(ctx, clerkId, tokens);
    return null;
  },
});
