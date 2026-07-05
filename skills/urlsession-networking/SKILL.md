---
name: urlsession-networking
description: 'Use when building, reviewing, or debugging a Swift URLSession networking layer: request builders, Codable decoding/error handling, retry/backoff, response caching, auth token injection/refresh, background sessions, or making network code testable with async/await.'
---
# URLSession Networking

Guidance for a modern, testable Swift networking layer built on `URLSession` + structured concurrency (`async/await`), targeting Swift 6 / iOS 17+.

## Core principle

One `NetworkClient` actor (or `Sendable` struct) owns a `URLSession` and exposes a single generic `send<T: Decodable>(_:) async throws -> T` entry point. Never scatter ad-hoc `URLSession.shared.data(for:)` calls across the codebase — every concern (auth, retry, caching, decoding, logging) is a decorator/middleware around that one entry point.

## First steps / triage

1. **Identify the failure mode first**: decoding crash, wrong status code handling, stale cache, expired token not refreshed, or untestable singleton usage?
2. **Check concurrency shape**: is the client an `actor`? Is `URLSession` and its delegate `Sendable`-safe? Background sessions need a delegate class, not closures.
3. **Check the abstraction boundary**: is there a protocol (e.g. `HTTPClient`) in front of `URLSession`, or is `URLSession.shared` called directly in view models? Direct calls block unit testing — fix this before adding features.
4. **Confirm error typing**: is there a dedicated `NetworkError` enum, or are raw `URLError`/`DecodingError` leaking into UI code?

## Routing map

| Task | Pattern |
|---|---|
| One-off GET/POST with Codable | `URLSession.data(for:)` + `JSONDecoder`, typed `NetworkError` |
| Reusable request construction | `Endpoint`/`APIRequest` struct → `URLRequest` builder, not string concatenation |
| Retry on transient failure (5xx, timeout) | Exponential backoff wrapper around `send`, capped attempts, only on idempotent methods |
| Repeated GETs, offline support | `URLCache` with `Cache-Control` respecting policy, or custom disk cache keyed by request hash |
| Bearer/OAuth token on every request | Async token provider actor; inject in request builder, not per-call-site |
| Token expiry mid-flight | Single-flight refresh (actor-serialized) + retry original request once |
| Large uploads/downloads, app-suspend-safe | `URLSessionConfiguration.background(withIdentifier:)` + delegate-based session, not async `data(for:)` |
| Unit testing network code | Protocol over the transport (`URLDataLoading`), inject `URLProtocol`-based mock or a fake conforming type |

## Example: typed client with Codable error handling

```swift
enum NetworkError: Error, Sendable {
    case transportError(URLError)
    case invalidResponse
    case httpStatus(Int, Data)
    case decodingError(DecodingError)
}

protocol URLDataLoading: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: URLDataLoading {}

actor NetworkClient {
    private let loader: URLDataLoading
    private let decoder: JSONDecoder

    init(loader: URLDataLoading = URLSession.shared, decoder: JSONDecoder = .init()) {
        self.loader = loader
        self.decoder = decoder
    }

    func send<T: Decodable>(_ request: URLRequest, as type: T.Type = T.self) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await loader.data(for: request)
        } catch let error as URLError {
            throw NetworkError.transportError(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw NetworkError.httpStatus(http.statusCode, data)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch let error as DecodingError {
            throw NetworkError.decodingError(error)
        }
    }
}
```

In tests, inject a fake `URLDataLoading` (or a `URLProtocol` stub) — never hit the network or rely on `URLSession.shared` singletons.

## Common mistakes

- Calling `URLSession.shared` directly from view models/view controllers — untestable, unauditable.
- Using `try? await` and silently swallowing `DecodingError` details needed for debugging.
- Retrying non-idempotent requests (POST) on transient failure without idempotency keys.
- Reimplementing HTTP caching manually when `URLCache` + correct `Cache-Control`/`ETag` headers already solve it.
- Refreshing auth tokens per-request instead of serializing refresh through a single actor, causing thundering-herd refresh storms.
- Using the standard (non-background) session for large transfers that must survive app suspension.
- Marking cross-actor networking types `@unchecked Sendable` to silence warnings instead of fixing actual isolation.
