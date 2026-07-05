---
name: sharplay-groupactivities
description: Use when implementing SharePlay or the GroupActivities framework — defining a GroupActivity type, starting/joining a GroupSession, syncing state across participants, coordinating playback for media apps, or testing multi-participant SharePlay sessions.
---
# SharePlay & GroupActivities

SharePlay only exists inside a FaceTime call (or, on visionOS/iOS 17+, a supported SharePlay-enabled context) — there is no session to join outside one. Never assume `GroupSession` availability; always observe `GroupStateMessenger`/session state and degrade gracefully to single-user mode.

## Core principle

1. Define a `GroupActivity`-conforming type describing *what* the shared experience is (metadata only — no live state).
2. Activate it via `GroupActivity.activate()` (or offer it through a `GroupActivitySharingController`); this only *proposes* the activity — the system decides whether to start a session.
3. Await sessions from `MyActivity.sessions()` and join by calling `session.join()`; observe `session.$state` for `.joined`/`.invalidated` and `session.$activeParticipants` for people entering/leaving.
4. Choose your sync mechanism deliberately: `GroupSessionMessenger` for transient, fire-and-forget events (taps, reactions, seek commands); a shared reducer pattern (each participant applies the same deterministic state transitions from ordered messages) when state must stay consistent even with late joiners.

## Quick reference

| Need | API |
|---|---|
| Describe a shared activity | `GroupActivity` protocol (`activityIdentifier`, `metadata`) |
| Propose starting SharePlay | `activity.activate()` |
| Discover incoming/existing sessions | `for await session in MyActivity.sessions() { ... }` |
| Join a session | `session.join()` |
| Track participants | `session.$activeParticipants` (a `Set<Participant>`) |
| React to session lifecycle | `session.$state` (`.waiting`, `.joined`, `.invalidated(reason:)`) |
| Send transient events | `GroupSessionMessenger(session:)` → `send(_:)` / `messages(of:)` |
| Reliable/ordered delivery | `messenger.send(_:to:)` with `.reliable` (default) delivery mode |
| Synchronize playback | `GroupSessionCoordinator` + `CoordinationConfiguration` on an `AVPlayer` |
| Spatial seating for video/audio | `SystemCoordinator.configuration.spatialTemplatePreference` |
| Check SharePlay eligibility | `GroupStateObserver().isEligibleForGroupSession` |

## Complete example

```swift
import GroupActivities
import Combine

struct WatchTogetherActivity: GroupActivity {
    static let activityIdentifier = "com.yourapp.watch-together"

    var videoID: String
    var metadata: GroupActivityMetadata {
        var metadata = GroupActivityMetadata()
        metadata.title = "Watch Together"
        metadata.type = .watchTogether
        return metadata
    }
}

@MainActor
final class SharePlayCoordinator: ObservableObject {
    @Published var participantCount = 0
    private var session: GroupSession<WatchTogetherActivity>?
    private var messenger: GroupSessionMessenger?
    private var tasks: Set<Task<Void, Never>> = []

    func startSharing(videoID: String) async {
        let activity = WatchTogetherActivity(videoID: videoID)
        switch await activity.prepareForActivation() {
        case .activationPreferred:
            _ = try? await activity.activate()
        case .activationDisabled, .cancelled:
            break
        @unknown default:
            break
        }
    }

    func observeSessions() {
        let task = Task {
            for await session in WatchTogetherActivity.sessions() {
                configure(session: session)
            }
        }
        tasks.insert(task)
    }

    private func configure(session: GroupSession<WatchTogetherActivity>) {
        let messenger = GroupSessionMessenger(session: session)
        self.session = session
        self.messenger = messenger

        session.$activeParticipants
            .receive(on: DispatchQueue.main)
            .sink { [weak self] participants in
                self?.participantCount = participants.count
            }
            .store(in: &cancellables)

        session.$state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                if case .invalidated = state {
                    self?.session = nil
                    self?.messenger = nil
                }
            }
            .store(in: &cancellables)

        let receiveTask = Task {
            for await (event, _) in messenger.messages(of: PlaybackEvent.self) {
                await handle(event: event)
            }
        }
        tasks.insert(receiveTask)

        session.join()
    }

    func broadcast(seekTo time: TimeInterval) {
        Task { try? await messenger?.send(PlaybackEvent.seek(time)) }
    }

    private func handle(event: PlaybackEvent) async {
        // Apply the same deterministic transition every participant applies —
        // this is the "shared reducer": no participant is authoritative.
    }

    private var cancellables: Set<AnyCancellable> = []
}

enum PlaybackEvent: Codable {
    case seek(TimeInterval)
    case pause
    case play
}
```

For media apps, prefer `GroupSessionCoordinator` (via `AVPlayerPlaybackCoordinator` or `AVPlaybackCoordinator`) over hand-rolled seek messages — it handles buffering skew, late joiners, and spatial persona positioning (`SystemCoordinator.configuration.spatialTemplatePreference`) for free.

## Common mistakes

- **Not handling session state changes or participants leaving** — treating `session.join()` as a one-time setup instead of subscribing to `$state` (`.invalidated`) and `$activeParticipants`; sessions end mid-flight when the last two participants disconnect or the FaceTime call ends, and stale messengers/tasks must be torn down.
- **Assuming SharePlay works without a FaceTime/system context** — `GroupActivity.activate()` only *proposes* an activity; outside an active call (or supported system SharePlay surface) there is no session, `sessions()` never yields, and code must fall back to solo behavior rather than hang waiting.
- **Testing on only one device/simulator** — a single simulator can't form a real `GroupSession`; verify with at least two simulators or devices on the same FaceTime call (Simulator supports simulated SharePlay via Features ▸ SharePlay for basic flows, but participant-leave/rejoin/spatial behavior needs real multi-device testing).
- **Using `GroupSessionMessenger` for state that must stay consistent** — transient messages can arrive out of order or be missed by late joiners; use a deterministic shared-reducer pattern (or `GroupSessionCoordinator` for media) for anything that must converge to the same state for everyone.
- **Forgetting `prepareForActivation()`** — calling `activate()` directly skips the check for whether the system prefers an in-app UI (e.g., an existing session already running) versus system activation, causing duplicate or conflicting sessions.
