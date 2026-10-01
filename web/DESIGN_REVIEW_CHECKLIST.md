# Customer Dashboard Design Review — checklist

Tracks every item in *Customer Dashboard Design Review & Feedback* against the
web app (`web/`). Status as of 2026-10-01, branch `ui-changes-web`.

**How to read it**
- `[x]` means done in code.
- `[ ]` means not done yet.
- Notes say why an item is open:
  - **partial**: some of the item is done.
  - **needs backend**: needs a Convex change.
  - **needs owner**: a product decision is required first.
  - **verify**: the code looks right, but it hasn't been checked against live data.

Login, Signup, Onboarding, Settings and the Daily Outlook were checked with
`tsc`, `eslint` and unit tests. The Daily Outlook body was also checked in a
browser through the public `/sample-outlook` page. Signed-in pages still need a
click-through with a real login.

---

## 1. Login page

- [x] Headline: "Know demand before you open."
- [x] Supporting sentence: "Demand intelligence for smarter operations."
- [x] Lighter supporting text on the navy panel; darker subtitle under "Welcome back"
- [x] "Welcome Back" → "Welcome back"
- [x] "Login" → "Sign in"
- [x] "Google" → "Continue with Google"
- [x] "Signup" → "Sign up"
- [x] Brand-blue "Sign in" button with a clearly distinct disabled state
- [x] Smaller gap between "Forgot password?" and "Sign in"
- [x] System status: "All systems operational."
- [x] Keep the split layout, navy panel, branding and "Sign in to your ForeShift account." subtitle

## 2. Signup page

- [x] Headline: "Know demand before you open."
- [x] Supporting sentence: "Demand intelligence for smarter operations."
- [x] Benefit bullets: 14-day trial / few simple steps / AI-powered insights from day one
  - Note: the copy says 14 days, but the backend trial is 7 days (`lib/access.ts`) — **needs owner**.
- [x] Heading "Create your account"
- [x] Subtitle "Start your 14-day free trial."
- [x] Button "Create account"
- [x] Button "Continue with Google"
- [x] Bottom text "Already have an account? Sign in"
- [x] Password requirements shown below the field
- [x] Lighter text and bullets on navy; darker subtitle above the form
- [x] Brand-blue button with a distinct disabled state
- [x] Terms and Privacy links near the button (pages at `/terms-and-conditions`, `/privacy-policy`)
- [x] System status: "All systems operational."

## 3. Onboarding: first setup page (choice)

- [x] Heading "How will you use ForeShift?"
- [x] Supporting text "Set up your restaurant or explore demand by concept and location."
- [x] Restaurant card: "I run a restaurant" / "Understand upcoming demand to plan daily operations." / "Set up my restaurant"
- [x] Explorer card: "I'm exploring opportunities" / "Explore demand for your restaurant concept across different locations." / "Explore demand"
- [x] No progress indicator on the choice screen
  - Steps appear only after a path is picked; restaurant info and hours are on the restaurant route only.
- [x] "Signup Choice" label removed
- [x] Darker gray text under both card titles
- [ ] Subtle blue demand shading on the explorer map illustration

## 4. Onboarding: restaurant information

- [x] Ask for the address once; picking it runs the zone lookup and shows the detected area underneath
- [x] Separate zone-help popup removed (restaurant route); retry or manual area choice on the same page when detection fails
  - The "I'm exploring" route still has its zone dropdown and finder popup, since it has no address.
