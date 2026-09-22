# ForeShift — handoff for the next agent (Cursor)

Written 2026-09-21 at the end of a long Claude Code session. Everything below is current as of that moment.
**No secrets are in this file.** Never paste API keys into code/docs; names of env vars only.

Read these first, in this order:
1. This file.
2. `foreshift-new/web/DATA_SOURCES.md` — where every page's data comes from (Convex ↔ Bubble mapping).
3. `foreshift-new/web/MISSING.md` — running list of everything not done / guessed / to confirm.
4. `foreshift-new/my-app/CLAUDE.md` — backend build reference + the frontend scope rule.
5. `foreshift-new/web/AGENTS.md` — "This is NOT the Next.js you know" (Next 16.3.5): read `node_modules/next/dist/docs/` before writing Next code.
6. `foreshift-new/my-app/convex/_generated/ai/guidelines.md` — mandatory Convex rules.

---

## 1. What the product is

ForeShift = demand forecasting for Detroit restaurants. **Zone demand** = how busy a *zone × concept* will be per
*day × daypart*, computed as `final = MIN((base_score + Σ event_lift) × weather_factor, 150)`, banded
Minimal/Light/Moderate/High/Peak/Exceptional (thresholds 0–19, 20–39, 40–64, 65–84, 85–109, 110–150). Terminology:
always "zone demand", never "restaurant demand".

- **13 zones, 9 concepts, 7 days (Mon..Sun), 4 dayparts (morning/midday/dinner/late).** Canonical strings live in
  `my-app/convex/lib/vocab.ts` (`ZONES`, `CONCEPTS`, `DAYS`, `DAYPARTS`). Exact-string matching matters.
- **Today's production stack:** the frontend is **Bubble** (`foreshift-ai.bubbleapps.io`, `/version-test/`), the backend is
  **Convex** (deployment `neat-frog-865`, dev deployment; dashboard team `dev-d2b99`, project `foreshift`).
  Bubble calls Convex HTTP endpoints; Convex crons write signals *into Bubble* via Bubble's Data API.

## 2. The mission of this workstream

Build a **new, separate Next.js operator web app** (`foreshift-new/web`) that recreates the Bubble operator frontend
pixel-for-pixel, **running alongside Bubble**, on the **same Convex deployment and same Clerk instance** as the admin
console (`foreshift-new/my-app`). The web app reads **Convex only, never Bubble**.

### Standing rules from the owner (non-negotiable)
1. **Bubble and the existing Convex→Bubble sync must keep working exactly as before.** Changes to Bubble-facing Convex code
   are additive only, unless the owner explicitly asks. Don't repurpose/break existing HTTP endpoints or schema Bubble uses.
2. Every new frontend request is for the **separate** app `foreshift-new/web`. Never add operator routes to `my-app/app`.
3. The daily cron now populates **both** Bubble and Convex; only the new frontend uses Convex.
4. Creating test rows in Convex is fine, but **clean them up afterward.**
5. Match Bubble "just like it is". The owner sends screenshots, but see §8 — **never take pixel sizes from screenshots**.
6. Don't create real Clerk accounts / type passwords when testing (verify auth-gated UI with a temporary bypass, then revert).

## 3. Repos, layout, how to run

`foreshift-new/` is an **npm workspace** (root `package.json`: workspaces `my-app`, `web`). Two separate git repos:

| Path | What | Git |
| --- | --- | --- |
| `foreshift-new/my-app` | Convex backend (`convex/`) + admin console (Next app at its `app/`, port 3000) | branch `staging`, remote `client` → `github.com/foreshift-dev/convex-foreshift`; **17 uncommitted files** |
| `foreshift-new/web` | New operator app (Next 16.3.5, React 19, port **3010**) | branch `main`, one commit ("Initial commit from Create Next App"); **20 uncommitted entries — nothing of this work is committed yet** |

- `web` imports the backend through the workspace link: `my-app/convex/_generated/api` (typed function refs), `my-app/convex/lib/vocab`
  (constants) and `my-app/convex/lib/outlook` (**types only**, e.g. `TodayOutlookResult`).
