// The Terms and Privacy pages live on the landing site. The URLs come from env
// (NEXT_PUBLIC_ so the sign-up page can link to them from the browser), with the
// landing URLs as a fallback so a missing variable never leaves a dead link.
export const TERMS_URL =
  process.env.NEXT_PUBLIC_TERMS_URL || "https://foreshift-landing-new.vercel.app/terms-and-conditions";

export const PRIVACY_URL =
  process.env.NEXT_PUBLIC_PRIVACY_URL || "https://foreshift-landing-new.vercel.app/privacy-policy";
