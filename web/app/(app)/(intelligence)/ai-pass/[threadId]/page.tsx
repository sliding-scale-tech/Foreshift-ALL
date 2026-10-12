"use client";

import { use } from "react";
import { AiPassChat } from "@/app/components/aiPass/AiPassChat";

// An existing chat. Its history is read from the server, so a reload or opening it
// later from the sidebar shows the same conversation.
export default function AiPassThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  return <AiPassChat key={threadId} threadId={threadId} />;
}
