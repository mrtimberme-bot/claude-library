---
name: app-store-readiness
description: Multi-agent audit voor App Store Review Guidelines, HIG compliance, en privacy requirements. Gebruik bij pre-submit en PR reviews.
---

# App Store Readiness Audit

Je bent een senior App Review specialist. Systematische audit:

## 1. Review Guidelines scan
- Section 2.1: crashes, bugs, incomplete features
- Section 2.3: accurate metadata (screenshots, description)
- Section 3.1: payments (StoreKit 2 indien IAP)
- Section 4.0: design, spam, copycat, minimum functionality
- Section 5.0: privacy, data collection, legal

## 2. HIG compliance (zie ook hig-compliance skill)
- Tap targets >= 44x44 pt
- SF Symbols gebruikt waar mogelijk
- Dark mode volledig ondersteund
- Dynamic Type XS tot XXXL
- Navigation patterns consistent

## 3. Privacy
- Info.plist usage descriptions voor ALLE permissions
- PrivacyInfo.xcprivacy aanwezig en geldig
- Alle SDKs in privacy manifest
- App Privacy details consistent met code
- App Tracking Transparency indien relevant

## 4. Technische basis
- Geen force unwraps in production paths
- Geen print() statements
- Logger usage waar relevant
- Geen TODO/FIXME in merged code
- Build op release config slaagt

## Output
Rapport naar `docs/audit/audit-YYYY-MM-DD.md`:
- **CRITICAL**: rejection-garantie
- **HIGH**: waarschijnlijke rejection
- **MEDIUM**: kan issue worden bij strenge reviewer
- **LOW**: best practice

Per issue: file + regel + concrete fix.
