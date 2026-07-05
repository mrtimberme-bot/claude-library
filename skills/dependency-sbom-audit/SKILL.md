---
name: dependency-sbom-audit
description: Use when auditing Swift Package Manager dependencies for supply-chain risk — adding a new SPM package, generating an SBOM, checking for known CVEs, reviewing version pinning strategy, spotting abandoned/unmaintained packages, or doing a pre-release dependency review.
---

# Dependency & SBOM Audit

Treat every SPM dependency as code you didn't write but ship anyway. The goal is a complete, accurate inventory (SBOM) of what's actually in the binary, plus a judgment call on whether each entry is still safe to depend on.

## Core principle

`Package.resolved` is your SBOM's raw material, not the SBOM itself — it lists versions but not licenses, maintenance state, or known vulnerabilities. Audit = **inventory** (what's in) + **provenance** (who maintains it, how actively) + **known-vuln check** (CVE/GHSA databases) + **pinning policy** (exact version vs range). Do all four before adding a package or cutting a release.

## Quick reference

| Question | Command / check |
|---|---|
| What's actually resolved right now? | `swift package show-dependencies --format json` |
| What's the full transitive tree? | same command — read nested `dependencies` arrays, not just top level |
| Is this package still maintained? | Check repo's last commit date, open issue count/age, and whether maintainer responds to security reports — GitHub UI or `gh repo view <org/repo> --json pushedAt,openIssues` |
| Does it have known CVEs? | Cross-reference package name/repo against [GitHub Advisory Database](https://github.com/advisories?ecosystem=swift) and OSV.dev (`osv-scanner --lockfile Package.resolved` if available) |
| Are versions pinned or floating? | `Package.resolved` `version` field vs `Package.swift` `.upToNextMajor`/`.upToNextMinor` rules |
| What license obligations exist? | Repo's `LICENSE` file — flag GPL/AGPL for App Store distribution review |
| Does this need a privacy manifest? | See `privacy-manifest` skill — that's PrivacyInfo.xcprivacy content; this skill is about whether the *dependency itself* is one of Apple's "commonly used third-party SDKs" requiring a signature, see below |

## Apple's third-party SDK signature requirement

Since 2024, Apple maintains a list of "commonly used third-party SDKs" (analytics, ad, and similar SDKs — e.g. certain ad networks, analytics kits) that must ship as an **XCFramework signed by the SDK's maintainer** and include a privacy manifest, or the app is rejected at submission. This is narrower than the general PrivacyInfo.xcprivacy requirement every app/package should consider — it applies specifically to SDKs on Apple's published list. When adding a new SPM dependency, check the current list and confirm the version you're pulling in is signed, not just that it has *a* privacy manifest.

## Example: reading `show-dependencies --format json`

```bash
swift package show-dependencies --format json
```

```json
{
  "identity": "myapp",
  "dependencies": [
    {
      "identity": "swift-collections",
      "url": "https://github.com/apple/swift-collections",
      "version": "1.1.0",
      "dependencies": []
    },
    {
      "identity": "some-analytics-sdk",
      "url": "https://github.com/vendor/some-analytics-sdk",
      "version": "3.2.0",
      "dependencies": [
        { "identity": "some-networking-lib", "version": "0.9.4", "dependencies": [] }
      ]
    }
  ]
}
```

Read it as: two direct dependencies, one transitive (`some-networking-lib`, pulled in *by* the analytics SDK, never chosen directly). Audit all three rows — the transitive one is the one teams forget. A `0.x` version on `some-networking-lib` is a pinning/stability flag on its own even before checking CVEs.

## Common mistakes

- **Pinning nothing** — using `.upToNextMajor` everywhere means a compromised or broken minor release ships automatically on the next `swift package update`. Pin exact versions for anything security-sensitive; widen deliberately, not by default.
- **Trusting star count / popularity instead of maintenance activity** — a package with 10k stars and no commits in two years is a bigger risk than a smaller one with an active maintainer and fast CVE response.
- **Ignoring transitive dependencies** — the CVE rarely lives in the package you chose; it lives three levels down. Always audit the full tree from `show-dependencies`, not just `Package.swift`'s direct entries.
- **Re-auditing only at release time** — do the check when adding a package, not just pre-submit; catching an abandoned/vulnerable dependency before it's woven into the codebase is far cheaper than replacing it later.
- **Conflating "has a privacy manifest" with "is Apple's signature-required SDK list"** — the two are different obligations; check both independently.
