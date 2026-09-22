// Icons for the "How was your day?" dialog: the six ratings and the four
// dayparts. Plain stroke icons (currentColor), sized by the parent.

const s = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function RateDead() {
  return (
    <svg {...s}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 9.5 2 2M10.5 9.5l-2 2M13.5 9.5l2 2M15.5 9.5l-2 2" />
      <ellipse cx="12" cy="16" rx="1.6" ry="1.9" />
    </svg>
  );
}
export function RateSlow() {
  return (
    <svg {...s}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12 8.5 8.5M12 5.5v1.2M5.5 12h1.2M18.5 12h-1.2" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
export function RateSteady() {
  return (
    <svg {...s}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r=".9" fill="currentColor" />
      <circle cx="15" cy="10" r=".9" fill="currentColor" />
      <path d="M9 15.2c1.8 1.4 4.2 1.4 6 0" />
    </svg>
  );
}
export function RateBusy() {
  return (
    <svg {...s}>
      <circle cx="6.5" cy="10" r="2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="17.5" cy="10" r="2" />
      <path d="M3.5 17c.4-2 1.6-3 3-3s2.600 1 3 3M9 15c.4-2 1.500-3 3-3s2.600 1 3 3M14.500 17c.4-2 1.600-3 3-3s2.600 1 3 3" />
    </svg>
  );
}
export function RateSlammed() {
  return (
    <svg {...s}>
      <circle cx="12" cy="4.500" r="1.400" />
      <circle cx="8.500" cy="9" r="1.400" />
      <circle cx="15.500" cy="9" r="1.400" />
      <circle cx="5" cy="13.500" r="1.400" />
      <circle cx="12" cy="13.500" r="1.400" />
      <circle cx="19" cy="13.500" r="1.400" />
      <path d="M3 20c.3-1.500 1.100-2.300 2-2.300s1.700.8 2 2.300M10 20c.3-1.500 1.100-2.300 2-2.300s1.700.8 2 2.300M17 20c.3-1.500 1.100-2.300 2-2.300s1.700.8 2 2.300" />
    </svg>
  );
}
export function RateClosed() {
  return (
    <svg {...s}>
      <path d="M12 3v3M8 6l4-3 4 3" />
      <rect x="4" y="8" width="16" height="10" rx="1.500" />
      <path d="M7.500 13h9" />
    </svg>
  );
}

export function DpMorning() {
  return (
    <svg {...s}>
      <circle cx="12" cy="12" r="3.500" />
      <path d="M12 3.500v2M12 18.500v2M3.500 12h2M18.500 12h2M6 6l1.400 1.400M16.600 16.600 18 18M6 18l1.400-1.400M16.600 7.400 18 6" />
    </svg>
  );
}
export function DpMidday() {
  return (
    <svg {...s}>
      <circle cx="11" cy="13" r="4" />
      <path d="M11 3.500v2M4.500 6.500l1.400 1.400M17.500 6.500l-1.400 1.400M3 13h2M19 9v4l2 1.500" />
    </svg>
  );
}
export function DpDinner() {
  return (
    <svg {...s}>
      <path d="M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500Z" />
    </svg>
  );
}
export function DpLate() {
  return (
    <svg {...s}>
      <circle cx="10.500" cy="13.500" r="7" />
      <path d="M10.500 9.500v4l2.500 1.500M17.500 3.500a4 4 0 0 1 3 3" />
    </svg>
  );
}
