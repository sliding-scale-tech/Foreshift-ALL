# Missing / to confirm later

Running list of things that are not done yet or that were guessed. Nothing here blocks the current pages;
each item says what is missing and why. Update as items get closed.

## Verification gaps
- **Signed-in round trip is untested.** `outlookApp.getMine` / `ensure` / `getWeek` were type-checked, and their
  output was compared with the Bubble-fed path and rendered with fixtures (auth bypassed temporarily), but never
  run in a real signed-in browser session (Clerk does not load in the preview pane). First real load of each page
  calls Gemini (a few seconds). Do this check first.
- **Cold-load latency.** Every new zone × concept × type × date costs a Gemini call on first visit. Optional fix:
  generate today's outlooks for all active operators from the daily cron.
- **Weather page, other days.** Picking another day regenerates the weather narration for that day (one Gemini call
  per new day). Unknown whether Bubble changes the banner text per day or keeps it on today.

## Layout / polish
- **Browser-zoom mismatch (found 2026-09-21):** the owner's Bubble tab runs at 80% browser zoom (reports 1837px
  wide, pixel ratio 1.6) while localhost runs at 100% (1470px, ratio 2), so Bubble's identical CSS sizes look 20%
  smaller. At equal zoom the sizes match (verified by measurement). If the owner wants the denser look by default,
  one CSS `zoom: 0.8` on the app shell does it — not applied because real Bubble users at 100% zoom see the
  larger size.
- **Type/size pass done for the signed-in pages** (Daily, Weekly, Events, Event Outlook, Weather, sidebar, date
  picker): every font size, weight, card size, padding and gap was measured in the live Bubble app
  (`foreshift-ai.bubbleapps.io/version-test/dashboard/...`, viewport 1838px) and matched; our render at 1838px is
  within ~2–4px of Bubble everywhere. The design screenshots the owner sends are scaled ~1.09×, which is why the
  first version was too big — always measure the live app instead of the screenshot.
- **Not re-measured:** sign-in / sign-up / onboarding pages were sized from screenshots before this pass and may
  still be ~9% large (they need a logged-out Bubble session to measure).
- Bubble's Event Outlook page has **no sidebar**; ours keeps the sidebar (screenshot was cropped). Confirm.
- Bubble's Weather banner sits 4px higher than the other pages' banners; not replicated.
- Day-card grids are 7 columns with a 24px (Weekly/Weather) or 12px (Events) gap from 1500px wide; Bubble centers
  7 fixed 197/207px cards instead. Below 1500px we switch to 4 columns.
- Weather drivers in the Top Demand Drivers list use a single 🌦️ emoji like Bubble; other emoji icons approximate
  Bubble's.
- **Responsive / mobile:** the 260px sidebar never collapses; day grids fall from 7 to 4 columns below 1400px.
  The Events table is cramped below ~1300px.
- **Icons are approximations.** Event icons (stadium / ticket / tent / microphone) are emoji; weather icons for
  Snow, Fog/Mist, Thunder and Partly Cloudy are my own drawings (Cloudy, Clear/Sunny, Rain follow the screens).
  Bubble's actual image assets were not copied. Driver rows on Daily now use the same emoji/weather icons.
- **Date picker (Events):** native `<input type="date">`; Bubble shows a text-style field with "Sep 21, 2026".

## Daily Outlook
- Day switcher (Bubble navbar day cards → `d` URL param). The page accepts `?date=YYYY-MM-DD` only.
- "Today's" wording is used even when viewing another date via `?date=`.

## Weekly Outlook
- **Grid vs. curve numbers in the Bubble screenshot disagree** (cards 30.7 / 44.1 / 43.44 / 86.6 / 146.2 / 140 / 55.3,
  curve 19 / 57 / 57 / 112 / 147 / 143 / 48). The curve matches current `resolvedDemand` peaks exactly, so the cards
  were probably stale Bubble rows. We use the current peak for both. Confirm which field Bubble's cards read.
