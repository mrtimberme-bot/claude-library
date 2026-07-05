---
name: swiftlint-swiftformat
description: Use when setting up or debugging Swift code style tooling — authoring .swiftlint.yml or .swiftformat config, writing custom SwiftLint rules, gating CI on lint/format violations, wiring pre-commit hooks, or resolving conflicts where SwiftLint and SwiftFormat disagree on formatting.
---
# SwiftLint + SwiftFormat

Two tools, two jobs: **SwiftFormat rewrites code** (whitespace, ordering, wrapping); **SwiftLint flags issues** (style violations, some auto-fixable, some requiring a human decision). Run SwiftFormat first, then SwiftLint — never the reverse, or SwiftLint will flag things SwiftFormat is about to fix anyway.

## Core principle

Treat config as the single source of truth for both tools, keep them **non-overlapping** (disable any SwiftLint formatting rule that SwiftFormat already owns — e.g. `trailing_comma`, `opening_brace`, `vertical_whitespace`), and gate CI on `--strict` so warnings fail the build, not just errors.

## Quick reference

| Task | Config / rule | Command |
|---|---|---|
| Format code | `.swiftformat` | `swiftformat .` |
| Lint code | `.swiftlint.yml` | `swiftlint lint --strict` |
| Autofix lintable issues | `.swiftlint.yml` | `swiftlint --fix` |
| Custom project rule | `custom_rules:` in `.swiftlint.yml` (regex) | — |
| Gate CI | both, in sequence, no `--fix` | `swiftformat --lint . && swiftlint lint --strict` |
| Pre-commit hook | staged files only | `git diff --name-only --cached --diff-filter=ACM \| grep '\.swift$' \| xargs swiftlint lint --strict --path` |
| Disable inline | — | `// swiftlint:disable:next force_cast` |
| Check formatting w/o rewriting | `.swiftformat` | `swiftformat --lint .` |

## Complete example

`.swiftlint.yml`:
```yaml
included:
  - Sources
excluded:
  - .build
  - Sources/Generated

opt_in_rules:
  - explicit_init
  - closure_spacing
  - force_unwrapping
  - unused_import

disabled_rules:
  # owned by SwiftFormat — avoid double-reporting
  - trailing_comma
  - opening_brace
  - vertical_whitespace
  - colon

custom_rules:
  no_print_statements:
    regex: '\bprint\('
    match_kinds: identifier
    message: "Use Logger instead of print()."
    severity: warning

line_length:
  warning: 120
  error: 160

identifier_name:
  min_length: 2
  excluded: [id, x, y]
```

`.swiftformat`:
```
--swiftversion 6.0
--indent 4
--maxwidth 120
--wraparguments before-first
--self remove
--importgrouping testable-bottom
```

CI step (GitHub Actions), fails the build on any violation, no silent auto-fix:
```yaml
- name: Check formatting
  run: swiftformat --lint .
- name: Lint
  run: swiftlint lint --strict
```

## Common mistakes

- **Running `swiftlint --fix` in CI.** CI should only *check*; fixing belongs in local dev or a pre-commit hook. A CI job that autofixes and re-commits silently hides regressions and races with the developer's uncommitted work.
- **Rule conflicts.** SwiftLint's formatting-style rules (`trailing_comma`, `opening_brace`, `vertical_whitespace`, `colon`, `comma`) overlap with SwiftFormat rules and will flip-flop a file between the two tools' preferred styles. Disable the SwiftLint side and let SwiftFormat own layout.
- **`swiftformat` wiping intentional formatting.** Manually aligned comments, deliberate blank-line grouping, or custom multi-line literals get flattened by default. Use `// swiftformat:disable:next` (or a block `disable`/`enable` pair) around code that must stay as written.
- **CI false negatives from exit-code swallowing.** `swiftlint lint` without `--strict` exits 0 on warnings — only errors fail the build. Always use `--strict` in CI, and confirm the shell doesn't mask the exit code (e.g. piping through `| tee log.txt` without `set -o pipefail`).
- **Version drift.** SwiftLint and SwiftFormat pin to specific Swift versions for parsing; a Swift 6 project running an old cached SwiftLint binary in CI will miss new syntax or silently skip rules. Pin tool versions (Mint, SPM plugin, or a `Brewfile`) alongside the Swift toolchain version.
- **Custom regex rules matching inside strings/comments.** Without `match_kinds`, a `custom_rules` regex can trigger on string literals or comments that happen to contain the pattern. Scope `match_kinds` (e.g. `identifier`, `argument`) to avoid false positives.
