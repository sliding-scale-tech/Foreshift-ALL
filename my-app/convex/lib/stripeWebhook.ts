// Verify a Stripe webhook signature without the `stripe` npm package, using the
// Web Crypto API available in Convex's default runtime. Stripe signs
// `${timestamp}.${raw_body}` with HMAC-SHA256 using the webhook's signing
// secret (whsec_...) and sends it hex-encoded in the Stripe-Signature header
// as `t=<timestamp>,v1=<sig>[,v1=<sig>...]` (multiple v1 entries during secret
// rotation — any match is valid).
// https://docs.stripe.com/webhooks#verify-manually

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const TOLERANCE_SECONDS = 5 * 60;

/** True iff `header` (the raw Stripe-Signature header) matches `payload` (the
 * raw request body) under `secret`, and its timestamp is recent (replay
 * protection). */
export async function verifyStripeSignature(args: {
  secret: string; // whsec_...
  header: string | null;
  payload: string;
}): Promise<boolean> {
  const { secret, header, payload } = args;
  if (!header) return false;

  let timestamp: string | undefined;
  const v1Sigs: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") v1Sigs.push(value);
  }
  if (!timestamp || v1Sigs.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(new TextEncoder().encode(`${timestamp}.${payload}`)),
  );
  const expected = bytesToHex(new Uint8Array(sigBuf));

  return v1Sigs.some((sig) => timingSafeEqual(sig, expected));
}
