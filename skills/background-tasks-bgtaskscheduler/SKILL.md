---
name: background-tasks-bgtaskscheduler
description: Use when implementing or debugging iOS background work with BGTaskScheduler — choosing BGAppRefreshTask vs BGProcessingTask, registering task identifiers, scheduling/rescheduling, testing tasks in the simulator, handling expiration handlers, or diagnosing App Store rejections tied to background modes and battery drain.
---
# BGTaskScheduler

iOS decides *if* and *when* your background task runs — never assume it will fire on schedule. Every task must register a launch handler before `applicationDidFinishLaunching` returns, and every handler must call `setTaskCompleted(success:)`, including on expiration.

## Core principle

1. Register every task identifier in code (`BGTaskScheduler.shared.register`) **and** in `Info.plist` under `BGTaskSchedulerPermittedIdentifiers` — both are required, mismatches fail silently.
2. Registration must happen synchronously during app launch, before the end of `application(_:didFinishLaunchingWithOptions:)` (or the App's `init` in SwiftUI lifecycle).
3. Always set an expiration handler that cancels ongoing work and calls `setTaskCompleted(success:)`. iOS gives no additional grace period after calling the expiration handler.
4. Reschedule the next task **inside** the handler (both on success and on expiration) — a `BGTask` request is one-shot, it does not repeat itself.

## Quick reference

| Task type | When to use | Registration/scheduling |
|---|---|---|
| `BGAppRefreshTask` | Short (~30s), frequent refresh — fetch new content, sync a feed | `BGAppRefreshTaskRequest(identifier:)`, no `requiresNetworkConnectivity`/`requiresExternalPower` needed |
| `BGProcessingTask` | Longer (minutes), deferrable, maintenance work — reindexing, ML processing, large downloads, cleanup | `BGProcessingTaskRequest(identifier:)`, set `requiresNetworkConnectivity` / `requiresExternalPower` as needed |
| `BGContinuedProcessingTask` (iOS 26+) | User-initiated long-running work that should continue after backgrounding, with a Live Activity-like indicator | `BGContinuedProcessingTaskRequest(identifier:title:subtitle:)` |

Both `BGAppRefreshTaskRequest` and `BGProcessingTaskRequest` accept an optional `earliestBeginDate` — set it, don't rely on defaults, and never set it aggressively close (see Common mistakes).

## Complete example: BGProcessingTask

```swift
import BackgroundTasks

let processingTaskID = "com.yourapp.reindex"

// MARK: - Register (call before didFinishLaunching returns)
func registerBackgroundTasks() {
    BGTaskScheduler.shared.register(
        forTaskWithIdentifier: processingTaskID,
        using: nil
    ) { task in
        handleReindex(task: task as! BGProcessingTask)
    }
}

// MARK: - Schedule
func scheduleReindex() {
    let request = BGProcessingTaskRequest(identifier: processingTaskID)
    request.requiresNetworkConnectivity = false
    request.requiresExternalPower = false
    request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60) // no sooner than 1h

    do {
        try BGTaskScheduler.shared.submit(request)
    } catch {
        // BGTaskSchedulerErrorDomain code 1 = too many pending tasks (max 10 per app)
        print("Could not schedule reindex: \(error)")
    }
}

// MARK: - Handle
func handleReindex(task: BGProcessingTask) {
    // Always schedule the next occurrence first — this run may expire.
    scheduleReindex()

    let operation = ReindexOperation()

    task.expirationHandler = {
        // Called if the task runs out of time. Cancel work; do NOT do new work here.
        operation.cancel()
    }

    operation.completionBlock = {
        task.setTaskCompleted(success: !operation.isCancelled)
    }

    OperationQueue.current?.addOperation(operation)
}
```

## Testing in simulator/on-device

Background tasks never run on your schedule while debugging — trigger them manually:

1. Pause at a breakpoint *after* `submit(_:)` has been called at least once.
2. In the LLDB console:
   ```
   e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.yourapp.reindex"]
   ```
3. To simulate expiration instead of completion:
   ```
   e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateExpirationForTaskWithIdentifier:@"com.yourapp.reindex"]
   ```
4. This only works on-device or simulator with the debugger attached and the process suspended in the background at least once — a cold-launched, never-backgrounded process has nothing registered to simulate against.
5. Xcode's Debug ▸ Simulate Background Fetch is unrelated — it only exercises the legacy `application(_:performFetchWithCompletionHandler:)` API, not BGTaskScheduler.

## Common mistakes

- **Info.plist identifiers missing or mismatched** — every identifier passed to `register(forTaskWithIdentifier:)` must be listed verbatim in `BGTaskSchedulerPermittedIdentifiers`; a typo means `register` returns `false` silently (check the return value).
- **Registering after launch finishes** — registering inside a view's `onAppear` or after a network callback is too late; iOS requires registration before `didFinishLaunchingWithOptions` returns.
- **Never calling `setTaskCompleted(success:)`** — on every code path, including inside the expiration handler. Forgetting this trains the OS to deprioritize your app's future requests.
- **Scheduling too eagerly** — a very short `earliestBeginDate` or resubmitting on every app launch signals abuse to the scheduler; iOS throttles apps that request excessively, and reviewers/users notice battery drain from apps that behave this way.
- **Requesting the `processing` or `fetch` background mode without real deferred work** — Apple rejects apps (and iOS itself deprioritizes them) when `UIBackgroundModes` is declared but the task does trivial or no work; only declare the modes you actually use.
- **Doing unbounded work with no expiration handling** — always design the task body to check `Task.isCancelled`/operation cancellation frequently so it can stop within the expiration window (typically seconds, not minutes).
- **Assuming BGProcessingTask runs while backgrounded on battery** — the system strongly prefers charging + Wi-Fi + device idle for `BGProcessingTaskRequest`; don't rely on it for time-critical work.
- **Testing only via `_simulateLaunchForTaskWithIdentifier:`** — this confirms the handler runs but does not validate real-world scheduling; do a final pass on-device without the debugger, using Settings ▸ Developer Background Task menu options where available (iOS 16+) or field testing before shipping.
