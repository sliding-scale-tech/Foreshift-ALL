"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import { ZONES, DAYS, type Concept } from "my-app/convex/lib/vocab";
import { RedirectToSignIn, Show } from "@clerk/nextjs";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { AddressInput } from "@/app/components/AddressInput";
import { DetectedArea } from "@/app/components/DetectedArea";
import { HoursEditor } from "@/app/components/HoursEditor";
import { Select } from "@/app/components/Select";
import { ZoneFinderModal } from "@/app/components/ZoneFinderModal";
import { addressError, useAreaDetection, type AreaDetection } from "@/app/hooks/useAreaDetection";
import { emptySchedule, isScheduleComplete, toSavedHours, type DayHours } from "@/app/lib/hours";
import { IconArrowRight, IconArrowLeft, IconCheck } from "@/app/components/icons";
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

// Icons exported from the Figma onboarding frame (public/onboarding/concepts).
// Figma uses one martini glass for both bar concepts.
const CONCEPT_ICONS: Record<Concept, string> = {
  "Fine Dining": "fine-dining",
  "Upscale Casual": "upscale-casual",
  "Casual Dining": "casual-dining",
  "Fast Casual": "fast-casual",
  "Coffee Shop": "coffee-shop",
  "Breakfast / Brunch Cafe": "brunch-cafe",
  "Sports Bar": "sports-bar",
  "Cocktail Lounge": "cocktail",
  "Neighborhood / Casual Bar": "cocktail",
};

// The PNGs are used as a mask so the colour follows the card state (grey,
// blue when selected) instead of whatever colour each source file has.
function ConceptIcon({ name }: { name: string }) {
  const url = `url(/onboarding/concepts/${name}.png)`;
  return <span className={styles.conceptIcon} style={{ maskImage: url, WebkitMaskImage: url }} aria-hidden="true" />;
}

// Shown only on the restaurant route, after the choice screen. "I'm
// exploring" skips venue details and operating hours (zone and concept are all
// the demand math needs), so it has no stepper.
const STEPS = ["Restaurant details", "Operating hours"] as const;

const ZONE_CHOICES = [{ value: "", label: "Choose an option..." }, ...ZONES.map((z) => ({ value: z, label: z }))];

type Mode = "restaurant" | "explorer";
type ZoneNote = { kind: "ok" | "warn"; text: string } | null;

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
  // Saving creates the operator, which flips hasOnboarded to true while the
  // "You're all set!" screen is still on the way. Without this the gate would
  // send the user to the dashboard first and they would never see it.
  const [finishing, setFinishing] = useState(false);

  if (isLoading) return null;
  if (hasOnboarded && !finishing) {
    router.replace("/dashboard");
    return null;
  }
  return <OnboardingWizard onFinishing={setFinishing} />;
}

