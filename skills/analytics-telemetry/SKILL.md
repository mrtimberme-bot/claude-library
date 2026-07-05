---
name: analytics-telemetry
description: Use when adding analytics or telemetry to an iOS app — choosing between TelemetryDeck, PostHog, or a custom event pipeline, designing an event taxonomy, naming events/properties, avoiding PII leakage, updating the App Store privacy nutrition label, or setting up sampling/batching for cost control.
---
# Analytics & Telemetry

Instrument just enough to answer real product questions, without turning the app into a data-collection liability. Every event should map to a decision someone will actually make; every SDK added must be reflected in the privacy manifest and nutrition label.

**Core principle**: default to privacy-first, aggregate-only telemetry (TelemetryDeck-style, no cross-app/cross-site identifiers) unless the product genuinely needs session-level user analytics — that tradeoff has App Store disclosure and user-trust costs, so make it deliberately, not by SDK default.

## Quick reference

| Question | Guidance |
|---|---|
| Which SDK? | TelemetryDeck for privacy-first aggregate analytics (no user IDs, EU-hosted, cheap). PostHog for product analytics needing funnels/session replay/feature flags (self-host or cloud; review its "Data Not Linked to You" claim carefully). Roll a custom pipeline only if requirements are simple counters/timers and you want zero third-party data flow. |
| How to name events? | `noun_verb_past` snake_case: `paywall_viewed`, `export_completed`, `onboarding_step_skipped`. One taxonomy doc, reviewed before adding events — not ad hoc at the call site. |
| What counts as PII? | Any device/user identifier (IDFA, IDFV reused across sessions, email, exact GPS, free-text user input), and combinations that re-identify (exact timestamp + rare device model + city). Hash or bucket instead of sending raw. |
| Funnel/retention design? | Define the funnel's steps *before* instrumenting (e.g. `onboarding_started` → `onboarding_completed` → `first_action_taken`) so events aren't retrofitted from whatever got logged. Include a stable, anonymous session ID, not a persistent user ID, unless auth already exists. |
| Privacy manifest impact? | Any third-party analytics SDK requires a `PrivacyInfo.xcprivacy` entry declaring collected data types and linkage, plus an approved reason API if it reads disk timestamps, etc. Check the SDK vendor's own manifest is bundled — don't assume. |
| Cost control? | Sample high-volume/low-value events (e.g. scroll events at 10%), batch uploads (flush every 30s or 20 events, whichever first), and drop debug/simulator builds from production event streams. |

## Example

Taxonomy for a paywall feature:
```
paywall_shown        { source: "onboarding" | "settings" | "paywall_trigger" }
paywall_dismissed    { time_shown_ms: Int }
purchase_started     { product_id: String }
purchase_completed   { product_id: String, price_tier: String }
```

Safe logging call — no raw identifiers, bucketed value, no free text:

```swift
func logPaywallShown(source: PaywallSource) {
    Analytics.log(event: "paywall_shown", properties: [
        "source": source.rawValue  // enum, not free text
    ])
    // No user ID, no IDFA, no email — anonymous session ID only,
    // attached automatically by the SDK's default context.
}
```

## Common mistakes

- **PII leakage**: logging raw email, exact coordinates, free-text search queries, or a persistent device identifier as an event property "just in case."
- **Event explosion**: an event per button tap with no taxonomy review, producing hundreds of near-duplicate events nobody queries. Cap the taxonomy; require a reason to add an event.
- **Missing privacy manifest entry**: adding an analytics SDK via SPM without updating `PrivacyInfo.xcprivacy` and the App Store privacy questionnaire — causes review rejection or post-release amendment requirements.
- **Vanity metrics**: tracking `app_opened` counts and calling it done. Instrument the funnel that answers a specific retention or conversion question, not just raw activity.
