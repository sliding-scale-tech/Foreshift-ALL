"use client";

import { useClerk } from "@clerk/nextjs";
import type { PasswordSettingsData } from "@clerk/shared/types";
import formStyles from "./AuthForm.module.css";

// The password rules come from Clerk, never from this app: they are the
// instance's own settings (Clerk Dashboard -> User & authentication -> Password),
// the same ones Clerk enforces when the account is created. So the hints can't
// drift from what Clerk accepts. Clerk loads them into the page as part of its
// environment; if they aren't available, no hint is shown and Clerk's own error
// message on submit is the guide.

type ClerkWithEnvironment = {
  __internal_environment?: { userSettings?: { passwordSettings?: PasswordSettingsData } } | null;
};

export function usePasswordRules(): PasswordSettingsData | null {
  const clerk = useClerk() as unknown as ClerkWithEnvironment;
  return clerk.__internal_environment?.userSettings?.passwordSettings ?? null;
}

/** Clerk's rules for this instance, each ticked once the password meets it. */
export function PasswordRules({ id, password }: { id: string; password: string }) {
  const rules = usePasswordRules();
  if (!rules) return null;

  const specials = rules.allowed_special_characters || "";
  const items: { text: string; met: boolean | null }[] = [
    { text: `At least ${rules.min_length} characters`, met: password.length >= rules.min_length },
  ];
  if (password.length > rules.max_length) items.push({ text: `No more than ${rules.max_length} characters`, met: false });
  if (rules.require_lowercase) items.push({ text: "A lowercase letter", met: /[a-z]/.test(password) });
  if (rules.require_uppercase) items.push({ text: "An uppercase letter", met: /[A-Z]/.test(password) });
  if (rules.require_numbers) items.push({ text: "A number", met: /\d/.test(password) });
  if (rules.require_special_char) {
    items.push({ text: "A special character", met: [...password].some((ch) => specials.includes(ch)) });
  }
  // Checked by Clerk when the form is sent, so there's nothing to tick here.
  if (!rules.disable_hibp) items.push({ text: "Not a common or previously breached password", met: null });

  return (
    <ul id={id} className={formStyles.hints}>
      {items.map((item) => (
        <li key={item.text} className={item.met && password ? formStyles.hintMet : undefined}>
          {item.met && password ? "✓ " : ""}
          {item.text}
        </li>
      ))}
    </ul>
  );
}
