---
name: changelog-release-notes
description: 'Use when cutting a release, writing App Store "What''s New" release notes, or generating a changelog from git commits/PRs — covers conventional-commit parsing, translating engineering commits into user-facing copy, App Store character limits, localization, and syncing CHANGELOG.md with released versions.'
---
# Changelog & Release Notes

Turn raw git history into copy that fits its audience. **Core principle: the same change gets three different write-ups** — one for developers (CHANGELOG.md), one for users (App Store notes), one for the team (internal release summary). Never ship one where another belongs.

## Quick reference

| Audience | Source | Tone/format | Length limit |
|---|---|---|---|
| CHANGELOG.md | conventional commits (`feat:`, `fix:`, `chore:`, `perf:`, `BREAKING CHANGE:`) | Keep a Changelog format, grouped under Added/Changed/Fixed/Removed, terse, technical OK | none, but keep entries one line |
| App Store "What's New" | curated subset of user-visible changes only | benefit-oriented, plain language, no jargon, active voice, exclamation sparingly | **4000 chars hard limit** (App Store Connect) |
| Internal release summary | full commit/PR list | includes risk notes, flags, rollback plan, who to ping | no limit, but scannable |

## Workflow

1. Pull merged PRs / commits since last tag: `git log <last-tag>..HEAD --oneline`.
2. Parse conventional-commit prefixes to bucket by type; drop `chore:`, `test:`, `ci:`, `refactor:` from user-facing copy — those are CHANGELOG/internal only.
3. For each user-visible `feat:`/`fix:`, rewrite as a benefit statement: what changed *for the user*, not what code changed.
4. Draft App Store notes, count characters, trim to fit 4000 (aim for well under — shorter reads better, and localized translations often expand 15-30%).
5. Flag anything needing localization review before submission if the app ships in multiple locales — a string that fits in English may overflow after translation.
6. Update CHANGELOG.md with the full technical entry under the new version heading; tag the release only after CHANGELOG is committed.

## Example

Raw commits:
```
fix: resolve crash when opening scan detail with corrupted image data
feat: add batch export to PDF for scan collections
perf: reduce cold start time by lazy-loading Core ML model
chore: bump swift-format to 0.53
feat(sync): add conflict resolution UI for CloudKit merge conflicts
```

CHANGELOG.md entry:
```md
## [2.4.0] - 2026-07-05
### Added
- Batch export to PDF for scan collections.
- Conflict resolution UI for CloudKit sync merges.
### Fixed
- Crash when opening scan detail with corrupted image data.
### Performance
- Lazy-load Core ML model to reduce cold start time.
```

App Store "What's New":
```
- Export multiple scans to a single PDF at once
- Faster app launch
- Fixed a crash that could occur when opening certain scans
- Sync conflicts are now easier to resolve, with a clear side-by-side view
```
(The `swift-format` bump is omitted entirely — not user-visible.)

## Common mistakes

- **Engineering jargon in user-facing notes** — "refactored CloudKit merge policy" means nothing to a user; say "sync conflicts are easier to resolve."
- **Exceeding the 4000-char App Store limit** — always count before submitting; App Store Connect rejects the save silently truncates in some clients.
- **Forgetting localization** — if the app has localized App Store listings, every locale's release notes must be updated, not just the base one; budget extra chars for expansion.
- **Not distinguishing user-facing vs internal changes** — `chore:`, `test:`, `ci:`, internal refactors belong in CHANGELOG.md/internal notes only, never in App Store copy.
- **Copy-pasting commit messages verbatim** — even good commit messages describe the *implementation*, not the *benefit*; always rewrite for the target audience.
- **Skipping the CHANGELOG update on hotfixes** — every shipped version needs an entry, even patch releases with a single fix.
