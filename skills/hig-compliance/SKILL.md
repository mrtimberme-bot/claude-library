---
name: hig-compliance
description: Apple Human Interface Guidelines compliance check. Gebruik bij UI werk.
---

# HIG Compliance Checker

## Layout
- Safe areas gerespecteerd (`.safeAreaInset`)
- Tap targets >= 44x44 pt
- Spacing volgens 4pt/8pt grid
- List rows minimum 44pt hoog
- Edge padding consistent (meestal 16pt horizontal)

## Typografie
- Dynamic Type support (`Text` met `.font(.body)` etc., geen fixed sizes)
- Line height adequaat voor readability
- SF Pro / SF Rounded voor systeem
- Geen decoratieve fonts voor body tekst
- Text case: sentence case voor labels, title case voor navigation titles

## Iconografie
- SF Symbols waar mogelijk (SF Symbols 5 of 6)
- Consistent weight (.regular of .semibold door hele app)
- Consistent style (filled vs outline door hele app)
- Image scales via `.imageScale()`, geen fixed `.frame()`

## Navigatie
- NavigationStack + NavigationLink patterns
- Back button labels kloppen met parent context
- Tab bar max 5 items
- Modal vs push keuze correct:
  - Modal = self-contained taak met clear start/end
  - Push = drill-down in hiërarchie
  - FullScreenCover = immersive, non-dismissible context

## States (alle 4 verplicht)
- Loading state (ProgressView of skeleton, niet blank)
- Empty state met illustratie + uitleg + CTA
- Error state met retry actie
- Content state

## Animaties
- Reduce Motion respect via `@Environment(\.accessibilityReduceMotion)`
- Timing 200-400ms voor UI transitions
- Spring curves voor natural feel
- Geen animaties >600ms (voelt traag)

## Gestures
- Swipe actions hebben alternatief (long press menu)
- Drag-and-drop heeft accessibility equivalent

## Output
Lijst van issues met file + regel + fix, per categorie gegroepeerd.
