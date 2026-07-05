---
name: xcode-cloud
description: Use when configuring Xcode Cloud workflows, writing ci_scripts (ci_post_clone.sh, ci_pre_xcodebuild.sh, ci_post_xcodebuild.sh), setting environment variables or start conditions (branch/tag/PR), or deciding between Xcode Cloud and GitHub Actions for Apple CI/CD.
---

# Xcode Cloud

Apple-native CI/CD, configured in Xcode/App Store Connect rather than YAML. Workflows are declarative (start condition + actions + post-actions); custom behavior lives in three optional shell hooks under `ci_scripts/` at the repo root (not inside the `.xcodeproj`/`.xcworkspace`). Each hook runs in a fresh macOS VM with no network assumptions beyond what Apple provisions — install everything you need explicitly.

## Core principle

Match the hook to the build phase it needs to affect: dependencies and secrets setup happens *before* Xcode ever resolves the project (`ci_post_clone.sh`); anything that must exist before compilation (generated code, injected build settings, provisioning tweaks) goes in `ci_pre_xcodebuild.sh`; anything that consumes build output (notifying, uploading dSYMs elsewhere, notarization side-tasks) goes in `ci_post_xcodebuild.sh`. Getting the hook wrong is the single most common Xcode Cloud failure mode.

## Quick reference

| Need | Where |
|---|---|
| Install SPM mirrors, CocoaPods, Mint, Homebrew tools | `ci_scripts/ci_post_clone.sh` |
| Inject API keys / secrets into the environment | Xcode Cloud → Environment Variables (per workflow), marked "Secret" |
| Generate code (e.g. `xcodegen`, `sourcery`) before compile | `ci_scripts/ci_pre_xcodebuild.sh` |
| Bump build number / write `Info.plist` values | `ci_pre_xcodebuild.sh` |
| Upload symbols/artifacts elsewhere, send Slack/webhook | `ci_post_xcodebuild.sh` |
| Run on PR open/update against `main` | Workflow → Start Condition → Pull Request → target branch `main` |
| Run on version tag push | Start Condition → Tag → pattern e.g. `v*` |
| Auto TestFlight distribution | Workflow → Post-Actions → TestFlight (internal/external group) |
| Automatic signing | App Store Connect → Xcode Cloud manages certs/profiles itself — do not also run `fastlane match` in the same workflow |

## Example: dependency install + start condition

`ci_scripts/ci_post_clone.sh`:

```bash
#!/bin/sh
set -e

# Xcode Cloud provides CI_WORKSPACE, CI_XCODEBUILD_ACTION, CI_BRANCH, etc.
brew install swiftlint xcodegen

# Regenerate project if using XcodeGen (must happen before Xcode resolves it)
cd "$CI_WORKSPACE"
xcodegen generate
```

Workflow start condition (configured in the Xcode Cloud UI, not in a file): trigger = "Pull Request", target branch = `main`, plus a second workflow with trigger = "Tag", pattern = `release/*`, whose post-action distributes to the "External Testers" TestFlight group and auto-submits release notes from the tag message.

## Xcode Cloud vs GitHub Actions

Reach for Xcode Cloud when the team wants zero YAML, tight App Store Connect integration (TestFlight/review submission as first-class post-actions), and Apple-managed signing. Reach for GitHub Actions (see the `ios-cicd` skill) when you need a Tuist/Fastlane-driven pipeline, matrixed snapshot testing across locales/devices, third-party integrations (Slack, custom dashboards), or full control over signing via `fastlane match`. The two are mutually exclusive for signing: don't run both automatic Xcode Cloud signing and `match` against the same certificates/profiles — they will fight over provisioning.

## Common mistakes

- **Wrong hook for the job**: putting dependency installs in `ci_pre_xcodebuild.sh` (too late — Xcode has already started resolving packages) instead of `ci_post_clone.sh`.
- **Secrets in the wrong scope**: setting an environment variable at the workflow level when it's needed at `ci_post_clone.sh` time for *all* workflows — scope secrets at the right level (workflow vs. all workflows) or the script fails with unbound variables.
- **Workflow not triggering**: start condition branch/tag pattern doesn't match actual naming (e.g. pattern `v*` but tags pushed as `release-1.0`), or the workflow is scoped to the wrong Xcode project/scheme.
- **Signing conflicts**: enabling Xcode Cloud's automatic signing on a project that also has a Fastlane `match` setup — both try to manage the same certificates, causing provisioning profile churn or CI failures. Pick one signing strategy per project.
