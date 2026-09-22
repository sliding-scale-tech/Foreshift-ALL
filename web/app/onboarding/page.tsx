"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import { ZONES, DAYS, type Concept } from "my-app/convex/lib/vocab";
import { RedirectToSignIn, Show } from "@clerk/nextjs";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { AddressInput } from "@/app/components/AddressInput";
import { useZoneAutofill, type ZoneNote } from "@/app/hooks/useZoneAutofill";
import { SameTimingsModal } from "@/app/components/SameTimingsModal";
import { ZoneFinderModal } from "@/app/components/ZoneFinderModal";
import { TIME_SLOTS } from "@/app/lib/hours";
import {
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IllustrationRestaurant,
  IllustrationExplore,
  IllustrationSuccess,
  IconFineDining,
  IconUpscaleCasual,
  IconCasualDining,
  IconFastCasual,
  IconCoffeeShop,
  IconBrunchCafe,
  IconSportsBar,
  IconCocktailLounge,
  IconCasualBar,
} from "@/app/components/icons";
import styles from "./onboarding.module.css";

// Display order matching the ForeShift mockup — CONCEPTS itself (imported
// from vocab.ts) is alphabetical, since that's the canonical source of truth
// for spelling; this is presentation-only and carries the same values.
const CONCEPT_DISPLAY_ORDER: Concept[] = [
  "Fine Dining",
  "Upscale Casual",
  "Casual Dining",
  "Fast Casual",
  "Coffee Shop",
  "Breakfast / Brunch Cafe",
  "Sports Bar",
  "Cocktail Lounge",
  "Neighborhood / Casual Bar",
];

const CONCEPT_ICONS: Record<Concept, React.ComponentType> = {
  "Fine Dining": IconFineDining,
  "Upscale Casual": IconUpscaleCasual,
  "Casual Dining": IconCasualDining,
  "Fast Casual": IconFastCasual,
  "Coffee Shop": IconCoffeeShop,
  "Breakfast / Brunch Cafe": IconBrunchCafe,
  "Sports Bar": IconSportsBar,
  "Cocktail Lounge": IconCocktailLounge,
  "Neighborhood / Casual Bar": IconCasualBar,
};

type DayHours = {
  day: (typeof DAYS)[number];
  openTime: string;
  closeTime: string;
};

const STEPS = ["Signup Choice", "Restaurant Info", "Operating Hours"] as const;

export default function OnboardingPage() {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <OnboardingGate />
      </Show>
    </>
  );
}

// Already-onboarded users shouldn't be able to re-run this flow.
function OnboardingGate() {
  const { hasOnboarded, isLoading } = useMyOperator();
  const router = useRouter();

  if (isLoading) return null;
  if (hasOnboarded) {
    router.replace("/dashboard");
    return null;
  }
  return <OnboardingWizard />;
}

