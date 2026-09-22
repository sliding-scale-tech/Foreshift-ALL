// Address autocomplete for onboarding ("Start typing…") via the Google Places
// API (New) — called server-side with GOOGLE_MAPS_API_KEY so the key never
// reaches the browser. Suggestions only; the chosen address is turned into a
// zone later by zones.findMyZone (geocode → point-in-polygon).

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export interface AddressSuggestion {
  placeId: string;
  text: string; // full one-line address, what goes into the field
  main: string; // "2001 Woodward Ave"
  secondary: string; // "Detroit, MI, USA"
}

// Bias (not restrict) results toward Detroit so "2001 woodward" finds Detroit
// first; people can still type any US address.
const DETROIT = { latitude: 42.3314, longitude: -83.0458 };

export const suggestForInput = internalAction({
  args: { input: v.string() },
  handler: async (_ctx, args): Promise<AddressSuggestion[]> => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return [];
    const input = args.input.trim();
    if (input.length < 3) return [];

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6_000);
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
        body: JSON.stringify({
          input,
          includedRegionCodes: ["us"],
          locationBias: { circle: { center: DETROIT, radius: 30_000 } },
        }),
      });
      if (!res.ok) {
        console.error("[places] autocomplete HTTP", res.status, (await res.text()).slice(0, 200));
        return [];
      }
      const data = (await res.json()) as {
        suggestions?: {
          placePrediction?: {
            placeId?: string;
            text?: { text?: string };
            structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
          };
        }[];
      };
      return (data.suggestions ?? []).flatMap((s) => {
        const p = s.placePrediction;
        if (!p?.placeId || !p.text?.text) return [];
        return [
          {
            placeId: p.placeId,
            text: p.text.text,
            main: p.structuredFormat?.mainText?.text ?? p.text.text,
            secondary: p.structuredFormat?.secondaryText?.text ?? "",
          },
        ];
      });
    } catch (e) {
      console.error("[places] autocomplete failed:", e instanceof Error ? e.message : e);
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
});

/** Signed-in users only, so the paid Places calls can't be used anonymously. */
export const suggestAddress = action({
  args: { input: v.string() },
  handler: async (ctx, args): Promise<AddressSuggestion[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in.");
    if (args.input.length > 120) return [];
    return await ctx.runAction(internal.places.suggestForInput, { input: args.input });
  },
});
