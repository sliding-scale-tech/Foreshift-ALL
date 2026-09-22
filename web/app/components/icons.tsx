// Small line-style icon set for the auth pages, matching the admin console's
// icon style (stroke="currentColor", strokeWidth 1.8).

export function IconTrendUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}

export function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function IconEye({ off }: { off?: boolean }) {
  if (off) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a17.6 17.6 0 0 1-3.29 4.34M6.11 6.11C3.08 8.14 2 12 2 12s3 8 10 8a9.14 9.14 0 0 0 5.06-1.5" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <path d="M2 2l20 20" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/* ---- Concept-type icons (9), matching CONCEPTS in convex/lib/vocab.ts ---- */

export function IconFineDining() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="2.2" />
      <path d="M8 9.2V21M5 21h6" />
      <circle cx="17" cy="7" r="2.2" />
      <path d="M17 9.2V21M14 21h6" />
    </svg>
  );
}

export function IconUpscaleCasual() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h18M4 10v9h16v-9" />
      <path d="M8 19v-5h8v5" />
      <path d="M3 10 6 4h12l3 6" />
    </svg>
  );
}

export function IconCasualDining() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="16" height="4" rx="1" />
      <path d="M6 13v6M18 13v6M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

export function IconFastCasual() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v16l-2-1.5L14 19l-2-1.5L10 19l-2-1.5L6 19V3Z" />
      <path d="M9 8h6M9 11h6" />
    </svg>
  );
}

export function IconCoffeeShop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
      <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M7 3.5c0 1-1 1-1 2s1 1 1 2M11 3.5c0 1-1 1-1 2s1 1 1 2" />
    </svg>
  );
}

export function IconBrunchCafe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13c0-4 3-8 8-8s8 4 8 8" />
      <path d="M3 13h18l-1.2 6.2a2 2 0 0 1-2 1.8H6.2a2 2 0 0 1-2-1.8L3 13Z" />
    </svg>
  );
}

export function IconSportsBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h9v9a4.5 4.5 0 0 1-9 0V3Z" />
      <path d="M15 6h2.5a2 2 0 0 1 0 4H15" />
      <path d="M6 21h9" />
    </svg>
  );
}

export function IconCocktailLounge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16l-8 9-8-9Z" />
      <path d="M12 13v7M8 20h8" />
    </svg>
  );
}

export function IconCasualBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10h14l-1.5 9a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 10Z" />
      <path d="M9 10V8a3 3 0 0 1 6 0v2" />
      <path d="M9 3c0 .8-.8.8-.8 1.6S9 6 9 6" />
    </svg>
  );
}

/* ---- Step-1 illustrations ---- */

export function IllustrationRestaurant() {
  return (
    <svg viewBox="0 0 160 120" fill="none">
      <rect x="18" y="52" width="30" height="46" rx="2" fill="var(--color-primary-20)" />
      <rect x="112" y="40" width="26" height="58" rx="2" fill="var(--color-primary-20)" />
      <rect x="46" y="58" width="68" height="40" fill="var(--color-surface)" stroke="var(--color-primary-40)" strokeWidth="1.5" />
      <path d="M42 58h76l-4-14H46l-4 14Z" fill="var(--color-shift-electric-blue)" />
      <path d="M46 58 50 46M58 58 61 46M70 58 72 46M82 58 84 46M94 58 96 46M106 58 108 46" stroke="var(--color-surface)" strokeWidth="2" />
      <rect x="53" y="70" width="16" height="28" fill="var(--color-primary-30)" />
      <circle cx="64" cy="84" r="1.6" fill="var(--color-primary)" />
      <path d="M74 78h30M74 86h30" stroke="var(--color-primary-40)" strokeWidth="1.4" />
      <circle cx="80" cy="30" r="15" fill="var(--color-shift-electric-blue)" />
      <path d="M74 23v14M74 23a2 2 0 1 1 4 0v6a2 2 0 0 1-4 0M86 23v14M86 23c-2.5 0-3 2-3 4s.5 4 3 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IllustrationExplore() {
  return (
    <svg viewBox="0 0 160 120" fill="none">
      <rect x="16" y="30" width="90" height="66" rx="4" fill="var(--color-primary-10)" stroke="var(--color-primary-30)" strokeWidth="1.5" />
      <path d="M16 46h90M40 30v66M70 30v66" stroke="var(--color-primary-30)" strokeWidth="1" />
      <rect x="20" y="62" width="16" height="20" fill="var(--color-shift-electric-blue)" opacity="0.5" />
      <rect x="42" y="54" width="12" height="28" fill="var(--color-primary-40)" opacity="0.6" />
      <rect x="58" y="68" width="10" height="14" fill="var(--color-shift-electric-blue)" opacity="0.4" />
      <circle cx="88" cy="30" r="24" fill="var(--color-primary)" opacity="0.9" />
      <path d="M88 12a18 18 0 0 0-9 33.6V54l9-5 9 5v-8.4A18 18 0 0 0 88 12Z" fill="var(--color-shift-electric-blue)" />
      <circle cx="118" cy="70" r="17" fill="none" stroke="var(--color-primary)" strokeWidth="4" />
      <path d="M130 82 140 92" stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function IllustrationSuccess() {
  return (
    <svg viewBox="0 0 240 160" fill="none">
      <rect x="20" y="66" width="34" height="52" rx="2" fill="var(--color-primary-20)" />
      <rect x="186" y="54" width="30" height="64" rx="2" fill="var(--color-primary-20)" />
      <circle cx="60" cy="98" r="16" fill="var(--color-success-20)" opacity="0.7" />
      <circle cx="186" cy="90" r="20" fill="var(--color-success-20)" opacity="0.6" />
      <path d="M62 118c0-20 8-30 10-30M170 118c0-14-6-22-8-22" stroke="var(--color-success-40)" strokeWidth="4" strokeLinecap="round" opacity="0.6" />

      <g>
        <path d="M118 60 122 46M148 60 152 46M132 44v-8" stroke="var(--color-shift-electric-blue)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <rect x="164" y="52" width="6" height="6" fill="var(--color-shift-electric-blue)" opacity="0.5" transform="rotate(45 167 55)" />
        <rect x="96" y="66" width="5" height="5" fill="var(--color-shift-electric-blue)" opacity="0.5" transform="rotate(45 98.5 68.5)" />
      </g>

      <circle cx="132" cy="90" r="46" fill="var(--color-shift-electric-blue)" />
      <path d="M112 92 126 106 154 74" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <rect x="88" y="128" width="88" height="32" fill="var(--color-surface)" stroke="var(--color-primary-40)" strokeWidth="1.5" />
      <path d="M84 128h96l-5-16H89l-5 16Z" fill="var(--color-primary)" />
      <path d="M89 128 93 112M105 128 108 112M121 128 124 112M137 128 140 112M153 128 156 112M169 128 172 112" stroke="var(--color-surface)" strokeWidth="2" />
      <rect x="98" y="140" width="18" height="20" fill="var(--color-primary-30)" />
    </svg>
  );
}

export function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}
