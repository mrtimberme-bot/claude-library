---
name: mcp-server-builder
description: Use when designing, building, reviewing, or debugging a Model Context Protocol (MCP) server — writing tool schemas for LLM agents, choosing stdio vs HTTP/SSE transport, adding auth, shaping error responses, or deciding between tool/resource/prompt primitives.
---
# MCP Server Builder

An MCP server is a UI for a model, not for a human. Every tool name, parameter, and error message is read by an LLM deciding what to call and how to recover — optimize for that reader, not for API elegance.

## Core principle

The model only sees what you expose: the tool name, the description, the JSON Schema, and whatever comes back on success or failure. If a human would need the source code or a support ticket to use your tool correctly, the model will misuse it too. Write descriptions that answer "when do I call this, with what, and what happens if it fails" — inline, in the schema.

## Quick reference

| Design question | Guidance |
|---|---|
| How many tools should I expose? | As few as cover distinct actions. Prefer one parameterized tool (`search(type: "user"\|"order")`) over near-duplicate tools unless the inputs/outputs genuinely differ. |
| Tool vs resource vs prompt? | **Tool** = an action with side effects or computation the model triggers. **Resource** = data the client/user attaches to context (read-only, addressable by URI). **Prompt** = a reusable, user-triggered template, not model-invoked. |
| stdio or HTTP/SSE? | stdio for local, single-client, trusted-process integrations (CLI tools, desktop apps) — simplest, no auth needed. HTTP/SSE (or Streamable HTTP) for remote/multi-client servers, when you need auth, or when the server outlives one client process. |
| Authentication | stdio: inherit the host process's trust boundary, no token needed. Remote HTTP: OAuth 2.1 with per-client tokens; never accept long-lived static API keys from untrusted clients. Scope tokens to the minimum tool set. |
| Naming tools | Verb-first, unambiguous, no collisions with common tools (`get_weather`, not `weather` or `process`). Namespace if you expose many (`github_create_issue`). |
| Parameter descriptions | Describe format, units, valid ranges, and defaults inline — the model cannot infer them. State what happens if omitted. |
| Errors | Return a structured, actionable error as tool output (`isError: true` + message), never let a raw exception/stack trace reach the model. Say what went wrong and what to try next. |
| Tool scope | One tool = one job. A tool that "does everything" forces the model to guess which subset of parameters applies; split it. |
| Testing | Run the server under `npx @modelcontextprotocol/inspector <cmd>` and manually invoke each tool with valid, missing, and malformed input before wiring it to a real agent. |

## Example: a well-shaped tool (TypeScript, `@modelcontextprotocol/sdk`)

```ts
server.registerTool(
  "get_weather_forecast",
  {
    title: "Get weather forecast",
    description:
      "Returns a 3-day daily weather forecast (high/low temp in °C, " +
      "precipitation chance %) for a location. Use this for forward-looking " +
      "weather questions. For current conditions right now, use get_current_weather instead.",
    inputSchema: {
      type: "object",
      properties: {
        latitude: { type: "number", minimum: -90, maximum: 90, description: "Decimal degrees, e.g. 52.37" },
        longitude: { type: "number", minimum: -180, maximum: 180, description: "Decimal degrees, e.g. 4.90" },
        days: { type: "integer", minimum: 1, maximum: 3, default: 3, description: "Number of forecast days to return, 1-3" },
      },
      required: ["latitude", "longitude"],
    },
  },
  async ({ latitude, longitude, days = 3 }) => {
    try {
      const data = await fetchForecast(latitude, longitude, days);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Forecast lookup failed: ${humanize(err)}. Check that latitude/longitude are valid coordinates and retry.` }],
      };
    }
  }
);
```

Note the split from a hypothetical `get_current_weather` tool, the explicit disambiguation in the description, range-validated schema fields, and an error path that never leaks `err.stack`.

## Common mistakes

- **Vague descriptions** ("Gets data", "Handles user request") — the model picks the wrong tool or the right tool with wrong arguments. Every description should make tool *selection* unambiguous against every other tool in the server.
- **Leaking raw exceptions** — stack traces, driver-level SQL errors, or `undefined is not a function` teach the model nothing about what to retry differently. Translate to a message that names the likely cause and a next action.
- **Overly broad tool scope** — a single `do_database_thing(action, table, data)` tool forces the model to reverse-engineer your internal API from trial and error. Expose the actual operations as separate, narrowly-scoped tools.
- **Missing input validation** — relying on the model to send well-formed input. Enforce types, ranges, and required fields in the JSON Schema, and re-validate server-side before touching any side-effecting system.
- **No inspector pass before shipping** — wire the server directly into an agent without ever calling it manually; malformed-input and error-path bugs surface as confusing agent behavior instead of a clear test failure.