- [x] Detected area updates when the address changes
- [x] Clear message when the address is outside coverage: "Restaurant is outside of supported coverage zones"
- [x] Address required (marked `*`, error message, can't continue without a detected area)
- [x] Nine concepts in three columns on desktop, with "Choose the concept that best describes your business."
- [x] Validation errors shown beside the relevant fields (no "Title" prefix)

## 5. Onboarding: operating hours

- [x] "Same timings?" replaced by a visible shared-hours section: select days → Opens at / Closes at once → "Apply to selected days"
- [x] Shortcuts: Every day, Mon–Fri, Sat–Sun
- [x] Compact weekly schedule; review all seven days and edit single days
- [x] Clear "Closed" option per day; "–" option removed; empty days show "Not set" (never saved as closed)
- [x] Type times or pick 15-minute increments
- [ ] Match the referenced PDF
  - The PDF wasn't available; the layout is our own design.
- [x] Flag missing times and overlapping periods beside the affected day
  - Overlap means one day's after-midnight hours running into the next day. The backend stores one period per day, so split shifts aren't supported (**needs backend** if wanted).

**General layout and navigation**
- [x] Two setup steps: Restaurant details → Operating hours
- [x] Darker labels and helper text; more visible input borders
- [x] Entries kept when going back and forward
- [x] First step's button: "Continue to operating hours"
- [x] Hours heading "When are you open?" with "Set your regular service hours. Adjustable by individual day."
- [x] Main priority met: address entered once; same hours applied to several days in one action
- Also done, though not in the review: Settings uses the same address/area and hours editor.

## 6. "You're all set!" page

- [x] Heading "You're all set!"
- [x] Text "Explore today's demand outlook and what's driving it."
- [x] Button "View today's outlook"
- [x] Completed progress indicator removed
- [x] Illustration smaller
- [x] Shown only when setup is valid (every day has hours or is marked closed; no "Set up later")

## 7. Daily Outlook

**1. Header**
- [x] Heading "Daily outlook"
- [x] Restaurant name, concept and demand area underneath
- [x] Forecast date shown
- [ ] Last updated time — **needs backend** (`getMine` doesn't return `generatedAt`)
- [x] Smaller heading; restaurant name not repeated
- [ ] Match the referenced PDF (not available)

**2. Main summary**
- [x] Number labelled "Demand score"
- [x] "Today's Operations Brief" → "Today's demand brief"
- [ ] Score visually separated from the AI narration — **partial**: own column and label, layout otherwise unchanged
- [ ] Brief kept to 2–3 sentences (peak, quiet periods, drivers) — **needs backend** (Gemini prompt)
- [x] Better text contrast on the navy background

**3. Forecast consistency**
- [x] AI brief, score, cards and chart all come from the same forecast result
- [x] They refresh together (one cached result; a stale result is never shown)
- [ ] Fix "brief says dinner is minimal while the chart shows it strongest" — **needs backend** investigation
- [ ] Factual fallback when AI narration is unavailable or outdated — **needs backend**
  - Seen during testing: Gemini returned 503 "high demand", and the sample page showed an error.

**4. Metric definitions**
- [x] 0–150 scale and category thresholds explained (tooltips and "How this forecast works")
- [x] How the daily score is calculated (busiest period)
- [x] Clear that it's area/concept demand, not restaurant sales
- [x] Baseline behind "vs. normal" defined
- [x] Overall change and event impact explained separately
- [x] Percentages rounded; no change shows as "0%"

**5. Time-of-day cards**
- [x] "Daypart" → "Demand throughout the day"
- [x] Same labels everywhere: Morning, Midday, Dinner, Late night
- [x] Same order in each card: period, demand level, comparison, weather, explanation
- [x] "Event Lift" → "What's driving demand"
- [ ] Standardized spacing, icons, card heights and colours — **partial**
- [x] Responsive columns: 4 / 2 / 1

**6. Chart**
- [x] Bar chart instead of the smoothed area chart
- [x] Vertical axis "Demand score"
- [x] Same period names, thresholds (band colours) and fixed 0–150 scale
- [x] Values shown on the bars, accessible tooltips and a screen-reader summary
- [x] Zero, missing ("No data") and closed ("Closed") distinguished

**7. Operating hours**
- [x] Periods outside operating hours marked "Closed"
- [x] Prompt to add hours when they're missing
- [ ] Gaps between periods (e.g. 2–5 PM) — **needs owner**
  - The card windows (7–10, 11–2, 5–10, 10–12) differ from the backend's event windows.
- [x] Overnight hours handled (the previous night's after-midnight hours count)

**8. Demand drivers**
- [x] Repeated weather entries removed
- [x] Identical conditions combined, with the affected periods labelled
- [x] Ordered by estimated impact; no-effect rows last
- [x] Neutral weather shown once; 0% shown as gray "No effect", not positive
- [ ] Consistent icons — **partial**: weather uses the app's weather icons, events are still emoji
- [ ] Verify event times, time zones and affected periods (the 10:00 AM event with a dinner uplift) — **needs backend** investigation

**9. Tooltips**
- [x] Demand score ⓘ
- [x] Daily score calculation ⓘ
- [x] Demand category (band ranges, via the section-title ⓘ and the table)
- [x] "vs. normal" ⓘ
- [x] Chart bars
- [x] Event impact ⓘ (and driver percentages)
- [ ] Last updated — **needs backend**
- [x] Works on hover, keyboard focus and mobile tap; Escape closes it
- [x] Short text, with longer explanations under "How this forecast works"
- [x] Essential information stays visible without hovering

**10. Layout and readability**
- [ ] Less vertical spacing
- [ ] Score, brief and start of the forecast near the top
- [ ] Better contrast for small and gray text — **partial**
- [ ] Consistent borders, corners and subtle shadows
- [x] Sidebar collapses on smaller screens (drawer below 900px)
- [x] Demand colours always paired with text labels

**11. Loading and missing data**
- [x] "Gathering demand insight" while loading
- [x] Unavailable data never shown as 0%
- [ ] Stale or unavailable forecasts clearly identified — **partial**: stale results are never shown and missing periods say "No forecast"; there's no freshness label (**needs backend**)
- [x] Retry option when loading fails

## 8. Weekly Outlook

**1. Date mismatch**
- [ ] Brief and cards cover the same dates — **verify** (web dates come from Detroit's calendar; the mismatch was seen in Bubble)
- [ ] Sep 23, 2026 shown under Wednesday — **verify**
- [x] Weekday labels, dates, grid, chart, events and glance points all come from the same week query (restaurant-local dates)
- [ ] Daily and Weekly show matching forecasts for the same date — **verify** with real data (both read the same scores)

**2. Week selector**
- [x] Heading "Weekly outlook"
- [x] "September 21–27, 2026" style date range
- [ ] Previous/next week and "This week" controls — **needs backend** (current week only)
- [ ] Only future dates within the forecast range enabled — **needs backend**
- [x] Today highlighted; elapsed days distinguished and labelled "Earlier"

**3. Planning grid (heatmap)**
- [x] Columns Mon–Sun with dates; rows Morning / Midday / Dinner / Late night
- [x] Each cell shows the demand category; exact score on hover or keyboard focus, and in the day details on tap
- [x] Consistent colours plus text
- [x] Closed (striped), Unavailable (dashed) and low demand (gray "Minimal") distinguished
- [x] Uses period-level forecasts, not daily totals

**4. Selected-day detail panel**
- [x] Score and category
- [ ] Comparison with the defined normal baseline — **needs backend** (the week query has no baseline scores); the panel links to the daily outlook for it
- [x] Weather (with rain chance) and events (time and service period)
- [x] Short explanation
- [x] "View daily outlook" for that date
- [x] Defaults to today

**5. Weekly chart**
- [x] Moved to a secondary, collapsible "Daily totals" view
- [x] Seven bars instead of a curve
- [x] "Demand score" axis; calculation explained in a tooltip
- [x] Consistent 0–150 scale, one decimal
- [x] Chart, grid and detail panel selection kept in sync (click a bar or a day)

**6. Weekly brief**
- [x] Renamed "This week at a glance"
- [x] Three short points: busiest period, quietest upcoming period, main demand drivers
- [x] Generated from the same data as the grid (no AI text), so it can't contradict it; no guaranteed-crowd wording

**7. Weekly drivers**
- [x] "Factors influencing this week's forecast."
- [x] Date, local start time and affected period on every event (drivers list and day details)
- [ ] Investigate why every event shows 10:00 AM — **needs backend**
- [x] Filter to the selected day, with "Show full week" (the list is the week's top 5 drivers; the day details list all of its events)
- [x] Percentages explained in a tooltip
- [x] Event counts shown on each day; selecting a day lists its events

**8. Tooltips and freshness**
- [x] Score and thresholds, daily score, events, grid cells, daily totals
- [x] Hover, keyboard and tap support
- [ ] "Last updated" — **needs backend**
- [x] Missing data ("Unavailable") distinguished from zero impact

**9. Hierarchy and responsiveness**
- [x] Smaller heading (32px)
- [x] Better contrast for the blue heading on the navy card
- [x] Week selector, brief and grid near the top
- [ ] Consistent icons — **partial** (events are still emoji)
- [x] Mobile: horizontal day selector with selected-day details

**10. Sharing**
- [x] "Export weekly outlook" as a printable PDF (restaurant, date range, grid, drivers, generation timestamp), paid plans only
  - Uses the browser's Save as PDF. Not yet tried in a real signed-in session.

## 9. Events page

**1. Dates and summary**
- [ ] Weekday/date mismatch — **verify** (the web app reads Detroit dates from the same helpers as the other pages)
- [x] Day selector, summary, event list and per-day counts all come from one selected day, so they can't disagree
- [x] Summary and key events reference the same day (the summary is built from the list itself, no AI text)
- [x] Active date range explicit ("Showing events for …"); filtering stays inside it

**2. Impact numbers**
- [x] Raw 0.5 / 1 values no longer shown
- [x] Low / Moderate / High "Estimated influence"
  - It reflects distance only (≤ 0.6 mi High, ≤ 1.5 mi Moderate). The backend drops events beyond 1.5 mi, so "Low" doesn't appear in practice.
- [x] Tooltip explaining the metric, scope and uncertainty
- [x] Event influence kept apart from the overall demand forecast (the event page shows the estimated effect separately)

**3. Date selector**
- [x] Seven same-size day buttons (weekday, date, event count)
- [x] Today and selected day highlighted
- [x] Selecting a day updates the summary and list together
- [ ] "Today", "Next 7 days" and date navigation — **partial**: "Today" and "Rest of this week" are there; the data covers the current week only, so a true next-7-days range or other weeks **needs backend**
- [x] Emoji clusters and number badges removed
- [x] Horizontal scrolling on mobile

**4. Filters**
- [x] "Venue Types" → "Venues" (list now built from the real venues in the data)
- [x] Separate Event type filter
- [x] Distance labelled with units ("Within 1 mile")
- [x] Practical distance choices (0.25 / 0.5 / 1 / 1.5 miles)
- [x] Event/venue search
- [x] Active filters, result count and "Clear filters"

**5. Event list**
- [x] Four columns: event and venue / date and time / distance / estimated influence
- [x] Title, category and venue in one cell
- [x] Readable times ("7:00 PM"), time zone stated once ("Detroit local time (ET)")
- [x] Units on every distance
- [x] Better contrast; more room for names
- [x] Sort by start time, distance and estimated influence
- [x] Previous/Next with "Showing 1–10 of 22 events"
- [x] Stacked cards on mobile

**6. Event detail**
- [ ] Venue address and map link — **partial**: a Google Maps link by venue name; no street address (**needs backend**)
- [x] Local start time ("Detroit time"); no end time is available
- [ ] Source link and last updated — **needs backend**
- [x] Affected service period
- [x] Why it's relevant to this location and concept
- [x] "View demand outlook for this date"
- [x] "Report incorrect event" (opens a pre-filled email to support@foreshift.ai)
- [x] Estimated effect and influence labelled as estimates

**7. Duplicates**
- [x] Duplicate listings and packages grouped under the show in the list (same venue, date and start time; shown as "+ n related listings")
  - Display only. A heuristic: a suite rental or hotel package leads to the show with the plain title.
- [ ] Duplicates don't inflate forecast impact — **needs backend** (the page's counts are grouped; the forecast is not)
- [ ] Canceled, postponed and rescheduled events handled consistently — **needs backend**

**8. Geographic relevance**
- [x] Straight-line vs travel distance explained (distance tooltip: venue to the centre of your area)
- [x] Nearby venues aren't treated as equal: closer events rank higher and carry a higher influence label
- [x] Cross-border venues (Caesars Windsor) tagged "Across the border" with an explanation
  - Tagged by venue name; the forecast's own weighting of them is unchanged (**needs backend** to change).

**9. Supporting sections**
- [x] "Top Event Today" card replaced by "Key event" tags in the main list (up to 3 per day)
- [x] "How events shape demand" made expandable
- [x] Duplicated concert/nightlife sentence removed
- [x] Effects phrased as possibilities ("may increase")

**10. Summary and visual design**
- [x] Top card renamed "Event impact at a glance"
- [x] Two or three sentences naming the busiest period and the most relevant events (built from the list)
- [x] "May increase demand" wording
- [x] Smaller header
- [ ] Less vertical spacing — **partial**
- [x] Better contrast on the navy card
- [ ] Consistent icons, borders and spacing — **partial** (events are still emoji)
- [x] Hover/keyboard/tap explanations for influence and distance
- [x] "No matching events" vs "Event data unavailable" vs "No nearby events"

## 10. Weather page

**1. Consistency**
- [ ] Summary, icons, conditions and impact from the same data — **needs backend**
- [ ] Show rain probability when it drives impact under a sunny label (`precipChance` is available)

**2. Dates**
- [ ] Sep 23, 2026 under the right weekday — **verify**
- [ ] Same restaurant-local dates across calendar, panel, summary and periods — **verify**
- [x] "Week 4 of September '26" → explicit date range

**3. Weather impact vs overall demand**
- [ ] Remove "Peak · 98.4" or label it "Overall demand" with a Daily Outlook link
- [ ] "Estimated weather effect on demand" as the main metric
- [ ] Explain the daily % and how it relates to the period values

**4. Date selector**
- [ ] Weekday, date, icon, high/low and impact per day (high/low **needs backend**)
- [ ] Seven same-size days; today and selected highlighted; no wrapping or overflow

**5. One summary panel**
- [x] Heading "Weather impact at a glance"
- [ ] Top card and standalone panel merged (date, location, overview, labelled temperature, effect, most affected period)

**6. Period comparison**
- [x] "Impact by Daypart" → "Weather during service"
- [ ] Table on desktop / rows on mobile: period, conditions, temperature, rain chance, effect
- [ ] Selecting a row shows details

**7. Weather factors**
- [ ] Rain probability and timing
- [ ] Rain amount, wind, gusts, feels-like — **needs backend**
- [ ] Optional outdoor-seating setting — **needs backend**

**8. Severity labels**
- [ ] "No material weather effect expected" instead of "Low severity" at 0%
- [ ] Labelled as demand impact, not weather warnings
- [ ] Real alerts shown separately with their source — **needs backend**

**9. Explanations and freshness**
- [ ] Tooltips: impact %, daily aggregation, rain probability, temperature
- [ ] Source, last updated and time zone — **needs backend** for last updated
- [ ] Unavailable data distinguished from no impact (missing values still become 0%)

**10. Design and navigation**
- [x] Smaller heading
- [ ] Smaller icons and less empty space
- [x] Better contrast for the blue heading on navy
- [ ] Consistent weather icons
- [ ] Restrained colours for negative/neutral/positive, with text labels
- [ ] "View demand outlook for this date"
- [ ] Closed periods marked without implying zero demand

---

## Summary

| Section | Done | Total |
|---|---|---|
| Login | 11 | 11 |
| Signup | 13 | 13 |
| Onboarding (choice, info, hours, success) | 32 | 34 |
| Daily Outlook | 46 | 62 |
| Weekly Outlook | 35 | 44 |
| Events | 47 | 55 |
| Weather | 5 | 31 |
| **Total** | **189** | **250** |

Next up: the Weather page (compact date selector, "Weather during service" table, severity labels, tooltips).
