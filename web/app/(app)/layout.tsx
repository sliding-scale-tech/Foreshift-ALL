"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RedirectToSignIn, Show } from "@clerk/nextjs";
import { Sidebar } from "@/app/components/Sidebar";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import styles from "./layout.module.css";

// Shared shell for every signed-in screen (Daily Outlook, Weekly Outlook,
// Settings, …): auth + onboarding gate, then the sidebar beside the page.
// The sidebar lives here, not in each page, so it stays consistent and
// doesn't remount as you navigate.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <RequireOnboarded>
          <div className={styles.shell}>
            <Sidebar />
            <main className={styles.main}>{children}</main>
          </div>
        </RequireOnboarded>
      </Show>
    </>
  );
}

// Signed in but never onboarded (e.g. a stale bookmark) — send them to
// onboarding instead of showing an empty app.
function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, hasOnboarded } = useMyOperator();

  useEffect(() => {
    if (!isLoading && !hasOnboarded) {
      router.replace("/onboarding");
    }
  }, [isLoading, hasOnboarded, router]);

  if (isLoading || !hasOnboarded) return null;
  return <>{children}</>;
}
