"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "my-app/convex/_generated/api";
import { CONCEPTS, DAYS } from "my-app/convex/lib/vocab";
import { AddressInput } from "@/app/components/AddressInput";
import { DetectedArea } from "@/app/components/DetectedArea";
import { HoursEditor } from "@/app/components/HoursEditor";
import { PageLoading } from "@/app/components/PageLoading";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { addressError, useAreaDetection } from "@/app/hooks/useAreaDetection";
import { fromSavedHours, isScheduleComplete, toSavedHours, type DayHours } from "@/app/lib/hours";
import shared from "../shared.module.css";
import styles from "./settings.module.css";

type Operator = NonNullable<ReturnType<typeof useMyOperator>["operator"]>;
type Msg = { kind: "ok" | "error"; text: string } | null;

function errorText(e: unknown, fallback: string): string {
  const clerk = e as { errors?: { longMessage?: string; message?: string }[] };
  return clerk?.errors?.[0]?.longMessage ?? clerk?.errors?.[0]?.message ?? (e instanceof Error ? e.message : fallback);
}

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <span
      className={`${styles.msg} ${msg.kind === "error" ? styles.msgError : ""}`}
      role={msg.kind === "error" ? "alert" : "status"}
    >
      {msg.text}
    </span>
  );
}

// Settings — Account (Clerk), Reset Password (Clerk), Restaurant + Operating
// Hours (the operators row in Convex). Each card saves on its own.
export default function SettingsPage() {
  const { operator } = useMyOperator();
  const { isLoaded, user } = useUser();
  if (!isLoaded || !user || !operator) return <PageLoading label="Loading your settings…" />;

  return (
    <>
      <h1 className={shared.title}>Settings</h1>
      <p className={shared.subtitle}>Configure your restaurant profile settings</p>

      <div className={styles.stack}>
        <AccountCard />
        <PasswordCard />
        <RestaurantCard operator={operator} />
        <HoursCard operator={operator} />
      </div>
    </>
  );
}

function AccountCard() {
  const { user } = useUser();
  const [first, setFirst] = useState(user?.firstName ?? "");
  const [last, setLast] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function save() {
    if (!user) return;
    setSaving(true);
    setMsg(null);
    try {
      await user.update({ firstName: first.trim(), lastName: last.trim() });
      setMsg({ kind: "ok", text: "Saved." });
    } catch (e) {
      setMsg({ kind: "error", text: errorText(e, "Couldn't save your changes.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Account</h2>
      <div className={styles.fields}>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span className={styles.label}>First name</span>
            <input className={styles.input} value={first} onChange={(e) => setFirst(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Last name</span>
            <input className={styles.input} value={last} onChange={(e) => setLast(e.target.value)} />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input
            className={styles.input}
            value={user?.primaryEmailAddress?.emailAddress ?? ""}
            readOnly
            aria-readonly="true"
          />
        </label>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Message msg={msg} />
      </div>
    </section>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.pwWrap}>
        <input
          className={styles.input}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className={styles.eye}
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
        >
          <EyeIcon off={show} />
        </button>
      </div>
    </label>
  );
}

function PasswordCard() {
  const { user } = useUser();
  const hasPassword = user?.passwordEnabled ?? true;
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function update() {
    if (!user) return;
    if (!newPw || (hasPassword && !oldPw)) {
      setMsg({ kind: "error", text: hasPassword ? "Enter your old and new password." : "Enter a new password." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await user.updatePassword(hasPassword ? { currentPassword: oldPw, newPassword: newPw } : { newPassword: newPw });
      setOldPw("");
      setNewPw("");
      setMsg({ kind: "ok", text: "Password updated." });
    } catch (e) {
      setMsg({ kind: "error", text: errorText(e, "Couldn't update your password.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Reset Password</h2>
      <div className={styles.fields}>
        {hasPassword && (
          <PasswordField label="Old password" value={oldPw} onChange={setOldPw} autoComplete="current-password" />
        )}
        <PasswordField label="New password" value={newPw} onChange={setNewPw} autoComplete="new-password" />
        {!hasPassword && (
          <p className={styles.note}>You signed in with Google, so there&apos;s no password yet — set one here.</p>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={update} disabled={saving}>
          {saving ? "Updating…" : "Update password"}
        </button>
        <Message msg={msg} />
      </div>
    </section>
  );
}

function RestaurantCard({ operator }: { operator: Operator }) {
  const updateProfile = useMutation(api.operators.updateProfile);
  const [name, setName] = useState(operator.restaurantName);
  const [address, setAddress] = useState(operator.address);
  const area = useAreaDetection(operator.zone);
  const [concept, setConcept] = useState(operator.conceptType);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function save() {
    setMsg(null);
    if (!name.trim() || !concept) {
      setMsg({ kind: "error", text: "Restaurant name and concept type are required." });
      return;
    }
    if (!area.zone) {
      setMsg({
        kind: "error",
        text: addressError(area.status) ?? "Restaurant is outside of supported coverage zones.",
      });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ restaurantName: name, address, zone: area.zone, conceptType: concept });
      setMsg({ kind: "ok", text: "Saved." });
    } catch (e) {
      setMsg({ kind: "error", text: errorText(e, "Couldn't save your changes.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Restaurant</h2>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Restaurant name</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-address">
            Address
          </label>
          <AddressInput
            id="settings-address"
            className={styles.input}
            placeholder="Start typing your street address..."
            value={address}
            onChange={(v) => {
              setAddress(v);
              area.onAddressChange(v);
            }}
            onSelect={area.onAddressPicked}
          />
          <DetectedArea area={area} />
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Concept type</span>
          <select className={styles.select} value={concept} onChange={(e) => setConcept(e.target.value)}>
            <option value="">Choose an option...</option>
            {CONCEPTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Message msg={msg} />
      </div>
    </section>
  );
}

function HoursCard({ operator }: { operator: Operator }) {
  const updateHours = useMutation(api.operators.updateHours);
  const [hours, setHours] = useState<DayHours[]>(() => fromSavedHours(operator.operatingHours, DAYS));
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function save() {
    setMsg(null);
    if (!isScheduleComplete(hours)) {
      setAttempted(true);
      setMsg({ kind: "error", text: "Every day needs hours or to be marked closed before saving." });
      return;
    }
    setSaving(true);
    try {
      await updateHours({ operatingHours: toSavedHours(hours) });
      setMsg({ kind: "ok", text: "Saved." });
    } catch (e) {
      setMsg({ kind: "error", text: errorText(e, "Couldn't save your hours.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Operating Hours</h2>
      <p className={styles.cardSub}>Set your regular service hours. Adjustable by individual day.</p>
      <div className={styles.hours}>
        <HoursEditor value={hours} onChange={setHours} showMissing={attempted} />
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Message msg={msg} />
      </div>
    </section>
  );
}
