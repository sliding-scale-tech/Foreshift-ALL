import type { ComponentType } from "react";
import {
  IconCalendarDay,
  IconGridLayout,
  IconEventPin,
  IconWeatherCycle,
  IconGear,
  IconCard,
  IconFaq,
  IconFeedback,
} from "./dashboard-icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType;
  /** Opens a dialog instead of navigating (Feedback Loop). */
  action?: "feedback";
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

// Single source of truth for the sidebar. Daily Outlook lives at /dashboard
// (that's where onboarding and every sign-in land); the rest are placeholder
// routes for now — see app/(app)/[section]/page.tsx.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Intelligence",
    items: [
      { label: "Daily Outlook", href: "/dashboard", icon: IconCalendarDay },
      { label: "Weekly Outlook", href: "/weekly-outlook", icon: IconGridLayout },
      { label: "Events Overview", href: "/events-overview", icon: IconEventPin },
      { label: "Weather Outlook", href: "/weather-outlook", icon: IconWeatherCycle },
    ],
  },
  {
    label: "Account Profile",
    items: [
      { label: "Settings", href: "/settings", icon: IconGear },
      { label: "Billing", href: "/billing", icon: IconCard },
      { label: "FAQS", href: "/faqs", icon: IconFaq },
      { label: "Feedback Loop", href: "/feedback-loop", icon: IconFeedback, action: "feedback" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
