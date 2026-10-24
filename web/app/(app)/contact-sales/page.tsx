"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "my-app/convex/_generated/api";
import {
  CONTACT_LIMITS,
  SALES_PLANS,
  SALES_PLAN_IDS,
  validateContactSales,
  type ContactField,
  type SalesPlan,
} from "my-app/convex/lib/contactSales";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import shared from "../shared.module.css";
import styles from "./contact-sales.module.css";

type Errors = Partial<Record<ContactField, string>>;

// Contact Sales: where the "Contact Sales" buttons on Billing lead. The form is
// checked here for quick feedback, but the server (convex/contactSales.ts)
// validates everything again, decides the recipients, and holds the Resend key.
function ContactSalesForm() {
  const search = useSearchParams();
  const { user } = useUser();
  const { operator } = useMyOperator();
  const submit = useAction(api.contactSales.submit);

  const requested = search.get("plan");
  const initialPlan: SalesPlan = SALES_PLAN_IDS.find((p) => p === requested) ?? SALES_PLAN_IDS[0];

  const [plan, setPlan] = useState<SalesPlan>(initialPlan);
  // A field shows what the person typed, or else the value from their account.
  const [typed, setTyped] = useState<{ name?: string; email?: string; restaurant?: string }>({});
  const name = typed.name ?? user?.fullName ?? "";
  const email = typed.email ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const restaurant = typed.restaurant ?? operator?.restaurantName ?? "";
  const setName = (v: string) => setTyped((t) => ({ ...t, name: v }));
  const setEmail = (v: string) => setTyped((t) => ({ ...t, email: v }));
  const setRestaurant = (v: string) => setTyped((t) => ({ ...t, restaurant: v }));
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setFormError("");

    const checked = validateContactSales({ name, email, restaurant, phone, plan, message });
    if (!checked.ok) {
      showErrors(checked.errors);
      return;
    }

    setErrors({});
    setStatus("sending");
    try {
      const res = await submit({ ...checked.values, website });
      if (res.ok) {
        setStatus("sent");
        return;
      }
      setStatus("idle");
      if (res.fields) showErrors(res.fields);
      setFormError(res.error);
    } catch {
      setStatus("idle");
      setFormError("We couldn't send your message. Please try again, or email info@foreshift.ai directly.");
    }
  }

  function showErrors(next: Errors) {
    setErrors(next);
    setFormError("Please check the highlighted fields.");
    const first = (["name", "email", "restaurant", "phone", "plan", "message"] as const).find((f) => next[f]);
    if (first) document.getElementById(`cs-${first}`)?.focus();
  }

  if (status === "sent") {
    const firstName = name.trim().split(" ")[0];
    return (
      <div className={styles.sent} role="status">
        <span className={styles.sentIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 className={styles.sentTitle}>
          <span className={styles.thanks}>Thanks{firstName ? `, ${firstName}` : ""}!</span>
          <br />
          We got your message.
        </h1>
        <p className={styles.sentText}>
          Thank you for your interest in <strong>{SALES_PLANS[plan].label}</strong>. Our team will reply to{" "}
          <strong>{email}</strong> soon.
        </p>
        <p className={styles.sentNote}>
          In a hurry? Email us at <a href="mailto:info@foreshift.ai">info@foreshift.ai</a>.
        </p>
        <Link href="/billing" className={styles.primary}>
          Back to Billing
        </Link>
      </div>
    );
  }

  const field = (id: ContactField) => ({
    id: `cs-${id}`,
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": errors[id] ? `cs-${id}-error` : undefined,
    className: `${styles.input} ${errors[id] ? styles.invalid : ""}`,
  });
  const fieldError = (id: ContactField) =>
    errors[id] ? (
      <p id={`cs-${id}-error`} className={styles.fieldError}>
        {errors[id]}
      </p>
    ) : null;

  return (
    <div className={styles.page}>
      <Link href="/billing" className={styles.back}>
        ← Back to Billing
      </Link>
      <div className={styles.head}>
        <h1 className={shared.title}>Contact Sales</h1>
        <p className={shared.subtitle}>
          Tell us about your restaurant and we&apos;ll get back to you about {SALES_PLANS[plan].label}.
        </p>
      </div>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <fieldset className={styles.plans}>
          <legend className={styles.label}>Plan</legend>
          <div className={styles.planRow}>
            {SALES_PLAN_IDS.map((id) => (
              <label key={id} className={`${styles.plan} ${plan === id ? styles.planOn : ""}`}>
                <input
                  type="radio"
                  name="plan"
                  value={id}
                  checked={plan === id}
                  onChange={() => setPlan(id)}
                  id={id === SALES_PLAN_IDS[0] ? "cs-plan" : undefined}
                />
                <span className={styles.planName}>{SALES_PLANS[id].label}</span>
                <span className={styles.planPrice}>{SALES_PLANS[id].price}</span>
              </label>
            ))}
          </div>
          {fieldError("plan")}
        </fieldset>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cs-name">
              Your name
            </label>
            <input
              {...field("name")}
              type="text"
              autoComplete="name"
              maxLength={CONTACT_LIMITS.name.max}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {fieldError("name")}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cs-email">
              Email
            </label>
            <input
              {...field("email")}
              type="email"
              autoComplete="email"
              placeholder="you@restaurant.com"
              maxLength={CONTACT_LIMITS.email.max}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {fieldError("email")}
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cs-restaurant">
              Restaurant <span className={styles.optional}>(optional)</span>
            </label>
            <input
              {...field("restaurant")}
              type="text"
              autoComplete="organization"
              maxLength={CONTACT_LIMITS.restaurant.max}
              value={restaurant}
              onChange={(e) => setRestaurant(e.target.value)}
            />
            {fieldError("restaurant")}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cs-phone">
              Phone <span className={styles.optional}>(optional)</span>
            </label>
            <input
              {...field("phone")}
              type="tel"
              autoComplete="tel"
              maxLength={CONTACT_LIMITS.phone.max}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {fieldError("phone")}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cs-message">
            How can we help?
          </label>
          <textarea
            {...field("message")}
            rows={6}
            maxLength={CONTACT_LIMITS.message.max}
            placeholder="Tell us about your restaurant and what you'd like from this plan."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <div className={styles.counter}>
            {message.length}/{CONTACT_LIMITS.message.max}
          </div>
          {fieldError("message")}
        </div>

        {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
        <div className={styles.trap} aria-hidden="true">
          <label htmlFor="cs-website">Website</label>
          <input
            id="cs-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <button type="submit" className={styles.primary} disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        <p className={styles.fine}>We only use your details to reply to this message.</p>
      </form>
    </div>
  );
}

export default function ContactSalesPage() {
  return (
    <Suspense fallback={null}>
      <ContactSalesForm />
    </Suspense>
  );
}
