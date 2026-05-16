---
name: accessibility-auditor
description: iOS accessibility audit - VoiceOver, Dynamic Type, contrast, motor accessibility. Run bij elke UI feature.
---

# Accessibility Auditor

## VoiceOver
- Elke interactieve control heeft `.accessibilityLabel`
- Complex gedrag: `.accessibilityHint`
- Decoratieve images: `.accessibilityHidden(true)`
- Groepering: `.accessibilityElement(children: .combine)` waar zinvol
- Reading order: `.accessibilitySortPriority()` indien niet default
- Custom actions: `.accessibilityAction()` voor niet-visibele opties

## Dynamic Type
Test op:
- XS (kleinste)
- Large (default)
- AX5 / XXXL (grootste accessibility size)

Regels:
- Geen fixed `.frame(height:)` op tekst containers
- `.lineLimit(nil)` of `ViewThatFits` voor lange tekst
- Icons schalen: `Image(systemName:).imageScale(.large)`
- Layout breekt niet op grote formaten
- Overweeg `@ScaledMetric` voor padding/spacing die schaalt

## Contrast
- Tekst op achtergrond: WCAG AA (4.5:1 body, 3:1 large text)
- Gebruik systeem kleuren (`Color.primary`, `.secondary`) — auto dark mode
- Geen witte tekst op felle achtergrond zonder schaduw

## Motor accessibility
- Geen drag-only interacties zonder alternatief
- Swipe actions altijd met button equivalent
- Geen tijd-gebaseerde UI zonder pause/extend
- Respecteer "Touch Accommodations"

## Reduce Motion
```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion
.animation(reduceMotion ? nil : .spring(), value: state)
```

## Reduce Transparency
```swift
@Environment(\.accessibilityReduceTransparency) var reduceTransparency
```
Vervang `.ultraThinMaterial` door solid color wanneer aan.

## Differentiate Without Color
Gebruik niet alleen kleur om state te tonen. Voeg icon of shape toe.

## Output
- Component naam
- Ontbrekende accessibility element
- Voorgestelde fix met code voorbeeld
- Severity: CRITICAL (WCAG fail), HIGH (bad UX), MEDIUM (improvement)
