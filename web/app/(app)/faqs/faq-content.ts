// FAQ copy, verbatim from Bubble (owner-supplied). Answers render with
// `white-space: pre-line`, so "\n" is a line break.

export const FAQS: { q: string; a: string }[] = [
  {
    q: "What does ForeShift actually tell me?",
    a: "How busy demand is likely to be for a restaurant like yours, in your part of Detroit, for every day of the week and every part of the day. You get a simple label — from Minimal up to Exceptional — for each slot, so you can see at a glance when your area runs hot and when it's quiet.",
  },
  {
    q: "Is this a prediction of my restaurant's exact sales?",
    a: "No. It's a demand forecast for your area and concept type — a research‑grounded baseline for \"how busy is it likely to be around here for a place like mine.\" Your own execution, reputation, and regulars sit on top of that. Think of it as the tide, not your specific boat.",
  },
  {
    q: "What's a \"zone\"?",
    a: "Detroit is divided into 13 named areas — Corktown, Greektown, Midtown, Eastern Market, and so on. When you sign up you enter your address and ForeShift places you in the right zone automatically. Your report is built for that zone.",
  },
  {
    q: "What if my address lands in the wrong zone?",
    a: "After the app assigns you a zone it shows it to you and lets you confirm or change it before you finish onboarding. If your address falls outside the covered central‑Detroit area, you'll see a \"not yet covered\" message and can leave your details for when coverage expands.",
  },
  {
    q: "What's a \"concept\"?",
    a: "The kind of venue you run. There are 9: Fine Dining, Upscale Casual, Casual Dining, Fast Casual, Coffee Shop, Breakfast / Brunch Cafe, Sports Bar, Cocktail Lounge, and Neighborhood / Casual Bar. The app suggests one based on your venue and lets you adjust it. Demand looks very different for a coffee shop than a cocktail lounge, so this matters.",
  },
  {
    q: "What are \"dayparts\"?",
    a: "The four blocks the day is split into:\n\n•  Morning — 6:00 AM to 11:00 AM\n•  Midday — 11:00 AM to 4:00 PM\n•  Dinner — 4:00 PM to 9:00 PM\n•  Late Night — 9:00 PM to 2:00 AM\n\nYour report gives you a demand band for each daypart, every day of the week.",
  },
  {
    q: "What do the demand bands mean?",
    a: "Six levels, low to high: Minimal, Light, Moderate, High, Peak, Exceptional. They're shown on a color scale in a days‑by‑dayparts grid. \"Exceptional\" is rare — you'll usually only see it when a major event or perfect weather is stacked on top of an already‑busy slot.",
  },
  {
    q: "How do I get my report?",
    a: "Sign up, enter your venue and address, confirm your zone and concept, then purchase your zone's Location Demand Report at checkout. Once bought, the report is available on your dashboard whenever you log in.",
  },
  {
    q: "What does it cost?",
    a: "Indicative pricing: around $199 for a single zone's report, or about $799 for the full Detroit bundle. The AI Access Pass is separate — roughly $49/month for one zone or $99/month for all of Detroit, cancel anytime. Confirm current prices at checkout.",
  },
  {
    q: "Do events and weather change my forecast?",
    a: "Yes — nearby events (concerts, stadium games, festivals) and the weather forecast are factored in. A big event close to your zone pushes demand up; a storm pulls it down; an ideal day nudges it up. How much an event matters depends on how close it is to your zone.",
  },
  {
    q: "What is the AI Access Pass?",
    a: "An optional subscription that lets you ask plain‑English questions — \"How busy will this weekend be?\" or \"What's driving demand in Greektown Friday night?\" — and get a written answer that explains the forecast using your demand numbers plus live event and weather context. It explains the forecast; it doesn't make up new numbers. There's a cap on how many questions you can ask per billing period.",
  },
  {
    q: "Why does the app ask me to log how busy I actually was?",
    a: "There's a quick tap — Dead, Slow, Steady, Busy, Slammed — you can record per daypart, plus optional actual covers. This feeds ForeShift's ongoing work to sharpen the forecasts over time. It also gives you a simple \"you reported Busy, the forecast was High\" comparison for your own reference.",
  },
  {
    q: "How often does the forecast update?",
    a: "The underlying demand patterns are stable, but the live event and weather layers refresh daily, covering the rest of the current week. So checking back through the week is worthwhile when events or weather shift.",
  },
  {
    q: "Is my data private?",
    a: "Your purchased reports and your feedback are yours. Other operators can't see your feedback, and you can't see report data for zones you haven't bought. Payment is handled through Stripe.",
  },
  {
    q: "The forecast didn't match my night — is it wrong?",
    a: "Not necessarily. The forecast describes typical demand for your area and concept; any single night swings around that with staffing, specials, private bookings, and word of mouth. The value is in the pattern across the week and in spotting when events or weather move things. Logging your actuals is exactly how the gap gets smaller over time.",
  },
];
