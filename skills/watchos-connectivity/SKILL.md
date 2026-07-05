---
name: watchos-connectivity
description: 'Use when building or debugging watchOS apps that sync with an iPhone or run standalone: WatchConnectivity (WCSession, sendMessage, transferUserInfo, updateApplicationContext, transferFile), reachability/pairing checks, companion vs standalone design, ClockKit/WidgetKit complications, budget issues.'
---
# watchOS Connectivity

Fast, correct guidance for Apple Watch <-> iPhone communication and watchOS app architecture. Core principle: **pick the WatchConnectivity API by urgency and payload size, not by habit** — each one trades latency for delivery guarantees differently, and most "message never arrived" bugs come from using the wrong one or skipping a session-state check.

## Quick reference

| API | When to use | Constraints |
|---|---|---|
| `sendMessage(_:replyHandler:)` | Live, interactive exchange; need a reply now (e.g. fetch current state on watch launch) | Requires `isReachable == true`; both apps foreground/active-ish; fails immediately if unreachable; small payloads (well under 64KB, keep to a few KB) |
| `sendMessageData(_:replyHandler:)` | Same as above but binary/custom-encoded payload | Same reachability requirement as `sendMessage` |
| `transferUserInfo(_:)` | Queued, guaranteed delivery, order matters (e.g. logging a workout event) | Delivered even if unreachable/backgrounded; FIFO queue persists across launches; not for large data; no delivery-time guarantee |
| `updateApplicationContext(_:)` | "Latest state wins" sync (e.g. current settings, last-known value) | Only most recent context is kept — earlier calls are overwritten/dropped before delivery; delivered opportunistically, not queued per-call |
| `transferFile(_:metadata:)` | Large binary payloads (images, audio, datasets) | Background-transfer-backed, survives app suspension; slow, no ordering guarantee; pair with `transferUserInfo` for accompanying metadata if needed |
| `transferCurrentComplicationUserInfo(_:)` | Complication-relevant data updates (watchOS <9 / ClockKit) | Counts against the complication update budget; high priority but budget-limited |

Reachability and pairing gate everything real-time: check `session.isPaired`, `session.isWatchAppInstalled`, and `session.isReachable` before calling `sendMessage`; fall back to `transferUserInfo`/`updateApplicationContext` when any are false.

## Standalone vs companion architecture

- **Companion (paired) app**: relies on the iPhone for data/auth/heavy processing; use WatchConnectivity as the sync layer. Good when the phone is the source of truth (e.g. an account-based app).
- **Standalone app**: runs and functions fully without the iPhone present (watchOS 6+ supports install-without-phone via the App Store on Watch). Use its own `URLSession` for network access, its own persistence (SwiftData/Core Data on watch), and treat WatchConnectivity as an *optimization*, not a dependency — the watch app must degrade gracefully if the phone is absent or unreachable.
- Decide this architecture first: it determines whether WatchConnectivity failures are cosmetic (companion, phone unreachable = stale cache) or fatal (badly-designed standalone app wrongly gated on phone data).

## WCSession setup + message with reply handler

```swift
import WatchConnectivity

final class WatchConnectivityManager: NSObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()
    private let session = WCSession.default

    func activate() {
        guard WCSession.isSupported() else { return }
        session.delegate = self
        session.activate()
    }

    func requestLatestValue(completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard session.activationState == .activated, session.isReachable else {
            completion(.failure(ConnectivityError.notReachable))
            return
        }
        session.sendMessage(
            ["request": "latestValue"],
            replyHandler: { reply in
                completion(.success(reply))
            },
            errorHandler: { error in
                completion(.failure(error))
            }
        )
    }

    // MARK: WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}

    func sessionReachabilityDidChange(_ session: WCSession) {
        // Toggle UI affordances / retry queued sends here.
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
    #endif
}

enum ConnectivityError: Error { case notReachable }
```

On iOS, `WCSessionDelegate` also requires `sessionDidBecomeInactive`/`sessionDidDeactivate` for multi-watch pairing support — reactivate in `sessionDidDeactivate`. On watchOS these two are unavailable and must be excluded (as above).

## Complications: ClockKit vs WidgetKit

- **watchOS 9+**: complications are built with **WidgetKit** (`AccessoryCircular`, `AccessoryRectangular`, `AccessoryCorner`, `AccessoryInline` families) using the same `TimelineProvider`/`TimelineEntry` model as iOS widgets. This is the current, required path for new apps.
- **ClockKit (`CLKComplicationDataSource`)** is legacy, pre-watchOS 9; only relevant when supporting older OS versions. Do not start new complication work on ClockKit.
- Both models share the same underlying constraint: complications update from a **shared, limited daily budget** (higher for the currently-active complication, lower for background ones), not real time. Calling `WCSession.transferCurrentComplicationUserInfo` or reloading a widget timeline does not force an immediate refresh if the budget is exhausted — the system defers it.

## Common mistakes

- Using `sendMessage` for large or non-urgent payloads instead of `transferUserInfo`/`transferFile` — causes silent failures when the watch sleeps or the app backgrounds mid-call.
- Never checking `isPaired`, `isWatchAppInstalled`, or `isReachable` before sending — leads to crashes/errors that only reproduce with the phone locked or out of range.
- Treating `updateApplicationContext` as a queue — it is last-write-wins; multiple rapid calls silently collapse into one, so it's wrong for anything that needs every update delivered (use `transferUserInfo` instead).
- Building a "standalone" watch app that silently hard-depends on live WatchConnectivity data with no offline/no-phone fallback.
- Assuming `WCSession.activate()` synchronously enables sending — always gate sends on `activationDidCompleteWith` / current `activationState`.
- Expecting complications to refresh instantly after a data change — budget exhaustion (common with frequent low-priority updates) silently delays or drops refreshes; prioritize the complication currently on the active face and batch less-urgent updates.
- Forgetting `WCSessionDelegate`'s iOS-only methods (`sessionDidBecomeInactive`/`sessionDidDeactivate`) when sharing delegate code between the iOS and watchOS targets — guard with `#if os(iOS)`.
