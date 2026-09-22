// Icons for the app shell (sidebar) and the Daily Outlook screen. Plain
// components with no hooks, so they work from both server and client
// components. Line icons use currentColor; the two colored illustrations
// (stadium, rain/sun) carry their own fills.

const line = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ---- Sidebar navigation ---- */

export function IconCalendarDay() {
  return (
    <svg {...line}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10.5h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconGridLayout() {
  return (
    <svg {...line}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconEventPin() {
  return (
    <svg {...line}>
      <path d="M12 21.5s-6.5-5.4-6.5-10.8a6.5 6.5 0 1 1 13 0c0 5.4-6.5 10.8-6.5 10.8Z" />
      <path d="m12 7.6.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 9.7l2-.3.9-1.8Z" />
    </svg>
  );
}

export function IconWeatherCycle() {
  return (
    <svg {...line}>
      <path d="M17.5 19H8a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 18 10.5a4.25 4.25 0 0 1-.5 8.5Z" />
      <path d="M3 8.5a4.5 4.5 0 0 1 4-4M5 2.5l-2 2 2 2" />
    </svg>
  );
}

export function IconGear() {
  return (
    <svg {...line}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconCard() {
  return (
    <svg {...line}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </svg>
  );
}

export function IconFaq() {
  return (
    <svg {...line}>
      <path d="M4 4h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9.5L6 17v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M21.5 9.5V16a2 2 0 0 1-2 2H18" />
    </svg>
  );
}

export function IconFeedback() {
  return (
    <svg {...line}>
      <path d="M4 3.5h16a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H9L5 21v-4H4A1.5 1.5 0 0 1 2.5 15.5V5A1.5 1.5 0 0 1 4 3.5Z" />
      <path d="M12 7.5v4M12 14v.01" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg {...line}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

/* ---- Daily Outlook ---- */

export function IconSparkle() {
  return (
    <svg {...line}>
      <path d="m11 3 1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9L11 3Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  );
}

export function IconSunLine() {
  return (
    <svg {...line}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </svg>
  );
}

export function IconSunFilled() {
  return (
    <svg {...line} fill="currentColor">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </svg>
  );
}

export function IconUtensils() {
  return (
    <svg {...line}>
      <path d="M6 3v6a2.5 2.5 0 0 0 5 0V3M8.5 3v18" />
      <path d="M17.5 3c-2.2 1.4-3.5 3.8-3.5 6.5V13h3.5M17.5 3v18" />
    </svg>
  );
}

export function IconMoon() {
  return (
    <svg {...line} fill="currentColor">
      <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" />
    </svg>
  );
}

export function IconCloud() {
  return (
    <svg {...line}>
      <path d="M7 19a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 11a4 4 0 0 1-.5 8H7Z" />
    </svg>
  );
}

export function IconCalendarCheck() {
  return (
    <svg {...line}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M8 2.5v4M16 2.5v4M3 10h18M9 15.5l2 2 4-4" />
    </svg>
  );
}

/* ---- Colored illustrations for the Top Demand Drivers list ---- */

export function IllustrationStadium() {
  return (
    <svg viewBox="0 0 40 40" fill="none">
      <ellipse cx="20" cy="27" rx="16" ry="8" fill="#a7adb8" />
      <ellipse cx="20" cy="25" rx="16" ry="8" fill="#d9dde5" />
      <ellipse cx="20" cy="24" rx="13" ry="6" fill="#c8362b" />
      <ellipse cx="20" cy="23" rx="9.5" ry="4" fill="#3f8a3a" />
      <path d="M8 22c3-6 21-6 24 0" stroke="#7b1f18" strokeWidth="1.5" />
    </svg>
  );
}

export function IllustrationRainSun() {
  return (
    <svg viewBox="0 0 40 40" fill="none">
      <circle cx="14" cy="13" r="6.5" fill="#f7c948" />
      <path d="M14 3v3M4 13h3M6.9 5.9l2.1 2.1M21.1 5.9 19 8" stroke="#f7c948" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 28a5 5 0 0 1-.4-10 6.5 6.5 0 0 1 12.3 1.4A4.4 4.4 0 0 1 25 28H13Z" fill="#dfe6f2" stroke="#b8c4d8" strokeWidth="1.2" />
      <path d="m16 31-1.6 4M22 31l-1.6 4M28 31l-1.6 4" stroke="#4f8df0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