function OnboardingWizard() {
  const router = useRouter();
  const createOperator = useMutation(api.operators.create);

  // 4 = the "You are all set!" success screen after onboarding is saved —
  // not one of STEPS, just renders the stepper with everything checked off.
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [restaurantName, setRestaurantName] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState("");
  const [conceptType, setConceptType] = useState("");

  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map((day) => ({ day, openTime: "", closeTime: "" })),
  );
  const [sameModalOpen, setSameModalOpen] = useState(false);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { zoneNote, onAddressPicked, onManualZone, onModalFound } = useZoneAutofill(setZone);

  const step2Valid = restaurantName.trim() && address.trim() && zone && conceptType;

  async function handleFinish() {
    setError("");
    setSubmitting(true);
    try {
      await createOperator({
        restaurantName: restaurantName.trim(),
        address: address.trim(),
        zone,
        conceptType,
        operatingHours: hours.map((h) => ({
          day: h.day,
          isClosed: !h.openTime || !h.closeTime,
          openTime: h.openTime || undefined,
          closeTime: h.closeTime || undefined,
        })),
      });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateDay(day: string, patch: Partial<DayHours>) {
    setHours((hs) => hs.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.logo}>
        Fore<span>Shift</span>
      </div>

      <Stepper step={step} />

      <div className={styles.card}>
        {step === 1 && <StepChoice onPickRestaurant={() => setStep(2)} />}

        {step === 2 && (
          <StepRestaurantInfo
            restaurantName={restaurantName}
            setRestaurantName={setRestaurantName}
            address={address}
            setAddress={setAddress}
            zone={zone}
            setZone={onManualZone}
            zoneNote={zoneNote}
            onAddressPicked={onAddressPicked}
            conceptType={conceptType}
            setConceptType={setConceptType}
            valid={Boolean(step2Valid)}
            onOpenZoneFinder={() => setZoneModalOpen(true)}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepOperatingHours
            hours={hours}
            updateDay={updateDay}
            onBack={() => setStep(2)}
            onOpenSameTimings={() => setSameModalOpen(true)}
            onContinue={handleFinish}
            submitting={submitting}
            error={error}
          />
        )}

        {step === 4 && <StepDone onViewDashboard={() => router.push("/dashboard")} />}
      </div>

      {zoneModalOpen && (
        <ZoneFinderModal
          initialAddress={address}
          onClose={() => setZoneModalOpen(false)}
          onFound={(foundZone, typedAddress) => {
            onModalFound(foundZone);
            if (!address.trim()) setAddress(typedAddress);
            setZoneModalOpen(false);
          }}
        />
      )}

      {sameModalOpen && (
        <SameTimingsModal
          onClose={() => setSameModalOpen(false)}
          onApply={(from, to, days) => {
            setHours((hs) =>
              hs.map((h) =>
                days.includes(h.day) ? { ...h, openTime: from, closeTime: to } : h,
              ),
            );
            setSameModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className={styles.stepper}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "";
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`${styles.stepItem} ${state ? styles[state] : ""}`}>
              <span className={styles.stepCircle}>{n < step ? <IconCheck /> : n}</span>
              {label}
            </div>
            {i < STEPS.length - 1 && <div className={styles.stepLine} />}
          </div>
        );
      })}
    </div>
  );
}

function StepChoice({ onPickRestaurant }: { onPickRestaurant: () => void }) {
  return (
    <>
      <div className={styles.choiceGrid}>
        <div className={styles.choiceCard}>
          <div className={styles.choiceIllustration}>
            <IllustrationRestaurant />
          </div>
          <h2>I run a restaurant</h2>
          <p>Get instant demand insight for my venue</p>
          <button type="button" className={styles.choiceBtn} onClick={onPickRestaurant}>
            Continue to Venue Setup
          </button>
        </div>

        <div className={`${styles.choiceCard} ${styles.disabled}`}>
          <div className={styles.choiceIllustration}>
            <IllustrationExplore />
          </div>
          <div className={styles.choiceTitleRow}>
            <h2>I&apos;m exploring</h2>
            <span className={styles.comingSoon}>Coming soon</span>
          </div>
          <p>Check demand before I commit</p>
          <button type="button" className={styles.choiceBtn} disabled>
            Continue to Zone Explorer
          </button>
        </div>
      </div>
    </>
  );
}

function StepDone({ onViewDashboard }: { onViewDashboard: () => void }) {
  return (
    <div className={styles.doneWrap}>
      <div className={styles.doneIllustration}>
        <IllustrationSuccess />
      </div>
      <h1 className={styles.doneTitle}>You are all set!</h1>
      <p className={styles.doneSubtitle}>View your demand forecast</p>
      <button type="button" className={styles.choiceBtn} onClick={onViewDashboard}>
        View Demand Score
      </button>
    </div>
  );
}

