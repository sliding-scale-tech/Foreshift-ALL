import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const dayPartWeatherFields = v.object({
  severity: v.number(),
  condition: v.string(),
  tempF: v.number(),
  precipChance: v.number(),
});

export default defineSchema(
  {
    // Zone geography — one row per Detroit zone, sourced from ForeShift's
    // foreshift_13_zones.geojson (client-delivered package; see
    // ZONE_ASSIGNMENT_BRIEF.md). Holds the full polygon/multipolygon boundary
    // (for onboarding address -> zone point-in-polygon assignment, see
    // lib/pointInPolygon.ts) plus a derived centroid (for event proximity —
    // haversine venue -> zone centroid; tiers 1.0/0.5/0, see CLAUDE.md
    // "Event ingestion — locked decisions"). Replaces the old `zones` table
    // of hand-picked approximate centroids — this is real, official boundary
    // data, not a placeholder.
    zoneGeometry: defineTable({
      name: v.string(), // canonical zone string — must match convex/lib/vocab.ts exactly
      marketIndex: v.number(),
      source: v.string(), // provenance from the GeoJSON, e.g. "drawn_box" / "official_neighborhood"
      geometryType: v.union(v.literal("Polygon"), v.literal("MultiPolygon")),
      coordinates: v.any(), // GeoJSON coordinates, [lng, lat] pairs, nested per geometryType
      centroidLat: v.number(),
      centroidLng: v.number(),
    }).index("by_name", ["name"]),

    // Owner-editable coefficients — one table per set (backend spec §4.2/§4.3/§4.4 +
    // §5.2 hard requirement). Read at compute time; edited by the owner via an admin
    // surface with no code change / redeploy. Trade-secret ([TS], §8) — read/edit
    // only through internal functions, never a public API.

    // §4.3 Event magnitude by class (dummy: 50 / 30 / 20 / 10).
    eventMagnitude: defineTable({
      eventClass: v.string(), // must match classify.ts output + EventMagnitude catalog
      magnitude: v.number(),
    }).index("by_eventClass", ["eventClass"]),

    // §4.2 Event affinity by concept (dummy: 0.50). 0..1.
    eventAffinity: defineTable({
      concept: v.string(), // must match convex/lib/vocab.ts CONCEPTS exactly
      affinity: v.number(),
    }).index("by_concept", ["concept"]),

    // §4.4 Weather affinity by concept (dummy: 0.35). 0..1.
    weatherAffinity: defineTable({
      concept: v.string(), // must match convex/lib/vocab.ts CONCEPTS exactly
      affinity: v.number(),
    }).index("by_concept", ["concept"]),

    // App users, synced FROM Clerk via webhook (source of truth = Clerk). The admin
    // console (§5.2) gates coefficient edits on role === "admin". `role` is carried
    // from the Clerk account's public metadata ({ "role": "admin" }); everyone else
    // defaults to "user". `clerkId` is the Clerk user id (JWT `sub`), used to match
    // the authenticated caller against this table.
    users: defineTable({
      clerkId: v.string(),
      email: v.optional(v.string()),
      username: v.optional(v.string()),
      role: v.union(v.literal("admin"), v.literal("user")),
    }).index("by_clerkId", ["clerkId"]),

    // Restaurant/operator profile for the NEW web app's users (see
    // foreshift-new/web onboarding flow) — entirely separate from Bubble's own
    // "Operator" table. Bubble has its own independent user/auth system with no
    // link to Clerk, so this is a fresh record for web-app signups, not a sync
    // target. Keyed by clerkId directly (not users._id) so onboarding isn't
    // blocked by the Clerk-webhook -> `users` sync race for a just-created
    // account.
    operators: defineTable({
      clerkId: v.string(),
      restaurantName: v.string(),
      address: v.string(),
      zone: v.string(), // must match convex/lib/vocab.ts ZONES exactly
      conceptType: v.string(), // must match convex/lib/vocab.ts CONCEPTS exactly
      operatingHours: v.array(
        v.object({
          day: v.string(), // Mon..Sun
          isClosed: v.boolean(),
          openTime: v.optional(v.string()), // e.g. "9:00 AM"
          closeTime: v.optional(v.string()),
        }),
      ),
      // --- Billing (Stripe) --- one week of full access from signup
      // (_creationTime), then Intelligence pages gate behind a paid plan.
      // Undefined until the operator starts a checkout. subscriptionStatus
      // mirrors Stripe's own status string (active/trialing/past_due/canceled/
      // unpaid/incomplete/…) so access logic (lib/access.ts) never re-derives
      // it — Stripe is the source of truth, we just cache its last webhook.
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      subscriptionStatus: v.optional(v.string()),
      currentPeriodEnd: v.optional(v.number()), // ms epoch, from Stripe
      // When the write that produced the two fields above was AS OF (ms epoch):
      // Date.now() for a direct Stripe read (checkout completion), or the
      // webhook event's own `created` time for an async event. Stripe does not
      // guarantee webhook delivery order, so every write compares against this
      // before applying — an out-of-order "was active" event arriving after a
      // newer "canceled" event must not resurrect access. See stripe.ts setSubscription.
      subscriptionEventAt: v.optional(v.number()),
    })
      .index("by_clerkId", ["clerkId"])
      .index("by_stripeCustomerId", ["stripeCustomerId"]),

    // Convex-native mirror of Bubble's EventSignal / WeatherSignal /
    // ResolvedDemand tables — written by the SAME sync actions (events.ts /
    // weather.ts / operatorWeek.ts) right alongside their existing Bubble
    // writes, on the same schedule. Bubble's own tables and pipeline behavior
    // are completely unchanged; this is purely additive so the NEW web app
    // (foreshift-new/web) can read zone-demand data straight from Convex
    // instead of hitting Bubble's Data API. Field names are camelCase
    // (vs. Bubble's snake_case) but carry the same values — see
    // convex/lib/bubble.ts's Bubble* interfaces for the source shape.
    eventSignals: defineTable({
      signalKey: v.string(), // `${eventId}__${zone}` or `hp_${recid}__${zone}__${date}`
      eventId: v.string(),
      name: v.string(),
      venueName: v.optional(v.string()),
      eventClass: v.string(),
      zone: v.string(),
      proximity: v.number(),
      distanceMiles: v.optional(v.number()),
      eventTime: v.optional(v.string()), // "HH:MM"
      date: v.string(), // "YYYY-MM-DD"
      day: v.optional(v.string()), // Mon..Sun
      daypart: v.optional(v.string()), // morning..late
      allDayparts: v.boolean(),
    })
      .index("by_signalKey", ["signalKey"])
      .index("by_zone_day", ["zone", "day"]),

    weatherSignals: defineTable({
      signalKey: v.string(), // `${zone}__${date}`
      zone: v.string(),
      date: v.string(),
      day: v.optional(v.string()),
      severity: v.number(),
      condition: v.string(),
      precipChance: v.number(),
      tempF: v.number(),
      morning: dayPartWeatherFields,
      midday: dayPartWeatherFields,
      dinner: dayPartWeatherFields,
      late: dayPartWeatherFields,
    })
      .index("by_signalKey", ["signalKey"])
      .index("by_zone_day", ["zone", "day"]),

    resolvedDemand: defineTable({
      signalKey: v.string(), // `${zone}__${concept}__${day}`
      zone: v.string(),
      concept: v.string(),
      day: v.string(),
      date: v.string(),
      peakDaypart: v.string(),
      peakScore: v.number(),
      peakBand: v.string(),
      morningScore: v.number(),
      morningBand: v.string(),
      middayScore: v.number(),
      middayBand: v.string(),
      dinnerScore: v.number(),
      dinnerBand: v.string(),
      lateScore: v.number(),
      lateBand: v.string(),
    })
      .index("by_signalKey", ["signalKey"])
      .index("by_zone_concept_day", ["zone", "concept", "day"]),

    // Base score/band per daypart before any event or weather effect — same
    // WIDE shape as Bubble's DemandScore (one row per zone × concept × day).
    // Fixed reference data, uploaded once from data/baseDemand.json (built from
    // foreshift_base_demand_wide.csv) via outlookApp:seedDemandScores.
    demandScores: defineTable({
      signalKey: v.string(), // `${zone}__${concept}__${day}`
      zone: v.string(),
      concept: v.string(),
      day: v.string(),
      morningBaseScore: v.number(),
      morningBaseBand: v.string(),
      middayBaseScore: v.number(),
      middayBaseBand: v.string(),
      dinnerBaseScore: v.number(),
      dinnerBaseBand: v.string(),
      lateBaseScore: v.number(),
      lateBaseBand: v.string(),
    })
      .index("by_signalKey", ["signalKey"])
      .index("by_zone_concept_day", ["zone", "concept", "day"]),

    // "How was your day?" feedback from the web app's Feedback Loop dialog: one
    // row per operator per calendar date (resubmitting replaces it). `actual` is
    // what the operator reports per daypart; the prediction is snapshotted from
    // that day's resolved demand at submit time so it can be compared later
    // even after the forecast changes. Private to the operator — only ever read
    // by clerkId.
    feedback: defineTable({
      clerkId: v.string(),
      zone: v.string(),
      concept: v.string(),
      date: v.string(), // "YYYY-MM-DD" (Detroit) the feedback is about
      dayparts: v.array(
        v.object({
          daypart: v.string(), // morning | midday | dinner | late
          actual: v.string(), // Dead | Slow | Steady | Busy | Slammed | Closed
          predictedScore: v.optional(v.number()),
          predictedBand: v.optional(v.string()),
        }),
      ),
      submittedAt: v.number(),
    }).index("by_clerkId_and_date", ["clerkId", "date"]),

    // Generated outlook results (today / weekly / events / weather) for the
    // web app, one per zone × concept × type × date. Holds the exact JSON the
    // /demand/outlook pipeline returns — including the Gemini narration and
    // per-daypart notes — so a page load doesn't pay for an AI call each time
    // (the role Bubble's Daily Data / Weekly Data / EventData tables play).
    // `fingerprint` captures the numeric inputs; when they change the cached
    // row is stale and gets regenerated.
    outlookCache: defineTable({
      key: v.string(), // `${zone}__${concept}__${type}__${date}`
      fingerprint: v.string(),
      result: v.any(),
      generatedAt: v.number(),
    }).index("by_key", ["key"]),

    // One row per ResolvedDemand sync run (cron or the admin "Save to Bubble"
    // button) — lets the admin panel show "when was this last pushed" even
    // across page reloads / a closed-then-reopened tab, since it reads from
    // this table instead of in-memory client state.
    bubbleSyncLog: defineTable({
      trigger: v.union(v.literal("admin"), v.literal("cron")),
      triggeredBy: v.optional(v.string()), // admin email/username; unset for cron
      startedAt: v.number(),
      finishedAt: v.number(),
      status: v.union(v.literal("success"), v.literal("error")),
      total: v.number(),
      created: v.number(),
      updated: v.number(),
      deleted: v.number(),
      error: v.optional(v.string()),
    }).index("by_trigger_and_finishedAt", ["trigger", "finishedAt"]),
  },
  { schemaValidation: true }
);
