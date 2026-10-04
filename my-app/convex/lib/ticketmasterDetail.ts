// One Ticketmaster event, looked up on demand for the web app's event page: the
// venue's address, a link back to the listing, an end time when there is one, and
// whether the source has marked it cancelled / postponed / rescheduled.
//
// Deliberately separate from lib/ticketmaster.ts: that file is the daily sync's
// search client (shared with the Bubble pipeline) and is not touched. This one
// only READS a single event, stores nothing, and feeds nothing into the forecast.

export type EventStatus = "scheduled" | "cancelled" | "postponed" | "rescheduled" | "unknown";

export type EventSourceInfo =
  | {
      available: true;
      source: string;
      /** Link to the original listing (https, ticketing domains only), or null. */
      url: string | null;
      /** "123 Main St, Detroit, MI 48226", or null. */
      address: string | null;
      /** Local end time "HH:MM" when the source gives one. */
      endTime: string | null;
      status: EventStatus;
      /** When we asked the source (ms since epoch). */
      checkedAt: number;
    }
  | { available: false; reason: "not_found" | "lookup_failed" | "no_key" };

interface TmVenue {
  name?: string;
  address?: { line1?: string };
  city?: { name?: string };
  state?: { stateCode?: string; name?: string };
  postalCode?: string;
}
interface TmEventDetail {
  url?: string;
  dates?: { end?: { localTime?: string }; status?: { code?: string } };
  _embedded?: { venues?: TmVenue[] };
}

/** Only link out to Ticketmaster's own domains. */
export function safeTicketUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    const ok = /(^|\.)ticketmaster\.(com|ca)$/i.test(u.hostname);
    return u.protocol === "https:" && ok ? u.toString() : null;
  } catch {
    return null;
  }
}

export function statusFrom(code: unknown): EventStatus {
  if (typeof code !== "string" || code === "") return "unknown";
  const c = code.toLowerCase();
  if (c.includes("cancel")) return "cancelled";
  if (c.includes("postpone")) return "postponed";
  if (c.includes("reschedul")) return "rescheduled";
  return "scheduled";
}

function addressFrom(v: TmVenue | undefined): string | null {
  if (!v) return null;
  const region = [v.state?.stateCode ?? v.state?.name, v.postalCode].filter(Boolean).join(" ");
  const parts = [v.address?.line1, v.city?.name, region].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Ticketmaster event ids are short alphanumeric strings; anything else is refused before a request is made. */
export function isTicketmasterId(id: string): boolean {
  return /^[A-Za-z0-9_-]{5,40}$/.test(id) && !id.startsWith("hp_");
}

export async function fetchTicketmasterEventInfo(args: { apiKey: string; eventId: string }): Promise<EventSourceInfo> {
  if (!isTicketmasterId(args.eventId)) return { available: false, reason: "not_found" };
  const url = `https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(args.eventId)}.json?apikey=${encodeURIComponent(args.apiKey)}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (res.status === 404) return { available: false, reason: "not_found" };
    if (!res.ok) return { available: false, reason: "lookup_failed" };
    const ev = (await res.json()) as TmEventDetail;
    const end = ev.dates?.end?.localTime;
    return {
      available: true,
      source: "Ticketmaster",
      url: safeTicketUrl(ev.url),
      address: addressFrom(ev._embedded?.venues?.[0]),
      endTime: typeof end === "string" && /^\d{2}:\d{2}/.test(end) ? end.slice(0, 5) : null,
      status: statusFrom(ev.dates?.status?.code),
      checkedAt: Date.now(),
    };
  } catch {
    return { available: false, reason: "lookup_failed" };
  } finally {
    clearTimeout(timer);
  }
}