- Turbopack roots: `my-app/next.config.ts` → its own dir; `web/next.config.ts` → `..` (so `my-app` imports resolve).
- **Run web:** `cd foreshift-new/web && npm run dev` (port 3010; a preview config `foreshift-web` exists in `~/Desktop/.claude/launch.json`).
- **Deploy Convex:** `cd foreshift-new/my-app && npx convex dev --once` (pushes functions/schema to `neat-frog-865`; regenerates `_generated`).
  Codegen/CLI need a logged-in Convex CLI (`npx convex dev` interactively if you see "You don't have access to the selected project").
- Run a function: `npx convex run <module>:<fn> '<json>'`; ad-hoc reads: `npx convex run --inline-query '<js using ctx.db>'`.
- Type-check/lint: `npx tsc --noEmit -p convex` + `npx eslint convex/<file>` in `my-app`; `npx tsc --noEmit && npx eslint app` in `web`.
- Lint rule `@convex-dev/explicit-table-ids`: `ctx.db.patch("table", id, …)` / `ctx.db.delete("table", id)` need the table name.

### Env vars (names only)
- `web/.env.local`: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, Clerk sign-in/up URLs (same values as `my-app/.env.local`).
- Convex env (`npx convex env list`): `BUBBLE_API_BASE` (`https://foreshift-ai.bubbleapps.io/version-test/api/1.1/obj/`), `BUBBLE_API_TOKEN`,
  `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `TICKETMASTER_API_KEY`, `WEATHERAPI_KEY`,
  optional `FORESHIFT_SHARED_SECRET`, `BUBBLE_DEMAND_TABLE`.
- `GOOGLE_MAPS_API_KEY` **is set and working** (verified 2026-09-21: "1 Campus Martius" → Downtown Detroit (Core), matched addresses come back in Google's format). Gotcha found on the way: the first value stored was the *masked* key
  from the Google Cloud table (ends in "••••") → Google said "API key is invalid"; re-set with the real key fixed it. Server key: restrict by API (Geocoding) only, not by HTTP referrer.
  `lib/geocode.ts` order: Google (only results precise enough to place: street_address/premise/route/establishment/etc.) → US Census → OSM (place_rank ≥ 26). Vague input ("Detroit") is treated as not found.
  No browser-side Google key is needed: autocomplete also runs server-side (needs the **Places API (New)** enabled and allowed on the key — it is).

## 4. Backend (Convex) — what exists

### Tables (`my-app/convex/schema.ts`)
- Coefficients: `eventMagnitude`, `eventAffinity`, `weatherAffinity` (owner-editable via admin, trade-secret: only via internal functions), `zoneGeometry` (13 polygons + centroids).
- `users` (Clerk webhook sync; `role` admin|user), `operators` (**new**: `clerkId`, `restaurantName`, `address`, `zone`, `conceptType`, `operatingHours[]`; index `by_clerkId`).
- Mirrors of Bubble tables written by the same cron actions: `eventSignals`, `weatherSignals`, `resolvedDemand`.
- **New:** `demandScores` (base score/band per zone×concept×day×daypart, 819 rows, one-off upload from `convex/data/baseDemand.json` built from `my-app/foreshift_base_demand_wide.csv` via `npx convex run outlookApp:seedDemandScores`; already loaded) and `outlookCache` (generated outlook JSON incl. Gemini text per zone×concept×type×date, with a `fingerprint` of the numeric inputs).
- `bubbleSyncLog`.

### Pipeline (unchanged behavior for Bubble; Convex mirror added)
Cron `daily signal sync` (`crons.ts`, 05:05 UTC): events (Ticketmaster + Huntington Place scrape) → chained → weather (WeatherAPI) → chained → resolvedDemand
(`operatorWeek.ts`, reads Bubble `DemandScore` + signals, resolves every zone×concept×day, upserts Bubble `ResolvedDemand`). After each Bubble write it now also
upserts the Convex mirror (`signalsStore.ts`). A missed cron earlier was caused by a Bubble plan/API 401 ("does not expose an API").

### New functions for the web app
- `operators.getMine`, `operators.create` (onboarding), `operators.updateProfile`, `operators.updateHours` (Settings).
- `feedback.getToday` (query) / `feedback.submit` (mutation) — "How was your day?" dialog; table `feedback`.
- `outlookApp.ts`:
  - `getMine({type: today|weekly|events|weather, date?})` query → cached outlook + `fresh` flag + raw daypart weather. Zone/concept always come from the caller's `operators` row.
  - `ensure({type, date?})` action → generates via the *same* math and Gemini narration as `/demand/outlook` (`lib/outlook.ts`, now takes optional `inputs` so it can run on Convex tables instead of Bubble reads), stores in `outlookCache`; no-op if fresh.
  - `getWeek()` query → operator's Mon..Sun week: per-day peak demand + weather, all de-duplicated events (no AI).
  - `getEventImpact({eventId, date?})` query → one event's isolated impact per daypart (same math as `POST /event/impact`).
  - `loadInputs` (internal) maps Convex rows to the shapes Bubble readers return (normalizes `eventTime` "HH:MM:SS"→"HH:MM").
  - `seedDemandScores` (internal mutation).
- `places.suggestAddress({input})` (public action, signed-in only; wraps `places.suggestForInput`) → address suggestions for autocomplete.
- `stripe.ts`: `createCheckoutSession`/`createPortalSession`/`syncCheckoutSession` (actions) — Stripe REST client in `lib/stripe.ts` (no SDK dep), webhook signature verify in `lib/stripeWebhook.ts`, webhook route `POST /stripe/webhook` in `http.ts`. Access decision (trial/paid) in `lib/access.ts`, folded into `operators.getMine` as `.access`.
- `zones.findMyZone({address})` (public action, signed-in only) → `{status: ok|outside_coverage|not_found, zone?, matchedAddress?}`; wraps `zones.findZoneForAddress` (internal) = `lib/geocode.ts` (Google Geocoding if `GOOGLE_MAPS_API_KEY` set → US Census → OSM Nominatim) + `zones.assign` (point-in-polygon).
- Existing Bubble-facing HTTP endpoints (do not break): `POST /demand/outlook` (`type` today|weekly|events|weather, optional `date`), `/event/impact`, `/zone-demand`, `/zone-assign`, `/operator/week`, `/ai/ask`, Clerk webhook.

### Verified facts
- Convex-native outlook for today/weekly/events/weather == Bubble-fed `/demand/outlook` output for the same zone×concept (all non-AI fields identical). Event impact 189.4% for Tigers game matched `/event/impact`.
- Woodward Core × Upscale Casual `resolvedDemand` (Mon..Sun peaks 26.3, 64.6, 56.3, 98.6, 138.6, 123.2, 67.3) equals Bubble's screen exactly.
- **Uncommitted edits by someone else in `my-app`** (not mine): `lib/outlook.ts` `day_summary`, `lib/vocab.ts` `detroitDate`/date math, `crons.ts` time change. Be careful editing those files.

## 5. Frontend (`web`) — what exists

Stack: Next 16.3.5 (**`proxy.ts` not `middleware.ts`**, async `params`, `PageProps<>`), React 19, Clerk (custom flows; legacy hooks from `@clerk/nextjs/legacy`,
Google OAuth via `authenticateWithRedirect` + `/sso-callback`), Convex (`ConvexProviderWithClerk`), CSS modules + tokens in `app/globals.css`, ApexCharts
(`react-apexcharts` via `next/dynamic`, ssr:false), Inter font.

```
app/
  sign-in, sign-up, sso-callback        Clerk custom auth (Google + email/password)
  onboarding/                            4 steps (choice → restaurant info → operating hours → success); zone-finder modal
  page.tsx                               routing gate (onboarded → /dashboard, else /onboarding)
  (app)/layout.tsx                       auth + onboarding gate + <Sidebar/>; shared.module.css (title/banner/card/etc.)
  (app)/dashboard                        Daily Outlook  (+ outlook-data.ts mapper)
  (app)/weekly-outlook, events-overview, events-overview/[eventId] (Event Outlook), weather-outlook
  (app)/settings, billing, faqs          Settings (Clerk + operators), Billing (tiers + Stripe checkout/portal), FAQS (static accordion, animated)
  (app)/(intelligence)/…                 dashboard, weekly-outlook, events-overview(+[eventId]), weather-outlook — gated by layout.tsx (trial/subscription)
  (app)/[section]                        placeholder route for anything not built (now nothing in the sidebar uses it)
  components/                            Sidebar (Feedback Loop opens FeedbackModal), UpgradeGate (trial/subscription gate), SameTimingsModal + ZoneFinderModal (shared by onboarding & Settings), BandPill, DaypartIcon, DemandAreaChart, DriversCard, DatePicker, EventIcon, WeatherIcon, PageLoading, icons
  hooks/                                 useAccess (trial/subscription gate), useZoneAutofill (address pick → zone), useMyOperator, useCurrentUser, useOutlook, useDailyOutlook, useWeek, useOnceReady
  lib/                                   week.ts (date helpers), dayparts.ts, drivers.ts
