---
name: parallel-code-review
description: Grondige parallelle code review via drie gespecialiseerde subagenten (Swift/architectuur, Accessibility/HIG, Localization) op volledige bestanden — niet op diffs. Gebruik dit in plaats van incrementele diff-reviews om alle issues in één ronde te vangen.
---

# Parallel Code Review

## Kernprincipe

Een diff-review ziet alleen wat er *veranderd* is, niet de omliggende code. Elke ronde fixes introduceert nieuwe context die de vorige reviewer niet zag — dit leidt tot meerdere review-ronden.

**Dit skill reviewt volledige feature-bestanden parallel via drie specialisten.**

## Wanneer te gebruiken

- Na het afronden van een feature-blok (vóór PR naar main)
- Als incrementele reviews steeds nieuwe issues blootleggen
- Bij features met UI + concurrency + strings (de drie domeinen overlappen niet)
- Als je wilt dat een feature echt shippable is, niet alleen "builds green"

## Aanpak

### Stap 1 — Verzamel de volledige bestanden

Lees alle bestanden die tot de feature behoren — niet de diff, de volledige huidige inhoud:

```bash
# Identificeer de feature-bestanden
git diff main...HEAD --name-only | grep -E '\.swift$'

# Lees elk bestand volledig
cat Feature/FeatureView.swift
cat Feature/FeatureService.swift
# etc.
```

### Stap 2 — Spawn drie parallelle subagenten

Start ze in **één message** zodat ze echt parallel draaien:

#### Agent 1 — Swift / Architectuur
Focus:
- Correctheid: logic bugs, edge cases, race conditions
- Swift 6 concurrency: data races, `nonisolated(unsafe)` rechtvaardiging, actor isolation
- Memory: retain cycles, `[weak self]`, service-instantiatie als `let` vs `@State`
- API correctness: Apple frameworks correct gebruikt?
- Silent failures: `try?` zonder logging, errors geslikt
- Thread-safety: `@MainActor` annotations op methods die dat vereisen
- Performance: SwiftData-fetches in view body, zware berekeningen op main thread

#### Agent 2 — Accessibility / HIG
Focus:
- VoiceOver: alle interactieve elementen gelabeld? Decoratieve images `.accessibilityHidden(true)`?
- Minimale tap target (44×44pt per HIG)
- Dynamic Type: tekst schaalt? `fixedSize` correct gebruikt?
- Reduce Motion: gerespecteerd?
- Kleurcontrast: WCAG AA 4.5:1 voor normale tekst, 3:1 voor grote tekst
- Kleur niet als enige indicator (icon of label ook aanwezig?)
- `.accessibilityLabel` vs `.accessibilityHint`: juiste semantiek?
- HIG toolbar density: max 3-4 items, geen overlapping op kleine schermen
- Confirmation dialogs voor destructieve acties

#### Agent 3 — Localization
Focus:
- Hardcoded user-visible strings (niet via `String(localized:)`)
- Keys die in code worden gebruikt maar niet in xcstrings bestaan
- Plural correctness: `String(format: String(localized:), n)` omzeilt plural rules — gebruik `String.localizedStringWithFormat` of xcstrings interpolation
- Key-hergebruik in verkeerde context (generieke key met foute EN-vertaling)
- xcstrings format: `variations.plural` structuur correct?
- NL-als-key strings: hebben ze een expliciete EN-entry?

### Stap 3 — Synthetiseer vóór je fixt

Wacht tot alle drie klaar zijn. Consolideer dan:

1. **Critical** (blokkeren ship): crash paths, broken features, WCAG-failures, runtime errors
2. **Important** (fix vóór volgende release): architectuurproblemen, grammaticafouten, accessibility-issues
3. **Minor** (nice to have): performance, robustness, polish

Pas na consolidatie begin je met fixen — in één branch, één PR.

### Stap 4 — Fix alles in één pass

