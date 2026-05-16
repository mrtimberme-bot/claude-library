---
name: ios-baseline
description: Conventies en architectuur-regels voor native iOS apps in Swift 6 + SwiftUI + SwiftData. Activeert bij elke iOS development taak — feature bouwen, refactor, bug fix, test schrijven. Bevat ook de Apple Intelligence + Vision routing aanpak en App Store compliance basics. Gebruik voor DiscoverScan en alle volgende iOS apps.
---

# iOS Baseline

Basisconventies voor native iOS development. Project-specifieke skills (zoals `discoverscan`) bouwen hierop voort en mogen deze regels overrulen waar nodig — maar dat moet expliciet in de project-skill staan.

## Stack defaults

- **Swift 6** met strict concurrency
- **SwiftUI** als UI framework (geen UIKit tenzij echt nodig voor specifieke iOS API)
- **SwiftData** voor lokale persistence (geen Core Data, geen Realm)
- **FoundationModels** voor on-device AI op iOS 26+ (met Vision-fallback voor oudere devices)
- **Async/await** overal — geen completion handlers, geen Combine voor nieuwe code
- **os.Logger** voor logging (geen `print()`)
- **Keychain** voor secrets (geen UserDefaults, geen plist, geen code)

## Code conventies

**Swift**:
- Markeer types `Sendable` waar nodig. Bij `@unchecked Sendable`: comment uitleggen waarom
- `@MainActor` voor UI state, `actor` voor mutable shared state
- Geen force unwraps (`!`) in production code, behalve voor IBOutlets en `@Environment` waarvan compile-time zeker is
- `Result<Success, Error>` alleen waar het beter past dan `throws` (zelden)
- Naming: `lowerCamelCase` voor alles behalve type-namen, geen Hungarian notation, geen onderscore prefixes
- Files één type per bestand (uitzondering: kleine private helpers van dat type)

**SwiftUI**:
- ViewModels zijn `@Observable` classes (Swift 6, niet `ObservableObject`)
- Views blijven dom: state lift naar ViewModel of parent
- Reusable components in `DesignSystem/Components/`
- Spacing/colors/fonts altijd via `Theme.*` of equivalente design tokens — nooit hardcoded
- Previews voor elke view met realistische test data

**SwiftData**:
- Models in `Features/<feature>/Models/` met `@Model` macro
- ModelContainer wordt geïnitialiseerd in App-root
- Schema migrations expliciet gedefinieerd, niet impliciet
- Geen sync naar SwiftUI via `@Query` in zware lijsten — gebruik fetch met paging

## Architectuur-regels

- **Feature folders** zijn zelfstandig: views, viewmodels en feature-specifieke models leven samen in `Features/<naam>/`
- **Services-laag** (`Services/`) bevat alleen cross-feature logica: API clients, Keychain, Analytics
- **Features importeren elkaar NIET direct**. Cross-feature communicatie via Services of via shared models in `Shared/`
- **API calls** ALLEEN via een dedicated service class — nooit directe `URLSession` in feature code
- **Secrets** ALLEEN via `KeychainService` — nooit in UserDefaults, plist, of code

## Apple Intelligence routing pattern

Voor elke ML/AI feature:

```swift
if #available(iOS 26.0, *), AppleIntelligenceCapability.isAvailable {
    return try await processWithFoundationModels(input)
} else {
    return try await processWithFallback(input)
}
```

Beide routes leveren hetzelfde return type — UI weet niet welke gebruikt is.

## App Store compliance — checklist per feature

Bij elke nieuwe feature die data raakt:

- [ ] `PrivacyInfo.xcprivacy` bijgewerkt voor nieuwe API usage
- [ ] `Info.plist` usage descriptions zijn duidelijk en mensentaal
- [ ] Geen private API's (geen underscore-prefixed Apple methods)
- [ ] Geen `UIWebView` (deprecated, blokkeert review)
- [ ] HTTPS voor alle network calls
- [ ] Loading states voor alle async operaties (geen frozen screens)
- [ ] Foutmeldingen zijn user-facing en bruikbaar (geen raw error strings)
- [ ] VoiceOver labels en Dynamic Type werken

Bij twijfel: notify gebruiker via `/notify` voordat je doorgaat.

## Wat je NIET zelfstandig doet

Vraag eerst toestemming voor:
- `git push`
- Nieuwe dependencies toevoegen (`Package.swift`, CocoaPods, Carthage)
- Wijzigingen aan `Info.plist` voor capabilities/entitlements
- Wijzigingen aan signing/provisioning
- Nieuwe MCP servers configureren
- Wijzigingen aan `~/.zshrc` of andere shell config
- `.pbxproj` handmatig editen — gebruik XcodeBuildMCP of vraag om Xcode UI actie

## Eerste stap in elke sessie

1. `git status` + `git branch --show-current`
2. Lees project `CLAUDE.md` (als die bestaat) voor project-specifieke updates
3. Lees `docs/tasks/` voor huidige scope (als die conventie gebruikt wordt)
4. Bevestig kort wat je oppakt en wat je eerste actie is
