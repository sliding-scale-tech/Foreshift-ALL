"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/app/components/PageLoading";
import { useAccess } from "@/app/hooks/useAccess";

// Gates the Intelligence pages (Daily / Weekly / Events / Weather Outlook and
// AI Pass) behind the 7-day free trial or a paid plan (lib/access.ts on the
// server, which also refuses the data itself). Once the trial is over, the person
// is sent to Billing to pick a plan. Settings, Billing, FAQS, Contact Sales and
// Feedback Loop live outside this group, so they stay reachable.
export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, access } = useAccess();
  const router = useRouter();
  const blocked = Boolean(access && !access.hasAccess);

  useEffect(() => {
    if (blocked) router.replace("/billing?access=ended");
  }, [blocked, router]);

  if (isLoading || !access) return <PageLoading label="Loading your account…" />;
  if (blocked) return <PageLoading label="Taking you to Billing…" />;
  return <>{children}</>;
}
