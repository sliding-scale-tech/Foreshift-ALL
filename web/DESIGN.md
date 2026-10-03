# ForeShift web app — current design

What the operator web app (`web/`) actually looks like in code, as of
2026-10-01. Use it to keep new screens consistent and to see what changes when
the design review is applied.

- **This file** describes what is built. When code and this file disagree, the
  code wins. Update this file in the same change.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) is the Bubble style snapshot
  (2026-09-18) the app was originally matched against. Not everything in it is
  used here.
- Tokens live in [app/globals.css](app/globals.css). Every component has its own
  CSS module; shared page styles live in
  [app/(app)/shared.module.css](app/(app)/shared.module.css).

Sizes were measured from Bubble at 100% zoom. The owner's screenshots are at
80% zoom, so never take pixel sizes from them (see `CURSOR_HANDOFF.md` §8).

---

## 1. Foundations

### Font
Inter via `next/font` (`--font-inter` → `--font-sans`). One family everywhere.
Body default is 14px in app screens and line-height 1.43 in `main`.

### Color tokens in use

| Role | Token | Value | Where |
|---|---|---|---|
| Brand navy | `--color-primary` | #011442 | Sidebar background, wordmark "Fore" |
| Action blue | `--color-shift-electric-blue` | #027ffc | Primary buttons, active nav item, links, selected chips, wordmark "Shift" |
| Action blue hover | `--color-shift-cobalt` | #0166f7 | Button hover |
| Page canvas (signed in) | `--color-canvas` | #f0f4f9 | Behind cards in the app shell |
| Page background (public) | `--color-gray-10` | #f7f7f7 | Auth, onboarding, legal pages |
| Surface | `--color-surface` | #ffffff | Cards, inputs, modals |
| Text | `--color-text` | #1a1a1a | Body and headings |
| Secondary text | `--color-gray-70` | #525252 | Windows, captions, helper text |
| Muted text | `--color-gray-60` / `--color-grey-text` | #8a8a8a / #464554 | Small captions, auth subtitles |
| Border | `--color-borders` | #e2e8f0 | Card and default input borders |
| Strong border | `--color-gray-50` | #a6a6a6 | Onboarding inputs, hours editor |
| Error | `--color-destructive-70` | #b0200c | Field errors, warnings |
| Focus ring | `--color-primary-50` | #1e6df6 | Input focus border |

Navy surfaces that are **not** tokens (hard-coded):
- Brief banner: `linear-gradient(90deg, #0b1d57, #172a63)`, border `#c7c4d7`.
- Auth left panel: `linear-gradient(160deg, --color-dark-background, --color-primary)`.
- Billing tier header: `linear-gradient(180deg, #011442, rgba(1,20,66,.8))`.

