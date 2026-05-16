---
name: debug-detective
description: Crash analyse en debugging - Sentry payloads, stacktraces, regression detection. Gebruik bij production issues.
allowed-tools: Read, Grep, Bash
---

# Debug Detective

## Crash report analyse

### Sentry payload structuur
````json
{
  "exception": {
    "type": "NSInvalidArgumentException",
    "value": "unrecognized selector sent to instance 0x...",
    "stacktrace": { "frames": [...] }
  },
  "contexts": {
    "app": { "app_version": "1.2.3" },
    "device": { "model": "iPhone15,3", "os": "17.5" }
  },
  "release": "my-app@1.2.3+456",
  "tags": { ... }
}
````

### Analyse process
1. **Identify frame** — welke regel in jouw code
2. **Git blame** — wanneer en waarom geschreven
3. **Recent changes** — commits tussen last working version en crash version
4. **Pattern match** — ken ik deze crash al? (zie patterns database)
5. **Root cause hypothesis**
6. **Verification plan** — hoe reproduce
7. **Fix proposal** met regression test

## Common iOS crash patterns

### Force unwrap nil
Fatal error: Unexpectedly found nil while unwrapping an Optional value
Grep codebase voor `!` op lines van stacktrace. Fix: `guard let` of `if let`.

### Index out of bounds
Fatal error: Array index out of range
Check array access zonder `.indices.contains()` guard.

### Main thread violation
-[UIView setFrame:]: Method called on background thread
Wrap in `await MainActor.run { ... }`.

### SwiftUI binding issue
Attempted to read an unbound value
@Binding zonder parent value. Gebruik `@Binding.constant(default)`.

### Memory access
EXC_BAD_ACCESS
Vaak retain cycle. Check `[weak self]` in closures.

### Swift concurrency violation (Swift 6)
Thread performance checker: Thread running at User-interactive quality-of-service class waiting on a lower QoS thread
Actor isolation probleem. Check `@MainActor` usage.

## Regression detection workflow

### Stap 1: bisect crash to commit
````bash
# Find last working version
git log --oneline v1.2.2..v1.2.3

# Per commit, check if crash introduced
for commit in $(git log --format=%H v1.2.2..v1.2.3); do
  git checkout $commit
  # Run reproduction steps
done
````

### Stap 2: isoleer
Kleinere reproducties bouwen. Als crash in View A, is het A zelf of een dependency?

### Stap 3: hypothesis testen
Schrijf Swift Testing test die crash reproduceert. Fix code tot test slaagt.

### Stap 4: regression test permanent
Test blijft in suite. Voorkomt terugkomst.

## LLDB patronen via MCP

````bash
mcp__XcodeBuildMCP__debug_attach <bundle-id>
````

Dan in LLDB:
po self.state                    # Dump Swift state
frame variable                   # All locals
bt                               # Backtrace
memory read 0x...                # Raw memory
expression -- self.loadData()    # Execute code

## Performance debugging

### Main thread hangs
Via Instruments:
- Time Profiler: CPU hotspots
- Hangs: main thread blocking >250ms

Code checks:
- `DispatchQueue.main.sync` → NEVER (deadlock)
- Heavy work in View body → extract naar ViewModel
- JSON parsing main thread → move naar Task.detached

### Memory leaks
Via Instruments:
- Allocations: growing allocation count
- Leaks: retain cycles

Code checks:
- `self` in closures zonder `[weak self]`
- Timer zonder invalidate in deinit
- NotificationCenter observers zonder remove

### Launch time
Via Instruments:
- App Launch template
- Pre-main time (dylib loading)
- Main time (app setup)

Fix:
- Lazy load dependencies
- Defer non-critical init
- SwiftData async loading

## Pattern database (build up over time)

Maintain `docs/debug/crash-patterns.md`:
````markdown
## Pattern: Nil unwrap on SwiftData @Query

Symptom: `Fatal error: Unexpectedly found nil` on @Query property access
Cause: Race condition tussen view appear en data ready
Fix: Use `@Query.Default` with empty array fallback
First seen: 2026-03-15 v1.1.2
Fixed in: 2026-03-18 v1.1.3
````

Bouw deze database op met elke crash die je oplost.

## Output format

Per crash report:
````markdown
# Crash Analysis: <summary>

## Stacktrace interpretation
<frame-by-frame uitleg>

## Root cause hypothesis
<wat gaat mis en waarom>

## Reproduction steps
1. <stap>
2. <stap>

## Fix proposal
```swift
// Before
<code>

// After
<code>
```

## Regression test
```swift
@Test
func <crash-name>_doesNotOccur() { ... }
```

## Related
- Similar pattern: <link>
- Introduced in: commit <sha>
````
