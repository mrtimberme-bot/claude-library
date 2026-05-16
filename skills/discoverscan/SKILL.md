---
name: discoverscan
description: DiscoverScan-specifieke context — een iOS app voor foto-identificatie via Apple Intelligence + Claude API verrijking. Bouwt voort op de user-level ios-baseline en ios-blok-workflow skills. Activeert bij elke taak in deze codebase, of bij vermelding van blok 1-10, ScanFirst migratie, of de DiscoverScan PRD.
---

# DiscoverScan

DiscoverScan-specifieke context. Voor algemene iOS conventies en blok-workflow: zie de `ios-baseline` en `ios-blok-workflow` skills.

## Wat is DiscoverScan

iOS-app waarbij de gebruiker iets fotografeert, Apple Vision/Intelligence het identificeert, en Claude API verrijkende context geeft (uitleg, follow-up vragen, opslag in collection). Voortbouwend op ScanFirst (vorige iteratie), nu in actieve ontwikkeling richting v0.1 in App Store.

## Project structuur

```
DiscoverScan/
├── DesignSystem/        # Theme.swift, components, Fraunces font
├── Features/
│   ├── Identify/        # IdentifyService, IdentifyResult, IdentifyDisplayData
│   ├── Scan/            # Camera flow
│   ├── History/         # Collection + grid/list view
│   └── Settings/        # Keychain API key UI
├── Services/            # ClaudeClient, KeychainService
├── Resources/Fonts/     # Fraunces-Regular/SemiBold/Bold (static, NIET variable)
└── docs/
    ├── PRD.md
    ├── architecture/
    └── tasks/
```

## Design system specifieks

- Stijl: "Refined editorial warmth"
- Hoofdfont: **Fraunces** — gebruik static weights (Regular/SemiBold/Bold), NIET de variable font
- Theme tokens in `DesignSystem/Theme.swift`
- Components in `DesignSystem/Components/`

## Migratie blokken (status in docs/tasks/)

- **Blok 1**: Apple Vision identificatie (overgenomen van ScanFirst)
- **Blok 2**: Design system (Fraunces, Theme, components)
- **Blok 3**: Camera + scan flow
- **Blok 4**: Collection / history
- **Blok 5+**: zie `docs/PRD.md` en `docs/tasks/`

ScanFirst leeft als read-only referentie in `~/Development/ScanFirst/`.

## App-specifieke regels (overrulen baseline waar nodig)

- **Claude API key**: ALLEEN via `Services/KeychainService`
- **Identify routing**: zie `IdentifyService` — bepaalt zelf Apple Intelligence vs Vision
- **Network domains**: alleen `api.anthropic.com` voor Claude API. Geen analytics in v0.1.

## Useful files

- `docs/PRD.md`
- `docs/architecture/ios26-tier-system.md`
- `docs/architecture/data-model.md`
- `~/Development/claude-ios-toolkit/`
- `~/Development/ScanFirst/` (read-only)
