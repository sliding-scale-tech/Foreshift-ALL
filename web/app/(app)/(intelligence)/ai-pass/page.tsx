import { AiPassChat } from "@/app/components/aiPass/AiPassChat";

// A new AI Pass chat. The chat itself is created when the first question is sent.
export default function AiPassPage() {
  return <AiPassChat threadId={null} />;
}