```
- **Loading behavior (owner requirement):** every page shows a full-page spinner and renders nothing until ALL its data is ready; a stale cached outlook is never shown (waits for regeneration). Weather page: first load gated, later day switches update in place.
- Pages read Convex through `useOutlook` (→ `outlookApp.getMine` + one-shot `ensure`), `useWeek` (→ `getWeek`), `useQuery(getEventImpact)`.
- First visit of each zone×concept×type×date triggers a Gemini call (few seconds), then it's cached.
- Page shells: title 44/700, sidebar 240px, main padding 32, cards radius 12 — see §8.

## 6. Status

**Done:** auth (email + Google), onboarding incl. zone finder, Daily / Weekly / Events / Event Outlook / Weather pages, Convex-only data layer, base-score upload, Bubble parity measurement pass.

**Not verified in a real signed-in session:** Clerk doesn't load in the Claude preview pane, so every page was verified with a temporary auth bypass + fixtures and by comparing backend output to Bubble's — never with a real login. **First thing to do: sign in on localhost:3010 and click through every page + onboarding.**

**Open items / ideas (full list in `MISSING.md`):**
- (Done: Google key works.) Re-run `npx convex run zones:findZoneForAddress '{"address":"2001 Woodward Ave Detroit"}'` — with Google active `matchedAddress` looks like "2001 Woodward Ave, Detroit, MI 48201, USA" (Census returns UPPERCASE).
- (Done) Address autocomplete: `places.suggestAddress` (Google Places API (New), server-side, same key) + `components/AddressInput.tsx`, used on the onboarding Address field and the zone-finder modal. Picking a suggestion auto-fills the Zone via `zones.findMyZone` (onboarding `handleAddressPicked`).
- **Bubble's Events banner sometimes shows "Cannot fetch event impact right now"** (seen for Woodward Core × Upscale Casual). Not investigated. Suggested first step:
  `npx convex run outlook:getOutlook '{"zone":"Woodward Core","concept":"Upscale Casual","type":"events"}'` (Bubble-fed path; the Convex-native path is `outlookApp`). Likely a failure in the Bubble workflow / Gemini call rather than in the web app.
- (Done 2026-09-21) Settings, Billing, FAQS pages and the Feedback Loop dialog — see MISSING.md for what was guessed.
- (Done 2026-09-22) Stripe billing/trial gate — see §9.
- (Done 2026-09-22) Mobile responsiveness pass + the "loader on every page switch" fix — see MISSING.md "Performance / UX" and "Mobile responsiveness". `hooks/useStickyValue.ts` is the fix for the loader; `components/Sidebar.tsx` now has an off-canvas drawer below 900px (`--sidebar-width` CSS var in `globals.css`).
- Still open: "I'm exploring" onboarding branch, Forgot-password flow, Contact Sales wiring for the two non-Event-Intelligence tiers.
- Event detail chevrons/rows open Event Outlook (heading "Top Event Today" only when opened from the Top Event card, else "Event Details") — confirm with owner.
- Guesses to confirm: Radius = distance ≤ value; calendar badge = proximity of the day's earliest event; weather severity thresholds (Low <0.25, Moderate ≥0.25, High ≥0.5); Est. Impact = proximity; Event Outlook per-daypart score/band = the day's resolved demand.
- Day switcher on Daily Outlook (Bubble's `d` param) — page accepts `?date=YYYY-MM-DD` only.
- Sign-in/sign-up/onboarding font sizes were taken from screenshots before the measurement pass and may be ~9% large — re-measure against Bubble.
- Responsive/mobile: sidebar never collapses; day grids drop from 7 to 4 columns below 1400px.
- Icons are approximations (emoji for events/weather drivers; hand-drawn weather icons for Snow/Fog/Thunder/Partly Cloudy).
- Nothing is committed — commit both repos (mind that `my-app` also holds another person's uncommitted work).

## 7. Cheat sheet

```bash
# web
cd foreshift-new/web && npm run dev            # http://localhost:3010
# backend deploy / data
cd foreshift-new/my-app && npx convex dev --once
npx convex run outlookApp:seedDemandScores     # idempotent base-score upload (already done)
npx convex run zones:findZoneForAddress '{"address":"2001 Woodward Ave Detroit"}'
npx convex run outlook:getOutlook '{"zone":"Woodward Core","concept":"Upscale Casual","type":"today"}'   # Bubble-fed path (for comparing)
npx convex run --inline-query 'return (await ctx.db.query("operators").collect()).length;'
```
Owner's test operator in Convex: "aisle" — Woodward Core × Upscale Casual (also an older "sdsd" — Downtown Detroit (Core) × Fine Dining).

## 8. Hard-won lessons

1. **Never take pixel sizes from the owner's design screenshots.** They're scaled (Bubble's sidebar is really 240px, not 260px) and the owner's Bubble tab runs at **80% browser zoom**
   (reports 1837px wide, DPR 1.6) while localhost runs at 100% (1470px, DPR 2), so Bubble looks 20% smaller than the same CSS px here. The sizes in the app match Bubble's real CSS px
   (measured with JS in the live app). If the owner wants the denser look, one `zoom: 0.8` on the app shell does it (not applied — real Bubble users at 100% see the larger size).
2. **Measure Bubble live** via Chrome MCP (owner is logged in): `https://foreshift-ai.bubbleapps.io/version-test/dashboard/{daily-outlook,weekly-outlook,events-overview,weather,event-details?e=<id>}`
   — read computed `font-size`/`font-weight`/rects with JS at ~1838px viewport. Bubble body text is 14px; Bubble uses the pickadate date picker and emoji for event/weather driver icons.
   **Bubble is read-only for us** — earlier a stray click edited a live style; use view-only navigation and never edit in the Bubble editor unless asked.
3. Bubble's `DemandScore` (base scores) was a one-off CSV upload; Convex has never written it. Convex now has its own copy (`demandScores`).
4. Next 16: `proxy.ts` (not `middleware.ts`), `overflow-x: clip` (not `hidden`) on html/body or the sticky sidebar breaks; Clerk needs `clerkMiddleware()` in `proxy.ts`.
5. `react-apexcharts` typing vs `next/dynamic` needs a cast (see `DemandAreaChart.tsx`). Apex renders as a thin line if the window is resized before paint — reload.
6. Preview-pane quirks (Claude desktop): screenshots are only legible when the viewport is emulated at ~1000–1200px right before capturing; DOM measurement via JS is more reliable.
7. QA method used everywhere: temporarily bypass the `(app)/layout.tsx` gate and stub hooks with fixtures marked `// TEMP-QA`, verify, revert (`grep -rn TEMP web/app` must be empty).
8. Convex: always add validators; use indexes not `.filter`; actions can't use `ctx.db`; same-file `internal.*` calls need explicit return-type annotations to avoid TS circularity.
9. Memory notes for Claude sessions live at `~/.claude/projects/-Users-umaraurangzeb-Desktop/memory/foreshift-web-app.md` (not needed for Cursor).