- Drivers subtitle says "Factors influencing today's forecast." — copied from Bubble, likely a copy slip.
- Bubble's driver rows all show "10:00AM" (looks like placeholder); we show the real event start time.
- Week label rule (`ceil(Monday's day / 7)`) inferred from one example (Sep 21 → "Week 3").
- Whether clicking a day card in the grid should open that day in Daily Outlook.

## Events Overview
- **Filters now follow Bubble** (owner screenshots): Radius 0.1–1.5 in 0.1 steps; Venue Types = the fixed 15-venue
  list; Date = calendar popup. Still guessed: Radius means "distance ≤ value"; venues not in Bubble's fixed list
  (e.g. new Ticketmaster venues) can't be filtered, same as Bubble; the date popup allows any date, not only this
  week (other weeks just show no events).
- **Calendar badge** (0.5 / 1) = proximity of the day's earliest event — inferred from the screenshot; confirm.
- Clicking a calendar day filters the table by that date — my addition; Bubble behavior unknown.
- "Est. Impact" = proximity (values 0.5 / 1 in the screenshot); confirm it isn't something else.
- Top Event Today and the brief are for today only; the table/calendar cover the whole week.
- "How Events Shape Demand" text copied as-is (first and third lines are identical in Bubble).

## Event Outlook (single event, `/events-overview/[eventId]`)
- Opens from the Top Event Today card (owner-confirmed). I also made the table rows open it (the row chevron
  suggests it) — Bubble behavior for rows unknown.
- The left card is titled "Top Event Today" only when opened from that card; from a row it says "Event Details".
  Bubble probably shows "Top Event Today" for every event — confirm.
- Per-daypart **band and score** come from the day's resolved demand (matches the screenshot's 30.7 / 1.9 / 0.0 /
  0.4 = the day's daypart scores); the **percent** and the headline band/percent are the event's isolated lift
  (same math as `POST /event/impact`). Confirm this is how Bubble combines them.
- Event Time shows "All day" for timeless events (Huntington Place) — my wording.
- Event start time is shown as 24h `HH:MM` (as in the screenshot).

## Weather Outlook
- **Severity pill thresholds** (only "Low severity" seen): I used Low < 0.25, Moderate ≥ 0.25, High ≥ 0.5.
- Styling of negative weather impact (red in my version) and the sign format ("+0%" panel vs "0%" cards) copied
  from the one screenshot.
- Days before today have no weather data (sync window starts today) → "No forecast".

## Settings / Billing / FAQS / Feedback Loop (built 2026-09-21)
Verified against Bubble's measured sizes (within ~1–2px) and with stubbed data; **none of the save/submit paths were run in a
real signed-in session** (Clerk `user.update`, `user.updatePassword`, `operators.updateProfile/updateHours`, `feedback.submit`).
- **Settings – Email is read-only.** Changing a Clerk primary email needs a verification flow; Bubble's field looks editable.
- Settings – password: Google-only accounts have no password, so the Old-password field is hidden and the card sets one; Bubble's
  behavior for that case is unknown. Save confirmations ("Saved.", "Password updated.") and error texts are mine.
- Settings – Operating Hours selects offer "Closed" for a blank time (an empty open/close = closed that day, same as onboarding).
- **Billing is static** and the **Upgrade / Contact Sales buttons do nothing** (no Stripe checkout, no contact flow). The first tier
  gets the blue "current plan" border as in the screenshot — assumption. FAQ copy quotes different prices ($199 report / $99–199
  AI pass) than the tier cards; text is verbatim from Bubble.
