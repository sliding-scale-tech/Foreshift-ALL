// Address -> lat/lng for onboarding zone identification, server-side (Convex
// action) so no key or CORS issue reaches the browser.
//   1. Google Geocoding API — only when GOOGLE_MAPS_API_KEY is set in Convex env
//      (`npx convex env set GOOGLE_MAPS_API_KEY ...`); best match quality.
//   2. US Census Geocoder — free, keyless, authoritative for US street addresses.
//   3. OpenStreetMap Nominatim — free, keyless fallback for anything else.
// Each provider that errors or finds nothing falls through to the next.

export interface Geocoded {
  lat: number;
  lng: number;
  matchedAddress: string;
}

async function fetchJson(url: string, timeoutMs: number, headers?: Record<string, string>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null; // timeout / network error — caller falls through to the next provider
  } finally {
    clearTimeout(timer);
  }
}

async function googleGeocode(address: string): Promise<Geocoded | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(address)}&components=country:US&key=${encodeURIComponent(key)}`;
  const data = (await fetchJson(url, 8_000)) as {
    status?: string;
    results?: {
      formatted_address?: string;
      types?: string[];
      geometry?: { location?: { lat?: number; lng?: number } };
    }[];
  } | null;
  const r = data?.status === "OK" ? data.results?.[0] : undefined;
  // Google falls back to "United States" / a whole state / a whole city for
  // gibberish or vague input. Only accept results precise enough to place in a
  // zone; otherwise fall through (and ultimately report "address not found").
  const PRECISE = [
    "street_address", "premise", "subpremise", "route", "intersection",
    "establishment", "point_of_interest", "neighborhood", "sublocality",
  ];
  if (r && !r.types?.some((t) => PRECISE.includes(t))) return null;
  const loc = r?.geometry?.location;
  if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") return null;
  return { lat: loc.lat, lng: loc.lng, matchedAddress: r?.formatted_address ?? address };
}

async function censusGeocode(address: string): Promise<Geocoded | null> {
  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    `?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const data = (await fetchJson(url, 10_000)) as {
    result?: {
      addressMatches?: { matchedAddress?: string; coordinates?: { x?: number; y?: number } }[];
    };
  } | null;
  const m = data?.result?.addressMatches?.[0];
  if (!m?.coordinates || typeof m.coordinates.x !== "number" || typeof m.coordinates.y !== "number") {
    return null;
  }
  return { lat: m.coordinates.y, lng: m.coordinates.x, matchedAddress: m.matchedAddress ?? address };
}

async function nominatimGeocode(address: string): Promise<Geocoded | null> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
  // Nominatim's usage policy requires an identifying User-Agent.
  const data = (await fetchJson(url, 8_000, { "User-Agent": "ForeShift-onboarding/1.0" })) as
    | { lat?: string; lon?: string; display_name?: string; place_rank?: number }[]
    | null;
  const m = data?.[0];
  if (!m?.lat || !m?.lon) return null;
  // place_rank ≥ 26 = street level or finer; a city/county centre point (rank
  // ~16) can't be placed in a zone.
  if ((m.place_rank ?? 0) < 26) return null;
  const lat = Number(m.lat);
  const lng = Number(m.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, matchedAddress: m.display_name ?? address };
}

/** Geocode a free-text US address. Every zone is in Detroit, so an address
 * typed without a state gets ", Detroit, MI" appended for a second attempt. */
export async function geocodeAddress(raw: string): Promise<Geocoded | null> {
  const address = raw.trim().replace(/\s+/g, " ");
  if (!address) return null;

  const attempts = [address];
  if (!/\b(MI|Michigan)\b/i.test(address)) attempts.push(`${address}, Detroit, MI`);

  for (const a of attempts) {
    const hit =
      (await googleGeocode(a)) ?? (await censusGeocode(a)) ?? (await nominatimGeocode(a));
    if (hit) return hit;
  }
  return null;
}