```bash
git checkout -b fix/feature-review-findings
# Implementeer alle critical + important fixes
# Build verifiëren
# Commit met referentie naar review-bevindingen
```

### Stap 5 — Verificatie build

```bash
# Via XcodeBuildMCP:
mcp__XcodeBuildMCP__build_sim()
```

Build moet groen zijn zonder nieuwe warnings.

## Prompttemplate per agent

### Swift/Architectuur agent

```
You are a Senior Swift/iOS engineer. Do a deep, thorough code review of the 
complete feature files below. This is NOT a diff review — review the full code 
as if you're the second set of eyes before this ships to the App Store. 
The app targets iOS [VERSION], uses Swift 6 [Minimal/Complete] concurrency, 
SwiftUI + @Observable, SwiftData.

## Files to review
[volledige bestandsinhoud plakken]

## What to check
- Correctness: logic bugs, edge cases, race conditions
- Swift 6 concurrency: data races, unsafe patterns
- Memory management: retain cycles, service lifetime
- Performance: main thread work, view body queries
- API correctness: Apple APIs used correctly?
- Silent failures: try? without logging
- Thread safety: @MainActor annotations where needed

## Output format
### Strengths
### Issues (Critical / Important / Minor)
### Assessment: Ready? [Yes/No/With fixes]
```

### Accessibility/HIG agent

```
You are an iOS Accessibility and HIG expert. Review the complete feature files 
below against Apple's Human Interface Guidelines and WCAG 2.1 AA requirements. 
The app targets iOS [VERSION].

## Files to review
[volledige bestandsinhoud plakken]

## What to check
- VoiceOver labels on all interactive elements
- Decorative images marked accessibilityHidden
- Minimum 44×44pt tap targets
- Dynamic Type support, fixedSize usage
- Reduce Motion respected
- Color contrast (WCAG AA: 4.5:1 normal, 3:1 large text)
- Color not sole indicator
- accessibilityLabel vs accessibilityHint semantics
- HIG toolbar density
- Confirmation dialogs for destructive actions

## Output format
### Strengths
### Issues (Critical / Important / Minor)
### Assessment: Ready? [Yes/No/With fixes]
```

### Localization agent

```
You are a localization expert for iOS apps. The app supports [TALEN].
Review the code and xcstrings entries below for completeness, correctness, 
and quality.

## Code strings used
[lijst van alle String(localized:) calls]

## xcstrings entries for new keys
[relevante xcstrings JSON]

## What to check
1. Missing translations: keys in code but not in xcstrings?
2. Inline non-localized strings: hardcoded user-visible text?
3. Plural correctness: String(format: String(localized:), n) bypasses plural rules
4. Key reuse: generic key with wrong context?
5. xcstrings format: correct structure?
6. NL-as-key strings: EN entries present?
7. Translation quality

## Output format
### Issues (Critical / Important / Minor)
### Assessment
```

## Veelgemaakte fouten

| Fout | Fix |
|------|-----|
| `String(format: String(localized: "key.with.plurals"), n)` | Gebruik `String.localizedStringWithFormat(String(localized:), n)` of xcstrings interpolation |
| Service als `let` op View struct | Gebruik `@State private var service = MyService()` |
| `try?` op mutating SwiftData ops | `do/catch` met `Logger.error()` |
| `onChange(of:) { action }` (0-param) | `onChange(of:) { _, _ in action }` (iOS 17+ API) |
| `dismiss()` vergeten na destructieve delete | `@Environment(\.dismiss) private var dismiss` + call na delete |
| `onAppear` in `ToolbarItem` voor data laden | `onAppear` op de View zelf, niet op toolbar items |

## Output na consolidatie

```
## Review Bevindingen — [Feature naam]

### Critical (fix nu)
1. [issue] — [file:line] — [fix]

### Important (fix voor ship)
1. [issue] — [file:line] — [fix]

### Minor (next release)
1. [issue] — [file:line] — [optionele fix]

### Klaar om te fixen? [Ja/Nee]
```
