---
name: app-clips
description: Use when building or reviewing an App Clip — App Clip size budget, invocation methods (App Clip Codes, NFC, QR, Safari App Clip links, Maps/Messages), local vs advertised experiences in App Store Connect, sharing code with the full app, or the App Clip-to-full-app upgrade path.
---
# App Clips

Lightweight, instant-launch entry points into an app. Core constraint is the download **size budget**, not feature scope — every decision (what to bundle, what to defer, how to invoke) flows from staying under it.

## Core principle

Treat the App Clip target as its own tiny app: minimal dependencies, no unused assets, and a hard compile-time boundary against full-app-only code. Share business logic via a framework/package target, never by compiling the full app's files into the clip.

## Quick reference

| Concern | Guidance |
|---|---|
| Size budget | Historically ~15 MB compressed for the App Clip binary (raised from an original 10 MB) but Apple has changed this over time — **verify the current limit in Apple's App Clips documentation before relying on a number**. |
| What counts against it | The App Clip's own compiled binary + its bundled assets/frameworks; the full app's binary does not count, but anything the clip statically links or embeds does. |
| Invocation | App Clip Codes (NFC + visual), plain NFC tags, QR codes, Safari App Clip links (`.smart-app-banner` / applinks), Maps place cards, Messages links. All route through a registered associated domain + invocation URL. |
| Local vs advertised experience | Local: tied to a physical place/App Clip Code, configured in Xcode + ASC, no ad card. Advertised: has a marketing card, can be surfaced via Safari/Search/Maps/Messages, requires App Store Connect review of the card + invocation URL. |
| Shared code | Put models, networking, and shared UI in a Swift Package or embedded framework linked by both the full app target and the App Clip target. |
| Upgrade path | Always give the user an explicit "Get the full app" action; use `SKOverlay` or a custom button — never assume the clip auto-upgrades. |

## Example: minimal target setup

App Clip target's `Info.plist` entry for the invocation URL and required entitlement:

```xml
<!-- Info.plist (App Clip target) -->
<key>NSAppClip</key>
<dict>
    <key>NSAppClipRequestEphemeralUserNotification</key>
    <false/>
    <key>NSAppClipRequestLocationConfirmation</key>
    <false/>
</dict>
```

```xml
<!-- AppClip.entitlements -->
<key>com.apple.developer.parent-application-identifiers</key>
<array>
    <string>$(AppIdentifierPrefix)com.example.FullApp</string>
</array>
<key>com.apple.developer.on-demand-install-capable</key>
<true/>
<key>com.apple.developer.associated-domains</key>
<array>
    <string>appclips:example.com</string>
</array>
```

Gate full-app-only code with a compile condition set on the App Clip target's build settings (`SWIFT_ACTIVE_COMPILATION_CONDITIONS = APPCLIP`):

```swift
#if !APPCLIP
// Full-app-only feature (e.g. full onboarding, settings sync) — excluded from the clip build.
#endif
```

Prefer this over duplicating files: put shared models/networking in a `Shared` framework target that both `FullApp` and `AppClip` link, and reserve `#if APPCLIP` only for entry-point/UI differences.

## Common mistakes

- Bundling full-resolution images, unused localizations, or third-party SDKs the clip doesn't need — silently blows the size budget.
- Forgetting the `NSAppClip` dictionary or associated domains entitlement, so the clip builds but never invokes.
- No visible "get the full app" call to action — users land in the clip with no path to the App Store listing.
- Treating local and advertised experiences as interchangeable — an advertised experience's card and URL go through App Store Connect review and must exactly match the registered invocation URL.
- Compiling the full app's source directly into the App Clip target instead of a shared framework, causing size and maintenance bloat.
