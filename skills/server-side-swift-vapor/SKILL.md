---
name: server-side-swift-vapor
description: Use when building a custom backend API in server-side Swift — Vapor or Hummingbird routing, Fluent ORM models/migrations, auth/CORS middleware, async/await request handlers, or deploying a Swift server to Linux/Docker. Also use when deciding whether a custom backend is justified vs a BaaS.
---

# Server-Side Swift (Vapor / Hummingbird)

Build a custom API server in Swift when an app's needs outgrow a Backend-as-a-Service. Vapor is the full-featured framework (routing, Fluent ORM, Leaf templating, queues); Hummingbird is a leaner, more modular alternative built on SwiftNIO with less magic and faster cold starts — pick it when you want fewer opinions or are already in a Swift-Concurrency-first codebase.

## Do you even need a custom backend?

Default to a BaaS (Supabase, Firebase, CloudKit) unless at least one is true:
- Custom business logic that must run server-side and can't live in security rules (payment orchestration, multi-tenant permissions, third-party API brokering that hides secrets).
- Non-Apple clients (Android/web) need to share a data layer — CloudKit is out.
- You need full control over data residency, cost at scale, or a bespoke relational schema Fluent/Postgres models better than a document store.
- You're integrating multiple external services server-side (webhooks, queues, cron jobs) that a BaaS's functions layer can't express cleanly.

If none apply, a custom Vapor backend is extra ops burden (hosting, migrations, TLS, monitoring) for no real gain — use the BaaS.

## Quick reference

| Need | Vapor construct |
|---|---|
| Define a route | `app.get("path", ":id") { req async throws -> T in ... }` |
| Group routes with shared middleware | `routes.grouped(AuthMiddleware())` |
| Persist a model | `final class Model: Content, Model` (Fluent) + `Migration` |
| Query the database | `Model.query(on: req.db).filter(\.$field == value).all()` |
| Auth a request | `req.auth.require(User.self)` behind `Authenticator` middleware |
| Allow cross-origin requests | `app.middleware.use(CORSMiddleware(configuration: ...))` |
| Read secrets | `Environment.get("DATABASE_URL")`, never hardcoded |
| Background/scheduled work | Vapor `Queues` or a cron-triggered job |
| Run in production | Docker image + `Procfile`/systemd on a Linux host (Fly.io, Render, a VPS) |

## Example: Fluent model + async route handler

```swift
import Fluent
import Vapor

final class Todo: Model, Content, @unchecked Sendable {
    static let schema = "todos"

    @ID(key: .id) var id: UUID?
    @Field(key: "title") var title: String
    @Field(key: "is_complete") var isComplete: Bool

    init() {}
    init(id: UUID? = nil, title: String, isComplete: Bool = false) {
        self.id = id
        self.title = title
        self.isComplete = isComplete
    }
}

struct CreateTodo: Migration {
    func prepare(on database: Database) -> EventLoopFuture<Void> {
        database.schema("todos")
            .id()
            .field("title", .string, .required)
            .field("is_complete", .bool, .required, .sql(.default(false)))
            .create()
    }
    func revert(on database: Database) -> EventLoopFuture<Void> {
        database.schema("todos").delete()
    }
}

func routes(_ app: Application) throws {
    let todos = app.grouped("api", "todos").grouped(TokenAuthenticator())

    todos.get { req async throws -> [Todo] in
        try await Todo.query(on: req.db).all()
    }

    todos.post { req async throws -> Todo in
        let input = try req.content.decode(Todo.self)
        try await input.save(on: req.db)
        return input
    }
}
```

## Common mistakes

- **Reaching for a custom backend by default.** Most CRUD-plus-auth apps are fully served by Supabase/Firebase/CloudKit; a hand-rolled server adds hosting, migrations, and on-call burden you now own forever.
- **Blocking the event loop.** Never call synchronous/blocking I/O (blocking file reads, `Thread.sleep`, unbounded CPU work) inside a route handler — it stalls every request sharing that `EventLoop`. Offload to `Thread` pools or a queue job.
- **Hardcoding secrets.** Database URLs, JWT signing keys, and API tokens must come from `Environment.get(...)` / a `.env` file excluded from git — never committed literals, and never the same secret across dev/staging/prod.
- **Skipping migrations discipline.** Every schema change is a new `Migration`; never hand-edit production schema or reuse a migration name after it has shipped.
- **No auth/CORS middleware on mutating routes.** Group write endpoints behind an `Authenticator`/`Authorizable` middleware and set `CORSMiddleware` explicitly rather than leaving routes open by default.