Text on navy uses white at 0.88–0.95 opacity, and titles use `--color-primary-40` (#afcef8).

### Demand band colors ([BandPill](app/components/BandPill.module.css))

Each pill uses the scale's -20 background, -30/-40 border and -70/-80 text. The
pill is 14px/400, padding 5px 6px, radius 6.

| Band | Score | Scale |
|---|---|---|
| Minimal | 0–19 | gray |
| Light | 20–39 | primary (text = electric blue) |
| Moderate | 40–64 | alert (amber) |
| High | 65–84 | destructive (red) |
| Peak | 85–109 | success (green) |
| Exceptional | 110–150 | secondary (purple) |

Colour is always shown together with the band name, so meaning never depends on colour alone.

### Daypart identity ([DaypartIcon](app/components/DaypartIcon.module.css))

A 40px circle with a 20px icon.

| Daypart | Label | Window shown | Icon | Circle / icon |
|---|---|---|---|---|
| morning | Morning | 6:00 AM – 11:00 AM | sun outline | #eaf3ff / primary-50 |
| midday | Midday | 11:00 AM – 4:00 PM | sun filled | #fff3d6 / #f5a800 |
| dinner | Dinner | 4:00 PM – 9:00 PM | utensils | #fdeceb / #e04b3a |
| late | Late night | 9:00 PM – 2:00 AM | moon | #d7dbe6 / #0b1b47 |

Labels and windows come from [lib/dayparts.ts](app/lib/dayparts.ts). The windows are the ones the
backend scores and buckets events by (`DAYPART_WINDOWS` / `daypartFromLocalTime` in
`my-app/convex/lib/vocab.ts`), so the four periods leave no gap in the day. "Late night" runs to
2 AM; for the open-hours check it stops at midnight. See §7.

### Typography as used

| Use | Size / weight | Notes |
|---|---|---|
| Page title (`shared.title`) | 32 / 700 | Daily, Weekly, Events, Weather, Settings, FAQS |
| Page subtitle (`shared.subtitle`) | 14 / 400 | "Name · Concept · Zone · Date or date range" on every Intelligence page |
| Section title (`shared.sectionTitle`) | 20 / 700 | Margin 24 above, 12 below |
| Card title (`shared.cardTitle`) | 20 / 700 | Drivers card uses 16 / 600 |
| Banner title | 20 / 700, primary-40 | With 24px sparkle icon |
| Banner text | 18 / 400 | White 0.95 |
| Big number (score, temperature) | 28 / 600 | |
| Body | 14 / 400 | |
| Caption / helper | 12–13 / 400 | gray-70, or gray-60 |
| Field label | 12 / 600, uppercase, 0.03em | gray-70 in onboarding; #90a1b9 in Settings |
| Onboarding / auth step heading | 26–30 / 700 | |
| Legal page H1 | 32 / 700 (26 on mobile) | |

### Radius

| Radius | Used for |
|---|---|
| 6 | Band pills |
| 8 | Sidebar nav items, small buttons |
| 10 | Hours editor inputs and buttons, mobile menu button |
| 12 (`--radius-control`) | Cards in the app shell, inputs, primary buttons |
| 16 | Onboarding choice cards, shared-hours panel |
| 20 | Onboarding card, Settings cards, modals, billing tiers |
| 24 | Auth card |
| 999 | Chips, "Not set" badge |

### Shadows

There is no shadow token. Values in use:
- Navy banner: `0 6px 24px rgba(1,20,66,.18)`.
- Raised panels: `0 8px 30px rgba(1,20,66,.06)` (onboarding card) and `0 12px 40px rgba(16,26,44,.08)` (upgrade gate).
- Dropdowns (address suggestions, date picker): `0 8px 28px rgba(16,26,44,.16)`.
- Auth card: `0 20px 60px rgba(1,20,66,.14)`.

App-shell cards are flat: border only, no shadow.

### Motion
`--duration-fast: 200ms` for hover and border transitions. The spinner slows
down under `prefers-reduced-motion`. FAQ accordion is the only animated reveal.

---

## 2. Layout

### Signed-in shell ([app/(app)/layout.tsx](app/(app)/layout.tsx))

```
┌──────────────┬───────────────────────────────────────────────┐
│ Sidebar 240  │ main: padding 32, canvas #f0f4f9              │
│ navy, sticky │  Title 32 / subtitle 14                        │
│              │  Navy banner (brief)                           │
│ Intelligence │  Section title + card grid                    │
│ Account      │  Lower row: chart card (900fr) | side (613fr) │
│ user + logout│                                                │
└──────────────┴───────────────────────────────────────────────┘
```

- **Sidebar** ([Sidebar.module.css](app/components/Sidebar.module.css)): padding 20, wordmark 36/700.
  - Two labelled sections: Intelligence and Account Profile.
  - Nav item: 34px tall, 14/500, radius 8. Active is electric blue; hover is white 7%.
  - Footer: avatar, name, Logout.
- **Below 900px:** the sidebar becomes an off-canvas drawer behind a 44px menu button (top-left). `main` padding becomes 76 / 16 / 24.
- The four Intelligence pages are wrapped by the trial/subscription gate ([(intelligence)/layout.tsx](app/(app)/(intelligence)/layout.tsx)). When access has expired, a centered `UpgradeGate` card replaces the page.

### Public pages
- **Auth** ([AuthShell](app/components/AuthShell.tsx)): one card split in two.
  - Left: navy gradient with logo, headline, blurb, optional check-list and the "System Status" box.
  - Right: the form.
- **Onboarding:** centered, max-width 760 card (radius 20, padding 40/48) on gray-10, with a stepper above it on the restaurant route only.
- **Legal** ([LegalPage](app/components/LegalPage.tsx)): "F" logo and wordmark, then an 800px white article card.
- **Sample outlook:** the app shell without the sidebar, plus a blue "Sample" bar.

---

## 3. Components

| Component | File | What it is |
|---|---|---|
| Navy banner | `shared.banner`, `dashboard.brief` | AI brief. Daily adds a right-hand column with "Demand score", band, number and a 0–150 bar |
| Card | `shared.card` | White, 1px border, radius 12, no shadow |
| BandPill | `components/BandPill` | Demand band label (§1) |
| DaypartIcon | `components/DaypartIcon` | Colored daypart circle (§1) |
| WeatherIcon | `components/WeatherIcon` | Hand-drawn SVG for Clear/Sunny, Partly Cloudy, Cloudy, Rain, Snow, Fog, Thunder. Sized by its parent |
| EventIcon | `components/EventIcon` | **Emoji** by event class (🏟️ 🎫 🎪 🎙️, fallback 📅) |
| DriversCard | `components/DriversCard` | "Top Demand Drivers" list: icon, green "+x%" (whole percent) or gray "No effect", then name and detail. Weather rows use `WeatherIcon`. The same condition is merged into one row that lists its periods, and all no-effect weather shares one row at the bottom ([lib/drivers.ts](app/lib/drivers.ts)) |
| DemandBarChart | `components/DemandBarChart` | Daily Outlook: one bar per daypart, coloured by band ([lib/bands.ts](app/lib/bands.ts)), value on top, fixed 0–150 axis titled "Demand score". A second label line says "Closed" or "No data". The tooltip gives period, score, band and vs. normal, and a screen-reader list repeats it. Also used for Weekly "Daily totals" (7 bars), where `selected` fades the other bars and `onSelect` makes bars clickable |
| Select | `components/Select` | App-styled dropdown used everywhere instead of `<select>` (the browser draws a native list itself, which CSS can't restyle). Trigger variants: `default` (onboarding), `filled` (Settings), `filter` (Events filter bar). List: white card, radius 12, shadow, hovered row primary-10, chosen row blue with a check. Arrow keys, Home/End, Enter, Escape and type-ahead work; opens upward near the bottom of the screen |
| TimeField | `components/TimeField` | Time input with the same list style: type "9:30 pm" or pick a 15-minute suggestion (filters as you type). Used in the hours editor |
| WeatherView | `components/WeatherView` | Weather page body, taking the week and the day's outlook as props so it can be tested without a login. Three parts: (1) seven equal day tiles (weekday, date, icon, average temp, rain chance; earlier days greyed and not selectable, no icon when there's no forecast); (2) one navy "Weather impact at a glance" panel for the selected day: date and zone, conditions with a labelled temperature ("Average 66°F · 63–68°F across service periods"), three plain sentences, a white metric box "Estimated weather effect on demand" (−2.9%, "Moderate demand impact", "For the whole day"), and a labelled "Overall demand that day" line with a link to the daily outlook; (3) "Weather during service" list: period, conditions, temperature, rain chance, estimated demand effect, with a row that opens to an explanation. Closed periods get a "Closed" tag and still show weather |
| WeekGrid / DayStrip / DayDetail | `components/WeekPlanner` | Weekly planning grid: days across, Morning/Midday/Dinner/Late night down. A cell shows the demand level as text on its band colour; point at it for the exact score. Striped = Closed (outside your hours), dashed = Unavailable (no forecast). Today is tagged, earlier days are dimmed and tagged "Earlier". Choosing a day (header, cell, strip or chart bar) fills `DayDetail`: score and level, the four periods, weather with rain chance, events with time and service period, and a "View daily outlook" link. Below 760px the grid shows one day, picked from `DayStrip` |
| WeekGlance | `components/WeekGlance` | Weekly "This week at a glance" banner: three equal tiles on the navy card (Busiest period, Quietest upcoming period, Main demand drivers). Small uppercase label with an ⓘ, big "Friday dinner", then "Exceptional · 150". Driver names wrap to two lines with the effect in green; tiles stack below 1000px. Printed as plain outlined boxes |
| DailyTotals | `components/DailyTotals` | Collapsible "Daily totals" card with the 7-bar chart, open by default. The right of the header says "Hide ⌄" / "Show ›" so it's clear it opens and closes |
| InfoTip | `components/InfoTip` | ⓘ button with a short explanation. Opens on hover (real pointers only), keyboard focus or tap. Escape, tapping again or blurring closes it. `tone="dark"` for the navy banner; `align` picks start/center/end |
| PageLoading | `components/PageLoading` | Full-page spinner and label, shown until **all** of a page's data is ready |
| LoadError | `components/LoadError` | Full-page "We couldn't load this forecast." with the message and a "Try again" button |
| UpgradeGate | `components/UpgradeGate` | Trial-ended card with lock icon and "Upgrade now" |
| AddressInput | `components/AddressInput` | Text field with Google Places suggestions (server-side) |
| DetectedArea | `components/DetectedArea` | Line under the address: detected area, why there isn't one, "Try again", or manual area select |
| HoursEditor | `components/HoursEditor` | Shared-hours panel (shortcuts, day chips, Opens/Closes, Apply / Mark closed), then the "Your week" list with Not set / times + Edit / Closed per day |
| ZoneFinderModal | `components/ZoneFinderModal` | Explorer-only "find my zone" dialog |
| EventDaySelector | `components/EventDaySelector` | Events day picker: "Today" and "Rest of this week" chips, then seven equal day buttons (weekday, date, event count). Today is tagged and the chosen day is blue; earlier days are dimmed and say "Earlier". Scrolls sideways on phones |
| EventsList | `components/EventsList` | The event list: four columns (event and venue, date and time, distance, estimated influence) with a Sort select, "Showing 1–10 of 22 events" and Previous / Next. The title link covers the whole row. Tags: "Key event", "Across the border", "+ n related listings". Phones get stacked cards |
| EventBody | `components/EventBody` | Event outlook body: details, estimated effect, service period, distance, influence, "Why it matters to you", and the three actions (View demand outlook for this date, Open venue in Google Maps, Report incorrect event) |
| EventsOverviewView | `components/EventsOverviewView` | The Events page logic, taking the week as a prop so it can be tested without a login |
| FeedbackModal | `components/FeedbackModal` | "How was your day?" dialog from the sidebar |
| AuthShell / LegalPage | `components/…` | Page shells (§2) |

### Buttons as implemented

| Kind | Look | Where |
|---|---|---|
| Primary | Electric blue fill, white 14/600, radius 12, padding ~12–13 | Auth, onboarding, Settings, billing CTA |
| Primary hover | Cobalt fill | Settings, billing, upgrade gate |
| Disabled | gray-30 fill, gray-60 text | Auth, onboarding. Settings still uses opacity 0.55 |
| Secondary | White fill, gray border, text colour | Onboarding Back, hours editor, Google sign-in |
| Text / link | Electric blue 13–14/600, no box | "Add hours", "Edit", "Try again", auth links |
| Shortcut | White, primary-40 border, electric-blue text, radius 8 | Hours editor |
| Chip (toggle) | Pill. Off: white with gray border. On: electric blue with white text. Uses `aria-pressed` | Hours editor days |

### Inputs as implemented

There are three variants today:
- **Onboarding:** padding 12/14, 1px gray-50 border, radius 12, white.
- **Settings:** 44px tall, #f8f9ff fill, `--color-borders` border, radius 12.
- **Hours editor / DetectedArea:** padding 10/12, gray-50 border, radius 10.

Dropdowns are `Select`, never a native `<select>`. In all three, focus turns the border `--color-primary-50` and invalid fields turn it `--color-destructive-60`.

---

## 4. Page patterns

| Page | Structure |
|---|---|
| Daily Outlook | Title "Daily outlook", subtitle, "Last updated ⓘ" and a **Refresh** button on the right (rebuilds the forecast; the server ignores it within 60 s of the last build) → brief banner with score column ("Demand score ⓘ", band, score, 0 / 75 / 150 bar, "Busiest period: X", "Daily score calculation ⓘ") → "Demand throughout the day ⓘ" (band ranges) → amber "Add your operating hours" prompt when the day has no hours → 4 daypart cards (the busiest one gets a blue border and a "Busiest period" tag; icon + window + "Closed" badge outside the restaurant's hours; band pill + "±x% vs. normal ⓘ"; weather; "What's driving demand ⓘ" note) → "Demand score by period" bar chart + drivers card → collapsible "How this forecast works" (scope, how a score is built, daily score, vs. normal, band table, events and weather) |
| Weekly Outlook | Title and date range, with "Export weekly outlook" (paid plans; others see a "Paid plans" link to Billing) → `WeekGlance` banner → "Plan your week ⓘ" grid → selected-day details → `DailyTotals` + drivers card (with "Show only {day}" / "Show full week") |
| Events Overview | Title → "Event impact at a glance" banner (2–3 sentences built from the same list, hedged with "may") → "Choose a day ⓘ" `EventDaySelector` → "Showing events for …" → filters (search, Event type, Venues, Distance) with removable chips, result count and Clear filters → `EventsList` → collapsible "How events shape demand". The summary, day counts and list all come from one selected day (or the rest of the week) |
| Event Outlook | Back link → `EventBody`: event card (date chip, estimated effect with ⓘ, local start time, service period, type, distance ⓘ, estimated influence ⓘ, why it matters, actions) + four "Impact by service period" cards (a period with no effect says "No effect", not "+0%") |
| Weather Outlook | Title and date range → "Choose a day ⓘ" tiles → `WeatherView` summary panel → "Weather during service ⓘ" list → "About this forecast" (source, time zone, estimates not warnings, what isn't shown yet). Effect wording: −x% / +x% with "Low / Moderate / High demand impact" or "May raise demand"; a zero effect says "No material weather effect expected"; a missing forecast says "Unavailable" / "No weather forecast for this day" |
| Settings | Cards stacked (gap 32): Account, Reset Password, Restaurant (address + DetectedArea, concept), Operating Hours (HoursEditor). Each card saves on its own with an inline "Saved." message |
| Billing | Status bar → 3 tier cards (navy header, price, features, CTA) |
| FAQS | Accordion list |
| Onboarding | Choice cards → Restaurant details → When are you open? → "You're all set!" |

The 7-column day grids show 7 columns at ≥1400px, then switch to `auto-fit, minmax(160px, 1fr)`.

---

## 5. States

- **Loading:** every page renders `PageLoading` until all its data is ready, and never shows a stale cached outlook. The Weather page only gates its first load; later day switches update in place.
- **Loading label:** Daily says "Gathering demand insight…".
- **Error:**
  - Daily Outlook shows `LoadError` with a "Try again" button that re-runs generation (`retry` from `useOutlook`).
  - Weekly and Weather show `LoadError` too. Events has nothing to retry (no AI call).
- **Missing vs zero:** on Daily, a missing daypart shows "No forecast" and "Comparison not available" and leaves a gap in the chart. It never shows "0%" or a fake band.
- **Empty:** inline text. Events keeps three apart: "Event data isn't available for earlier days" (unavailable), "No nearby events are listed for this day" (nothing scheduled) and "No events match your filters" (with Clear filters).
- **Validation:**
  - Errors appear after the first submit attempt and update live from then on.
  - They sit under the field in destructive-70 at 13px, and the field gets `aria-invalid`.
  - The page focuses the first bad field.
- **Success:** inline "Saved." in success-60 next to the button (Settings).

---

## 6. Responsive breakpoints in use

| Width | Change |
|---|---|
| ≥1400 | Day grids show 7 columns |
| ≤1250 | Daily daypart cards: 4 → 2 columns |
| ≤1100 | Daily brief and lower row stack to one column |
| ≤900 | Sidebar becomes a drawer; main padding shrinks |
| ≤800 | Settings two-column fields stack |
| ≤760 | Weekly grid shows one day at a time with a day strip |
| ≤700 | Daily daypart cards: 1 column; legal/sample pages tighten |
| ≤640 | Onboarding card padding shrinks; concepts 3 → 2 columns; choice cards stack |
| ≤560 | Hours editor rows stack (day + Closed on top, times below) |

Breakpoints are per-file. There is no shared set.

---

## 7. Known inconsistencies

Most of these overlap with the open design-review items.

1. **Three input styles and two label colours** (onboarding gray-70 vs Settings #90a1b9).
2. **Hard-coded navy gradients and borders** instead of tokens.
3. **No shadow, spacing or breakpoint tokens.** Values repeat by hand.
4. ~~Daypart windows shown on cards don't match the backend's event windows.~~ Fixed: the cards now show the backend's windows.
5. ~~Event icons are emoji.~~ Fixed: `EventIcon` draws one SVG line icon per event class, used on the Events list, event page, Weekly and Daily drivers. Weather drivers use `WeatherIcon`.
6. **Percentages and numbers:**
   - Fixed on Daily: missing values no longer show as 0, and the drivers card shows 0% as gray "No effect".
   - Weather: fixed. A missing forecast reads "Unavailable", never 0%. Percentages there keep one decimal on purpose (−8.8%) so period and day figures can be compared.
7. **Weather severity pills:** fixed. The pills are gone; the effect is a signed percentage in red or green with a text label ("Moderate demand impact"), and zero is plain gray text.
8. **Events influence:** fixed. Raw 0.5 / 1 values are gone; the list shows "Estimated influence" (High / Moderate / Low) with a tooltip. It reflects distance only (the backend's proximity tiers), not event size.
9. **Tooltips exist on every Intelligence page.** Daily Outlook shows "Last updated" (from `generatedAt`, with the exact time in a tooltip). Weekly, Events and Weather don't show it yet.
10. **Disabled buttons:** Settings dims with opacity while other pages use the gray fill.
11. **Subtitle separators:** fixed. Every Intelligence page now uses `pageSubtitle()` ("Name · Concept · Zone · Date") with repeats removed.
12. **Daypart windows vs operating hours:** "Closed" is worked out from the backend's windows (6–11, 11–4, 4–9, 9 PM–midnight), so there is no gap in the day.

## 8. Rules for new UI

- Use tokens from `globals.css`. If a new colour, shadow or size repeats, add a token rather than another literal.
- Reuse the shared pieces: `shared.title`, `subtitle`, `sectionTitle`, `card` and `banner`, plus `BandPill`, `DaypartIcon`, `WeatherIcon` and `PageLoading`.
- **Primary action:** an electric-blue button, with the gray-30 / gray-60 disabled style.
- **Errors:** red text under the field, only after the first submit attempt.
- **Explanations:** use `InfoTip` and keep it to one or two sentences. Anything longer goes in the "How this forecast works" section.
- **Print / PDF:** hide app chrome with `data-print-hide` and page-level `noPrint` classes; the sidebar already does. Keep band colours with `print-color-adjust: exact`.
- **Percentages:** whole numbers. No change shows as "0%", not "+0%".
- **Colour plus text:** every coloured meaning (band, positive/negative effect) also carries its label.
- **Toggles and keyboard:** toggles use `aria-pressed`; controls work with Tab and Enter/Space.
- **Mobile:** check every new layout at 375px with no horizontal scroll.