function OnboardingWizard({ onFinishing }: { onFinishing: (finishing: boolean) => void }) {
  const router = useRouter();
  const createOperator = useMutation(api.operators.create);

  // 1 is the choice screen; the last number (4 for the restaurant branch, 3
  // for the shorter explorer one) is the "You're all set!" success screen.
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<Mode>("restaurant");

  // Everything lives here, not in the steps, so Back/Continue keep it.
  const [restaurantName, setRestaurantName] = useState("");
  const [address, setAddress] = useState("");
  const area = useAreaDetection();
  const [conceptType, setConceptType] = useState("");
  const [hours, setHours] = useState<DayHours[]>(() => emptySchedule(DAYS));

  // The explorer branch has no address: its zone is picked from the list.
  const [exploreZone, setExploreZone] = useState("");
  const [exploreNote, setExploreNote] = useState<ZoneNote>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleFinish() {
    // The steps already block this, but never save an incomplete profile.
    if (!area.zone || !isScheduleComplete(hours)) return;
    setError("");
    setSubmitting(true);
    onFinishing(true);
    try {
      await createOperator({
        restaurantName: restaurantName.trim(),
        address: address.trim(),
        zone: area.zone,
        conceptType,
        operatingHours: toSavedHours(hours),
      });
      setStep(4);
    } catch (err) {
      onFinishing(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Explorer branch: zone + concept only, restaurant details left blank.
  async function handleFinishExploring() {
    setError("");
    setSubmitting(true);
    onFinishing(true);
    try {
      await createOperator({ zone: exploreZone, conceptType });
      setStep(3);
    } catch (err) {
      onFinishing(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.logo}>
        Fore<span>Shift</span>
      </div>

      {mode === "restaurant" && (step === 2 || step === 3) && (
        <Stepper step={step - 1} steps={STEPS} />
      )}

      <div className={styles.card}>
        {step === 1 && (
          <StepChoice
            onPickRestaurant={() => {
              setMode("restaurant");
              setStep(2);
            }}
            onPickExploring={() => {
              setMode("explorer");
              setStep(2);
            }}
          />
        )}

        {step === 2 && mode === "explorer" && (
          <StepExploreZone
            zone={exploreZone}
            setZone={(z) => {
              setExploreZone(z);
              setExploreNote(null);
            }}
            zoneNote={exploreNote}
            conceptType={conceptType}
            setConceptType={setConceptType}
            valid={Boolean(exploreZone && conceptType)}
            onOpenZoneFinder={() => setZoneModalOpen(true)}
            onContinue={handleFinishExploring}
            submitting={submitting}
            error={error}
          />
        )}

        {step === 3 && mode === "explorer" && (
          <StepDone onViewDashboard={() => router.push("/dashboard")} />
        )}

        {step === 2 && mode === "restaurant" && (
          <StepRestaurantInfo
            restaurantName={restaurantName}
            setRestaurantName={setRestaurantName}
            address={address}
            setAddress={setAddress}
            area={area}
            conceptType={conceptType}
            setConceptType={setConceptType}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && mode === "restaurant" && (
          <StepOperatingHours
            hours={hours}
            setHours={setHours}
            onBack={() => setStep(2)}
            onFinish={handleFinish}
            submitting={submitting}
            error={error}
          />
        )}

        {step === 4 && <StepDone onViewDashboard={() => router.push("/dashboard")} />}
      </div>

      {zoneModalOpen && (
        <ZoneFinderModal
          initialAddress=""
          onClose={() => setZoneModalOpen(false)}
          onFound={(foundZone) => {
            setExploreZone(foundZone);
            setExploreNote({ kind: "ok", text: "Zone identified from your address." });
            setZoneModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Stepper({ step, steps }: { step: number; steps: readonly string[] }) {
  return (
    <div className={styles.stepper}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "";
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`${styles.stepItem} ${state ? styles[state] : ""}`}>
              <span className={styles.stepCircle}>{n < step ? <IconCheck /> : n}</span>
              {label}
            </div>
            {i < steps.length - 1 && <div className={styles.stepLine} />}
          </div>
        );
      })}
    </div>
  );
}

function StepChoice({
  onPickRestaurant,
  onPickExploring,
}: {
  onPickRestaurant: () => void;
  onPickExploring: () => void;
}) {
  return (
    <>
      <div className={styles.choiceHead}>
        <h1>How will you use ForeShift?</h1>
        <p>Set up your restaurant or explore demand by concept and location.</p>
      </div>
      <div className={styles.choiceGrid}>
        <div className={styles.choiceCard}>
          <div className={styles.choiceIllustration}>
            <Image src="/onboarding/choice-restaurant.png" alt="" width={384} height={256} unoptimized priority />
          </div>
          <h2>I run a restaurant</h2>
          <p>Understand upcoming demand to plan daily operations.</p>
          <button type="button" className={styles.choiceBtn} onClick={onPickRestaurant}>
            Set up my restaurant
          </button>
        </div>

        <div className={styles.choiceCard}>
          <div className={styles.choiceIllustration}>
            <Image src="/onboarding/choice-explore.png" alt="" width={836} height={470} unoptimized priority />
          </div>
          <h2>I&apos;m exploring opportunities</h2>
          <p>Explore demand for your restaurant concept across different locations.</p>
          <button type="button" className={styles.choiceBtn} onClick={onPickExploring}>
            Explore demand
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
        <Image src="/onboarding/all-set.png" alt="" width={604} height={306} unoptimized priority />
      </div>
      <h1 className={styles.doneTitle}>You&apos;re all set!</h1>
      <p className={styles.doneSubtitle}>
        Explore today&apos;s demand outlook and what&apos;s driving it.
      </p>
      <button type="button" className={styles.choiceBtn} onClick={onViewDashboard}>
        View today&apos;s outlook
      </button>
    </div>
  );
}

function ConceptGrid({
  value,
  onChange,
  invalid,
  errorId,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  errorId?: string;
}) {
  return (
    <div
      className={styles.conceptGrid}
      role="group"
      aria-label="Concept type"
      aria-describedby={invalid ? errorId : undefined}
    >
      {CONCEPT_DISPLAY_ORDER.map((c) => {
        const selected = value === c;
        return (
          <button
            type="button"
            key={c}
            aria-pressed={selected}
            className={`${styles.conceptCard} ${selected ? styles.selected : ""}`}
            onClick={() => onChange(c)}
          >
            <ConceptIcon name={CONCEPT_ICONS[c]} />
            {c}
          </button>
        );
      })}
    </div>
  );
}

// The explorer branch's only step: zone and concept, without the venue
// details it doesn't collect.
function StepExploreZone(props: {
  zone: string;
  setZone: (v: string) => void;
  zoneNote: ZoneNote;
  conceptType: string;
  setConceptType: (v: string) => void;
  valid: boolean;
  onOpenZoneFinder: () => void;
  onContinue: () => void;
  submitting: boolean;
  error: string;
}) {
  return (
    <>
      <div className={styles.cardHead}>
        <h1>Which zone and concept would you like to explore?</h1>
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
        <Select value={props.zone} onChange={props.setZone} options={ZONE_CHOICES} ariaLabel="Zone" />
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
        <p className={styles.fieldHelp}>Choose the concept that best describes your business.</p>
        <ConceptGrid value={props.conceptType} onChange={props.setConceptType} />
      </div>

      <div className={styles.footerRow}>
        <button
          type="button"
          className={styles.continueBtn}
          disabled={!props.valid || props.submitting}
          onClick={props.onContinue}
        >
          Continue
          <IconArrowRight />
        </button>
      </div>

      {props.error && <p className={styles.error}>{props.error}</p>}
    </>
  );
}

function StepRestaurantInfo(props: {
  restaurantName: string;
  setRestaurantName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  area: AreaDetection;
  conceptType: string;
  setConceptType: (v: string) => void;
  onContinue: () => void;
}) {
  // Errors appear once Continue is pressed, then update as fields are fixed.
  const [attempted, setAttempted] = useState(false);

  const nameError = props.restaurantName.trim() ? null : "Enter your restaurant's name.";
  const addrError = addressError(props.area.status);
  const conceptError = props.conceptType ? null : "Choose a concept type.";
  const valid = !nameError && Boolean(props.area.zone) && !conceptError;

  function handleContinue() {
    if (valid) {
      props.onContinue();
      return;
    }
    setAttempted(true);
    // Take the user to the first field that needs attention.
    const first = nameError ? "restaurant-name" : !props.area.zone ? "restaurant-address" : null;
    if (first) document.getElementById(first)?.focus();
  }

  return (
    <>
      <div className={styles.cardHead}>
        <h1>Restaurant details</h1>
        <p>Tell us about your restaurant.</p>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="restaurant-name">
            Restaurant Name<span className={styles.req}>*</span>
          </label>
        </div>
        <input
          id="restaurant-name"
          className={styles.input}
          value={props.restaurantName}
          aria-invalid={(attempted && nameError !== null) || undefined}
          aria-describedby={attempted && nameError ? "restaurant-name-error" : undefined}
          onChange={(e) => props.setRestaurantName(e.target.value)}
        />
        {attempted && nameError && (
          <p id="restaurant-name-error" className={styles.fieldError}>
            {nameError}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="restaurant-address">
            Address<span className={styles.req}>*</span>
          </label>
        </div>
        <AddressInput
          id="restaurant-address"
          className={styles.input}
          placeholder="Start typing your street address..."
          value={props.address}
          invalid={attempted && !props.area.zone}
          describedBy={attempted && addrError ? "restaurant-address-error" : undefined}
          onChange={(v) => {
            props.setAddress(v);
            props.area.onAddressChange(v);
          }}
          onSelect={props.area.onAddressPicked}
        />
        {attempted && addrError && (
          <p id="restaurant-address-error" className={styles.fieldError}>
            {addrError}
          </p>
        )}
        <DetectedArea area={props.area} />
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.label}>
            Concept Type<span className={styles.req}>*</span>
          </span>
        </div>
        <p className={styles.fieldHelp}>Choose the concept that best describes your business.</p>
        <ConceptGrid
          value={props.conceptType}
          onChange={props.setConceptType}
          invalid={attempted && conceptError !== null}
          errorId="concept-error"
        />
        {attempted && conceptError && (
          <p id="concept-error" className={styles.fieldError}>
            {conceptError}
          </p>
        )}
      </div>

      <div className={styles.footerRow}>
        <button type="button" className={styles.continueBtn} onClick={handleContinue}>
          Continue to operating hours
          <IconArrowRight />
        </button>
      </div>
    </>
  );
}

function StepOperatingHours(props: {
  hours: DayHours[];
  setHours: (h: DayHours[]) => void;
  onBack: () => void;
  onFinish: () => void;
  submitting: boolean;
  error: string;
}) {
  const [attempted, setAttempted] = useState(false);
  const complete = isScheduleComplete(props.hours);

  return (
    <>
      <div className={styles.cardHead}>
        <h1>When are you open?</h1>
        <p>Set your regular service hours. You can adjust individual days.</p>
      </div>

      <HoursEditor value={props.hours} onChange={props.setHours} showMissing={attempted} />

      {attempted && !complete && (
        <p className={styles.error} role="alert">
          Every day needs hours or to be marked closed before you can finish.
        </p>
      )}
      {props.error && <p className={styles.error}>{props.error}</p>}

      <div className={styles.footerRow}>
        <button type="button" className={styles.backBtn} onClick={props.onBack}>
          <IconArrowLeft />
          Back
        </button>
        <button
          type="button"
          className={styles.continueBtn}
          disabled={props.submitting}
          onClick={() => {
            if (complete) props.onFinish();
            else setAttempted(true);
          }}
        >
          {props.submitting ? "Saving…" : "Finish setup"}
          <IconArrowRight />
        </button>
      </div>
    </>
  );
}
