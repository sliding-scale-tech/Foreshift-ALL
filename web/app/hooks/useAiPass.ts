"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { optimisticallySendMessage, useUIMessages } from "@convex-dev/agent/react";
import { api } from "my-app/convex/_generated/api";
import { groupTurns, isWaiting, type MessageLike } from "@/app/lib/aiPassTurns";
import { useStickyValue } from "./useStickyValue";

// AI Pass data: the chat list in the sidebar, one chat's scope, its messages
// (replies stream in live), and the actions. Everything is checked server-side
// against the signed-in user (convex/aiPass.ts); nothing here is trusted.

export type AiThreadSummary = { threadId: string; title: string; updatedAt: number };

/** The signed-in user's chats, newest first. `undefined` while loading. */
export function useAiThreads(): AiThreadSummary[] | undefined {
  const live = useQuery(api.aiPass.listThreads);
  return useStickyValue("aiPass:threads", live);
}

/** One chat's scope (what the next answer is about). null = not found / not yours. */
export function useAiThread(threadId: string | null) {
  return useQuery(api.aiPass.getThread, threadId ? { threadId } : "skip");
}

/** A chat's turns, with the reply's progress while it streams. */
export function useAiTurns(threadId: string | null) {
  const messages = useUIMessages(
    api.aiPass.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 30, stream: true },
  );
  const turns = useMemo(() => groupTurns((messages.results ?? []) as MessageLike[]), [messages.results]);
  return {
    turns,
    waiting: isWaiting(turns),
    loading: threadId !== null && messages.status === "LoadingFirstPage",
    canLoadMore: messages.status === "CanLoadMore",
    loadMore: () => messages.loadMore(30),
  };
}

export function useAiActions() {
  const createThread = useMutation(api.aiPass.createThread);
  const send = useMutation(api.aiPass.send).withOptimisticUpdate(optimisticallySendMessage(api.aiPass.listThreadMessages));
  const renameThread = useMutation(api.aiPass.renameThread);
  const deleteThread = useMutation(api.aiPass.deleteThread);
  const setScope = useMutation(api.aiPass.setScope);
  const resetScope = useMutation(api.aiPass.resetScope);
  return { createThread, send, renameThread, deleteThread, setScope, resetScope };
}

/** The reason a call failed, as a sentence for the person (Convex wraps server errors). */
export function errorText(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : "";
  // Convex prefixes server errors with request ids and "Uncaught Error:"; keep our own sentence.
  const m = msg.match(/Uncaught Error:\s*(.+?)(?:\n|$)/);
  const clean = (m?.[1] ?? msg).replace(/\[Request ID: [^\]]+\]\s*/, "").replace(/^Server Error\s*/, "").trim();
  return clean && clean.length < 200 ? clean : fallback;
}
