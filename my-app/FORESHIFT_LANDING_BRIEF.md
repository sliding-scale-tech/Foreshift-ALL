# ForeShift — Landing Page Brief

Build a marketing landing page for **ForeShift**. Everything you need to know about
the product is below. Do not invent statistics, customer names, testimonials, or
accuracy percentages — if a section needs proof, use a placeholder clearly marked
`[TBD]`.

---

## One-liner

**ForeShift tells restaurant operators how busy demand will be — before it happens.**

## What it actually is

ForeShift is a **demand forecasting service for independent restaurant operators**.
It answers a question operators currently guess at: *"How much appetite is there for
my kind of restaurant, in my part of the city, on this day, at this time of day?"*

The core unit is **zone demand** — the demand for a given concept type inside a
defined city trade area, at a specific day and daypart. It is not a prediction of one
restaurant's covers; it's the size of the wave, so the operator can decide how to ride it.

> **Terminology rule (important):** always say **"zone demand"** or **"demand"**.
> Never "restaurant demand", never "foot traffic", never "predicted covers".

## Who it's for

- Independent and small-group **restaurant, bar, and cafe operators**
- Chefs/GMs who set schedules, prep levels, and hours week to week
- Operators without a corporate analytics team — they're running on gut feel,
  last year's POS data, and the manager's memory

## The problem it solves

Operators make expensive decisions on intuition:

- **Overstaffing** on a night that never comes → labor burned
- **Understaffing** on a night nobody saw coming (a stadium game, a festival, a
  sudden warm Friday) → walkouts, bad reviews, blown service
- **Over-prepping / over-ordering** → waste
- **Opening hours that don't match reality** → paying rent and wages on dead time
- **Promotions fired at the wrong moment** → discounting demand you already had

The signals that move demand — events, weather, day-of-week rhythm, neighborhood
character — are all knowable in advance. Nobody has put them together for the
independent operator.

## How it works (the story to tell on the page)

Four steps, keep it this simple:

1. **Tell us where you are and what you serve.**
   The operator enters their venue address and picks their concept type. ForeShift
   geocodes the address and automatically places the venue in the right **city zone**
   — no map-reading, no guessing which neighborhood you "count" as.

2. **Get your demand baseline.**
   A demand score and band for every **day × daypart** for that concept in that zone —
   the full week at a glance. Built from ForeShift's Detroit demand model, not from a
   generic national average.

3. **Live signals adjust it.**
   Nearby **events** (stadium games, concerts, festivals) and **weather** move the
   forecast. Events are matched by real distance from the venue to the zone — a game
   two blocks away and a game across town are not the same event. Weather scales the
   whole picture up or down.

4. **Log what actually happened.**
   Operators tap in how busy they really were. ForeShift compares predicted vs. actual
   and tunes the model — it gets sharper the longer a market runs.

## What the operator sees

- A **demand band** for every day and daypart: `Minimal · Light · Moderate · High ·
  Peak · Exceptional` — plain language, not a raw number to decode
- The four dayparts: **morning** (6–11a) · **midday** (11a–4p) · **dinner** (4–9p) ·
  **late night** (9p–2a)
