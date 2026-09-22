"use client";

import { PageLoading } from "@/app/components/PageLoading";
import { UpgradeGate } from "@/app/components/UpgradeGate";
import { useAccess } from "@/app/hooks/useAccess";

// Gates the four Intelligence pages (Daily/Weekly/Events/Weather Outlook)
// behind the one-week trial / paid subscription (lib/access.ts on the
// server; this just renders what it says). Settings, Billing, FAQS and
// Feedback Loop live outside this group, so they're never gated — Billing in
// particular has to stay reachable so an expired operator can upgrade.
export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, access } = useAccess();

  if (isLoading || !access) return <PageLoading label="Loading your account…" />;
  if (!access.hasAccess) return <UpgradeGate access={access} />;
  return <>{children}</>;
}
