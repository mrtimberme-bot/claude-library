---
name: combine-framework
description: Use when working with Combine publishers/subscribers, @Published properties, sink/assign, ObservableObject view models, or legacy/hybrid Swift codebases with existing reactive pipelines that still rely on Combine rather than async/await.
---
# Combine Framework

Idiomatic guidance for using Combine well in codebases where it's still the right (or existing) tool — not a migration guide. For moving code *off* Combine onto async/await and AsyncSequence, use the `swift-concurrency-expert` skill instead; this skill is its counterpart for maintaining and extending Combine that's already there.

## Core principle

A Combine pipeline is a declarative description of *when* and *how* values flow, not a sequence of imperative steps. Build the pipeline once (in `init` or a computed property), let operators express transformation/filtering/timing, and keep exactly one `sink`/`assign` at the terminal end per concern. Every subscription must be retained (`AnyCancellable`) for as long as it should stay alive — an un-stored subscription is cancelled immediately when it goes out of scope.

## Quick reference

| Need | Operator / pattern |
|---|---|
| Transform each value | `.map`, `.compactMap` (drop nils) |
| Chain to another async/publisher-producing step | `.flatMap(maxPublishers:)` |
| Wait for typing/input to settle | `.debounce(for:scheduler:)` |
| Combine latest values from multiple publishers | `.combineLatest`, `.merge` (for identical types) |
| Skip repeated identical values | `.removeDuplicates()` |
| Ignore first N or take first N | `.dropFirst(_:)`, `.prefix(_:)` |
| Switch to a new publisher, cancel the old one | `.switchToLatest()` (pairs with `flatMap` for search-as-you-type) |
| Hop to main thread for UI updates | `.receive(on: DispatchQueue.main)` |
| Push values into a stored property | `.assign(to: &$property)` (no manual cancellable needed) |
| Bridge into async/await for one-shot migration points | `for try await value in publisher.values { ... }` |

## Example: debounced search feeding SwiftUI

```swift
@MainActor
final class SearchViewModel: ObservableObject {
    @Published var query: String = ""
    @Published private(set) var results: [SearchResult] = []

    private var cancellables = Set<AnyCancellable>()

    init(searchService: SearchService) {
        $query
            .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
            .removeDuplicates()
            .filter { !$0.isEmpty }
            .flatMap { [weak searchService] term -> AnyPublisher<[SearchResult], Never> in
                guard let searchService else {
                    return Just([]).eraseToAnyPublisher()
                }
                return searchService.search(term)
                    .catch { _ in Just([]) }
                    .eraseToAnyPublisher()
            }
            .receive(on: DispatchQueue.main)
            .assign(to: &$results)
    }
}
```

`assign(to: &$results)` writes directly into the `@Published` storage and manages its own lifetime tied to `self` — no `[weak self]` needed for that terminal step, and nothing to store in `cancellables` here. Use `.sink` + `cancellables` when you need side effects (logging, triggering another action) instead of just writing to a property.

## Common mistakes

- **Strong `self` capture in long-lived `sink` closures** — a subscription stored on `self` that also captures `self` strongly creates a retain cycle. Use `[weak self]` in any `sink`/`flatMap` closure stored as an instance property, and guard-unwrap at the top.
- **Forgetting to store the `AnyCancellable`** — `publisher.sink { ... }` with no assignment cancels the subscription the instant the expression's result is discarded. Always assign to a `let`, or insert into a `Set<AnyCancellable>` via `.store(in: &cancellables)`.
- **Reaching for Combine reflexively on new code** — a one-shot async fetch, a single await chain, or simple sequential logic is clearer and easier to test as `async`/`await` than as a publisher pipeline. Reserve Combine for genuinely reactive, multi-value-over-time problems (user input streams, multiple observed properties combining), and for extending existing Combine-based view models rather than introducing a second reactive system alongside them.
- **Mixing schedulers carelessly** — operators upstream of `.receive(on:)` still run on whatever scheduler delivered the value; forgetting `.receive(on: DispatchQueue.main)` before a UI-mutating `sink` causes updates off the main thread.