- FAQS – all items start closed (Bubble loads them closed; the first was open only in the owner's screenshot). Several can be open
  at once. The open/close animation is ours (Bubble has none).
- **Feedback Loop is a dialog, not a page** — opened from the sidebar on any page (portal to <body>). Stores one row per operator
  per Detroit date in the new `feedback` table (`clerkId`, zone, concept, date, per-daypart `actual` + snapshot of the predicted
  score/band); resubmitting the same day replaces it; the dialog opens pre-filled. Needs ≥1 daypart picked; clicking a picked
  rating again clears it. Shows a "Thank you!" state for ~1.6s (Bubble's post-submit behavior unknown).
- **"Predicted" pill:** Bubble showed STEADY for all four dayparts of a day whose bands differed (looks static/buggy). Ours maps the
  forecast band → Dead/Slow/Steady/Busy/Slammed (Minimal→Dead, Light→Slow, Moderate→Steady, High→Busy, Peak/Exceptional→Slammed,
  per the FAQ's "you reported Busy, the forecast was High"). Pill colours other than Steady are guesses.
- The FAQ mentions "optional actual covers" in the feedback flow — not in the dialog design, not built.
- No admin view / export of the `feedback` table yet (data is only readable by its owner via `feedback.getToday`).
- Rating icons and the four daypart icons in the dialog are hand-drawn approximations of Bubble's.

## Elsewhere (from earlier)
- "I'm exploring" onboarding branch; Forgot-password flow.

## Onboarding — zone finder
- **Address autocomplete is built** (`components/AddressInput.tsx` → Convex `places.suggestAddress` → Google Places API (New),
  server-side with the same `GOOGLE_MAPS_API_KEY`; biased to Detroit, US only). Used on the Address field and in the zone
  finder modal. Verified: backend suggestions (real Google) and the dropdown UI (stubbed suggestions; keyboard + mouse).
  Not yet run in a real signed-in session. Shows a plain "Powered by Google" text — Google's attribution guidelines
  prefer their logo; swap in the official asset if this ships publicly.
- Zone finder geocodes with Google first, then Census, then OpenStreetMap. Vague input like just "Detroit" is not
  found / outside coverage by design.
- Each autocomplete keystroke (debounced 250ms, ≥3 chars) is one paid Places call; no session tokens are used.
- The main Address field isn't linked to the modal: the modal is prefilled with it, and only fills it back if it
  was empty.
- **Zone auto-fill:** picking an address suggestion in the main Address field runs the same lookup as "Find my zone" and
  fills the Zone (note "Zone identified from your address."); outside Detroit / unplaceable → a warning, and a zone that
  an earlier lookup filled is cleared (a zone the user picked by hand is never touched). Typing an address without picking
  a suggestion doesn't trigger it — use the modal. Verified with stubbed backend calls only.

## Billing gate (Stripe, built 2026-09-21)
Real backend verified end-to-end in test mode: created a live Stripe customer + Checkout Session and loaded the actual
Checkout page (Event Intelligence, $99/mo, correct product). Did not submit a test card / complete a purchase myself.
The gate itself (white screen + upgrade dialog on the 4 Intelligence pages, Settings/Billing/FAQS/Feedback Loop staying
reachable) was verified with a temporary query-param stub (`?__qa=trial|active|expired|pastdue`), since there's no
signed-in session in the preview browser. **Nothing here has run in a real signed-in session.**

- **Trial:** 7 days from `operators._creationTime` (`convex/lib/access.ts`, `TRIAL_DAYS`), not from Clerk account creation.
  Change `TRIAL_DAYS` there if the owner meant something else.
- **Access rule:** `hasAccess = subscriptionStatus in {active, trialing, past_due} OR still within the 7-day trial`.
  `past_due` still has access (Stripe is mid-retry on the card) — access drops once Stripe gives up and moves the
  subscription to `unpaid`/`canceled`, which is when "if not renewed, gate reapplies" actually fires.
- **Webhook not configured yet** (`STRIPE_WEBHOOK_SECRET` unset) — renewals/cancellations won't update access until the
  owner adds the endpoint in the Stripe dashboard (Developers → Webhooks → this app's `{CONVEX_SITE_URL}/stripe/webhook`,
  events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) and sets the
  secret. Until then, only the client-side sync right after Checkout (`stripe.syncCheckoutSession`, called from
  `/billing?checkout=success`) updates `subscriptionStatus` — good enough to unlock access once, but a renewal or a
  cancelled card won't be reflected without the webhook.
- **"Manage billing"** opens Stripe's hosted portal (update card, see invoices, cancel) — not yet configured in the
  Stripe dashboard (Settings → Billing → Customer portal) for this test account; the action will error until it is.
- Dynamic Scheduling / Sales Forecasting tiers stay "Contact Sales" / disabled, per "only $99 plan is active in Stripe".
- The gate dialog's wording for `past_due` ("Your last payment didn't go through…") is my own text — not specified.
- `createCheckoutSession`/`createPortalSession` build redirect URLs from the caller's `window.location.origin`, trusted
  without an allow-list (low risk — worst case is a redirect, and the action requires a signed-in session) but worth
  tightening if this goes to production with a fixed domain.
- No proration/downgrade UI (only one plan exists) and no cancel-from-app button outside the Stripe portal.

## Performance / UX (2026-09-22)
- **Fixed: loader on every page switch.** Convex has no built-in stale-time cache — unsubscribing (leaving a page)
  drops its cached result entirely, so revisiting a page re-fetched from zero every time, even seconds later. Added
  `hooks/useStickyValue.ts` (a module-level "last known good value" cache) and wired it into `useOutlook`, `useWeek`,
  and the Event Outlook page's `getEventImpact` query. A page you've already visited this session now updates in
  place instead of blanking to a spinner. First-ever visit to a page still shows the loader (unavoidable — there's
  real data to fetch). Verified by code/type review only — a live timed reproduction needs a real signed-in session.

## Mobile responsiveness (2026-09-22)
Built a phone-width pass across the whole app, driven by two real bugs the owner reported from an actual resized
window (not synthetic testing), then swept every other page.
- **Sidebar** is now an off-canvas drawer below 900px (`components/Sidebar.tsx`/`.module.css`): a fixed hamburger
  button top-left, a backdrop, slide-in `<aside>`, closes on backdrop click, Escape is NOT wired (only backdrop/X/
  nav-click), auto-closes on navigating or opening Feedback Loop. `--sidebar-width` is now a CSS var
  (`app/globals.css`) so the gate screen and any future full-bleed layout stay in sync with it.
- **Real bug found by the owner:** the 7-day grids (Weekly's day cards, Events Calendar, Weather Calendar) used a
  fixed `4 → 7 columns` breakpoint ladder with a gap in between — any width above the old "collapse to 2 columns"
  point but below the 7-column point (roughly 700–1399px, e.g. a resized browser window, not just a phone) stayed at
  a cramped 4 columns and visibly overflowed/truncated. Replaced the whole "below 1400px" range on all three grids
  with `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))` — continuous, no more gap at any width. The
  desktop 7-column layout (≥1400px, measured against Bubble) is untouched.
- **Real bug: Operating Hours rows** (onboarding step 3 AND Settings — same layout in two places) truncated the
  time selects to a single letter ("C…") on a phone; the 4-column row (day / open / "to" / close) has no room for a
  full "12:00 AM" below ~480px. Fixed in both places by stacking: day label on its own row, then the two selects
  below it.
- **Real bug: Events Overview's Nearby Events table.** The 7-column desktop table (27/16/14/13/14/12/4%) doesn't
  degrade — at 375px it visually overlapped (event name overlapping venue/date text). Added a second, mobile-only
  card layout (`.mobileRow` in `events.module.css`) rendered alongside the existing `.tableRow`, CSS-toggled at
  700px; same data, no desktop change. The pager (« ‹ 1 of 1 › » + Page/Go) also wraps to two centered rows below
  500px instead of clipping at the edge.
- **Checked clean with no changes needed:** Daily Outlook, Weekly Outlook's chart/drivers, Event Outlook detail page,
  Weather Outlook (banner, calendar, daypart impact grid — an existing 800/1100px breakpoint already handled it),
  sign-in/sign-up, onboarding steps 1–2, the Same-Timings and Zone-Finder modals, FAQS (accordion + animation), and
  the Feedback Loop dialog (an existing ≤1000px breakpoint already collapsed its 3-column grid to stacked cards).
- **Not done:** landscape phone widths weren't separately checked (only portrait, 375–900px range covered by sweeping
  several widths incl. the reported 700–750px zone); tablet-range (900–1400px) spot-checked only on the three grids
  that were broken, not pixel-by-pixel on every page; no dedicated touch-target size audit (some buttons may be
  under the ~44px recommended tap target on the densest pages, e.g. Events table row chevrons).
