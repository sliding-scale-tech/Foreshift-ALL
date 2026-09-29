"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ZONES, CONCEPTS } from "my-app/convex/lib/vocab";
import { OutlookBody } from "@/app/components/DailyOutlookBody";
import { PageLoading } from "@/app/components/PageLoading";
import { useSampleOutlook } from "@/app/hooks/useSampleOutlook";
import shared from "@/app/(app)/shared.module.css";
import layout from "@/app/(app)/layout.module.css";
import styles from "./sample.module.css";

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

// Public preview of the Daily Outlook: a random concept in a random zone
// (new pick every visit), shown exactly as a signed-in operator would see it,
// with a banner making clear it's a sample and pointing to sign-in.
export default function SampleOutlookPage() {
  // Picked after mount — Math.random() during render would differ between
  // the server render and the browser and break hydration.
  const [sample, setSample] = useState<{ zone: string; concept: string } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSample({ zone: pick(ZONES), concept: pick(CONCEPTS) });
  }, []);

  return (
    <div className={layout.shell}>
      <main className={layout.main}>
        {sample ? (
          <Sample zone={sample.zone} concept={sample.concept} />
        ) : (
          <PageLoading label="Preparing a sample forecast…" />
        )}
      </main>
    </div>
  );
}

function Sample({ zone, concept }: { zone: string; concept: string }) {
  const outlook = useSampleOutlook(zone, concept);

  return (
    <>
      <div className={styles.sampleBar} role="note">
        <div>
          <span className={styles.tag}>Sample</span>
          This is a sample outlook for a {concept} in {zone}. Sign in to see the forecast for your own
          business.
        </div>
        <Link href="/sign-in" className={styles.cta}>
          Sign in
        </Link>
      </div>

      {outlook.status === "loading" && <PageLoading label="Preparing a sample forecast…" />}
      {outlook.status === "error" && (
        <p className={`${shared.status} ${shared.statusError}`} role="alert">
          {outlook.message}
        </p>
      )}
      {outlook.status === "ready" && (
        <>
          <h1 className={shared.title}>Sample Demand Forecast</h1>
          <p className={shared.subtitle}>
            {formatDate(outlook.date)} - {zone} - {concept}
          </p>
          <OutlookBody data={outlook.data} />
        </>
      )}
    </>
  );
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