- A **week view** so patterns are obvious at a glance
- What's *driving* a spike or a dip — the event, the weather — not just the number
- **AI Intelligence Pass (add-on):** ask questions in plain English ("How busy is
  Saturday dinner?", "What's happening in Corktown this weekend?") and get a written
  answer grounded in the actual forecast numbers. The AI explains the forecast; it
  never makes the forecast up.

## Coverage today

- **Market:** Detroit (launch market)
- **13 zones:** Woodward Core · Downtown Detroit (Core) · Foxtown / Stadium District ·
  Greektown / Casino District · Financial District · Midtown · Corktown ·
  Eastern Market · New Center / North End · Riverfront / RiverWalk · Mexicantown ·
  Core City / Woodbridge · Southwest Detroit
- **9 concept types:** Fine Dining · Upscale Casual · Casual Dining · Fast Casual ·
  Coffee Shop · Breakfast / Brunch Cafe · Sports Bar · Cocktail Lounge ·
  Neighborhood / Casual Bar
- More markets after Detroit — the page can say "Detroit now, more cities coming" and
  offer a waitlist for other cities.

## What it's used for (concrete outcomes, good for a benefits section)

- **Staffing** — schedule to the wave instead of to last week
- **Prep & ordering** — buy for the night you're actually going to have
- **Hours** — know which shifts are worth opening for
- **Promotions & marketing** — push on the slow dayparts, not the ones already full
- **Event readiness** — see the stadium game before it walks through the door

## Product / packaging shape

- **Demand report** — purchased per zone
- **AI Intelligence Pass** — monthly subscription; tiers for a single zone or full
  city coverage
- Payments via Stripe
- Do **not** put specific dollar prices on the page. Use `[Pricing TBD]` placeholders,
  or a "Request access / Get early access" CTA instead of a price table.

## Voice & positioning

- **Operator-first, not data-nerd.** The buyer is a chef or GM at 11pm doing next
  week's schedule, not an analyst. Concrete, confident, unfussy.
- **Foresight, not dashboards.** The promise is knowing sooner, not having more charts.
- **Credible, not hypey.** No "AI-powered revolution" language. No fake precision.
- **Local and specific.** Detroit street-level specificity is a feature — name the
  neighborhoods, reference the stadium district, the festivals, the winters.
- Good words: *foresight, ahead of it, the wave, demand, zone, daypart, prep, staffing.*
- Avoid: *revolutionary, disrupt, unlock, seamless, cutting-edge, harness the power of.*

## Suggested page structure

1. **Hero** — the one-liner, a one-sentence expansion, primary CTA (Get early access /
   Request a demo), secondary CTA (See how it works)
2. **The problem** — three short cards: overstaffed, understaffed, over-prepped
3. **How it works** — the four steps above, visual and numbered
4. **What you see** — a mock of the week grid: days across, dayparts down, cells
   colored by band. This is the money visual; make it look real and legible.
5. **Live signals** — events + weather, short and concrete
6. **Built for your concept, in your zone** — the 13 zones and 9 concepts as proof of
   specificity (a zone chip list works well here)
7. **AI Intelligence Pass** — an example question and an example plain-English answer
8. **It learns from your floor** — the feedback loop, briefly
9. **Pricing** — placeholder tiers, CTA-driven
10. **FAQ** — see below
11. **Footer CTA + waitlist for other cities**

## FAQ content to use

- *Is this a prediction of my restaurant's sales?* No — ForeShift forecasts demand in
  your zone for your concept type. What you capture of it depends on you.
- *Where does the data come from?* ForeShift's Detroit demand model, plus live event
  and weather signals, plus what operators report about their actual nights.
- *What if my address is on a zone border?* ForeShift assigns you automatically and you
  can confirm or adjust it during onboarding.
- *Which cities?* Detroit today. Join the waitlist for yours.
- *Do I need to integrate my POS?* No.

## Hard constraints

- **Never publish the model internals.** No formula, no coefficients, no magnitude or
  affinity values, no band numeric thresholds, no proximity distances. Band *names* are
  fine; the math behind them is not. It's proprietary and patent-pending.
- Do not claim accuracy figures, ROI numbers, labor-savings percentages, or customer
  counts — none have been established.
- No fabricated testimonials, logos, or press mentions.
- Marketing site domain is `foreshift.ai`; the product itself lives at
  `app.foreshift.ai` — CTAs should point at sign-up/waitlist, not deep app links.

## Design direction

- Responsive, works well on a phone (operators read this on the floor)
- Light and dark both supported
- The demand-band scale is the natural color system: a calm-to-intense ramp from
  Minimal through Exceptional. Use it consistently — it should read as one system, and
  the band colors must stay distinguishable and accessible in both themes.
- Restrained, editorial, a little bit hospitality — not SaaS-purple-gradient
- The week grid is the hero visual; everything else supports it
