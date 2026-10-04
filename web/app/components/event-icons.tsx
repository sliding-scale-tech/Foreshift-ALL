// Small line icons for the Events screens (filter bar, reset link, "how events shape demand").
// Same 24px grid and 1.8px stroke as the rest of the app's icons; colour comes from the parent.

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function TagIcon() {
  return (
    <svg {...base}>
      <path d="M3 12V4h8l10 10-8 8L3 12Z" />
      <circle cx="7.5" cy="8.5" r="1.2" />
    </svg>
  );
}

export function BuildingIcon() {
  return (
    <svg {...base}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg {...base}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4.5h-4.5" />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M17 14c2.5 0 4.5 2 4.5 4.5" />
    </svg>
  );
}

export function BriefcaseIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M3 13h18" />
    </svg>
  );
}

export function MusicIcon() {
  return (
    <svg {...base}>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  );
}
