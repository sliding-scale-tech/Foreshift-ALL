"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "my-app/convex/_generated/api";
import { CONCEPTS, DAYS, ZONES } from "my-app/convex/lib/vocab";
import { AddressInput } from "@/app/components/AddressInput";
import { PageLoading } from "@/app/components/PageLoading";
import { SameTimingsModal } from "@/app/components/SameTimingsModal";
import { ZoneFinderModal } from "@/app/components/ZoneFinderModal";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { useZoneAutofill } from "@/app/hooks/useZoneAutofill";
import { TIME_SLOTS } from "@/app/lib/hours";
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
  const [zone, setZone] = useState(operator.zone);
  const [concept, setConcept] = useState(operator.conceptType);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const { zoneNote, onAddressPicked, onManualZone, onModalFound } = useZoneAutofill(setZone);

  async function save() {
    setMsg(null);
    if (!name.trim() || !zone || !concept) {
      setMsg({ kind: "error", text: "Restaurant name, zone and concept type are required." });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ restaurantName: name, address, zone, conceptType: concept });
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
          <span className={styles.label}>Address</span>
          <AddressInput
            className={styles.input}
            placeholder="Start typing..."
            value={address}
            onChange={setAddress}
            onSelect={onAddressPicked}
          />
        </div>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="settings-zone">
              Zone
            </label>
            <button type="button" className={styles.hint} onClick={() => setZoneModalOpen(true)}>
              Need help identifying your zone?
            </button>
          </div>
          <select
            id="settings-zone"
            className={styles.select}
            value={zone}
            onChange={(e) => onManualZone(e.target.value)}
          >
            <option value="">Choose an option...</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          {zoneNote && (
            <p
              className={`${styles.note} ${zoneNote.kind === "warn" ? styles.noteWarn : ""}`}
              role={zoneNote.kind === "warn" ? "alert" : "status"}
            >
              {zoneNote.text}
            </p>
          )}
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
    </section>
  );
}

type DayHours = { day: (typeof DAYS)[number]; openTime: string; closeTime: string };

function HoursCard({ operator }: { operator: Operator }) {
  const updateHours = useMutation(api.operators.updateHours);
  const [hours, setHours] = useState<DayHours[]>(() =>
    DAYS.map((day) => {
      const h = operator.operatingHours.find((x) => x.day === day);
      return { day, openTime: h && !h.isClosed ? (h.openTime ?? "") : "", closeTime: h && !h.isClosed ? (h.closeTime ?? "") : "" };
    }),
  );
  const [sameOpen, setSameOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const setDay = (day: string, patch: Partial<DayHours>) =>
    setHours((hs) => hs.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await updateHours({
        operatingHours: hours.map((h) => {
          const closed = !h.openTime || !h.closeTime;
          return closed
            ? { day: h.day, isClosed: true }
            : { day: h.day, isClosed: false, openTime: h.openTime, closeTime: h.closeTime };
        }),
      });
      setMsg({ kind: "ok", text: "Saved." });
    } catch (e) {
      setMsg({ kind: "error", text: errorText(e, "Couldn't save your hours.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Operating Hours</h2>
        <button type="button" className={styles.linkBtn} onClick={() => setSameOpen(true)}>
          Same timings?
        </button>
      </div>
      <div className={styles.hours}>
        {hours.map((h) => (
          <div key={h.day} className={styles.hourRow}>
            <span className={styles.day}>{h.day}</span>
            <select
              className={styles.select}
              aria-label={`${h.day} opens`}
              value={h.openTime}
              onChange={(e) => setDay(h.day, { openTime: e.target.value })}
            >
              <option value="">Closed</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className={styles.to}>to</span>
            <select
              className={styles.select}
              aria-label={`${h.day} closes`}
              value={h.closeTime}
              onChange={(e) => setDay(h.day, { closeTime: e.target.value })}
            >
              <option value="">Closed</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Message msg={msg} />
      </div>

      {sameOpen && (
        <SameTimingsModal
          onClose={() => setSameOpen(false)}
          onApply={(from, to, days) => {
            setHours((hs) => hs.map((h) => (days.includes(h.day) ? { ...h, openTime: from, closeTime: to } : h)));
            setSameOpen(false);
          }}
        />
      )}
    </section>
  );
}