function StepRestaurantInfo(props: {
  restaurantName: string;
  setRestaurantName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  zone: string;
  setZone: (v: string) => void;
  zoneNote: ZoneNote;
  onAddressPicked: (address: string) => void;
  conceptType: string;
  setConceptType: (v: string) => void;
  valid: boolean;
  onOpenZoneFinder: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div className={styles.cardHead}>
        <h1>Restaurant Information</h1>
        <p>Add details of your restaurant</p>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.label}>Restaurant Name</span>
        </div>
        <input
          className={styles.input}
          value={props.restaurantName}
          onChange={(e) => props.setRestaurantName(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.label}>Address</span>
        </div>
        <AddressInput
          className={styles.input}
          placeholder="Start typing..."
          value={props.address}
          onChange={props.setAddress}
          onSelect={props.onAddressPicked}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.label}>
            Zone<span className={styles.req}>*</span>
          </span>
          <button type="button" className={styles.hintBtn} onClick={props.onOpenZoneFinder}>
            Need help identifying your zone?
          </button>
        </div>
        <select
          className={styles.select}
          value={props.zone}
          onChange={(e) => props.setZone(e.target.value)}
        >
          <option value="">Choose an option...</option>
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        {props.zoneNote && (
          <p
            className={`${styles.zoneNote} ${props.zoneNote.kind === "warn" ? styles.zoneNoteWarn : ""}`}
            role={props.zoneNote.kind === "warn" ? "alert" : "status"}
          >
            {props.zoneNote.text}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.label}>
            Concept Type<span className={styles.req}>*</span>
          </span>
        </div>
        <div className={styles.conceptGrid}>
          {CONCEPT_DISPLAY_ORDER.map((c) => {
            const Icon = CONCEPT_ICONS[c];
            const selected = props.conceptType === c;
            return (
              <button
                type="button"
                key={c}
                className={`${styles.conceptCard} ${selected ? styles.selected : ""}`}
                onClick={() => props.setConceptType(c)}
              >
                <Icon />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.footerRow}>
        <button
          type="button"
          className={styles.continueBtn}
          disabled={!props.valid}
          onClick={props.onContinue}
        >
          Continue
          <IconArrowRight />
        </button>
      </div>
    </>
  );
}

function StepOperatingHours(props: {
  hours: DayHours[];
  updateDay: (day: string, patch: Partial<DayHours>) => void;
  onBack: () => void;
  onOpenSameTimings: () => void;
  onContinue: () => void;
  submitting: boolean;
  error: string;
}) {
  return (
    <>
      <div className={styles.hoursHead}>
        <div className={styles.cardHead} style={{ marginBottom: 0 }}>
          <h1 style={{ marginBottom: 4 }}>Operating Hours</h1>
          <p style={{ marginBottom: 0 }}>Add operating hours of your restaurant</p>
        </div>
        <button type="button" className={styles.sameTimingsLink} onClick={props.onOpenSameTimings}>
          Same timings?
        </button>
      </div>

      {props.hours.map((h) => (
        <div className={styles.hourRow} key={h.day}>
          <span className={styles.dayLabel}>{h.day}</span>
          <select
            className={styles.select}
            value={h.openTime}
            onChange={(e) => props.updateDay(h.day, { openTime: e.target.value })}
          >
            <option value="">Choose an option...</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className={styles.toLabel}>to</span>
          <select
            className={styles.select}
            value={h.closeTime}
            onChange={(e) => props.updateDay(h.day, { closeTime: e.target.value })}
          >
            <option value="">Choose an option...</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      ))}

      {props.error && <p className={styles.error}>{props.error}</p>}

      <div className={styles.footerRow}>
        <button type="button" className={styles.backBtn} onClick={props.onBack}>
          <IconArrowLeft />
          Back
        </button>
        <button
          type="button"
          className={styles.continueBtn}
          onClick={props.onContinue}
          disabled={props.submitting}
        >
          {props.submitting ? "Saving…" : "Continue"}
          <IconArrowRight />
        </button>
      </div>
    </>
  );
}
