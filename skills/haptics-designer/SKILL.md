---
name: haptics-designer
description: Haptic feedback orchestratie - wanneer, intensiteit, patterns. Cruciaal voor premium gevoel.
---

# Haptics Designer

## Wanneer haptics
- Significante acties (save, delete, submit)
- State changes die oog kan missen (toggle, selectie)
- Validation feedback (error, success)
- Milestones (streak, achievement, level up)
- Confirmations van destructieve acties
- Pull-to-refresh trigger
- Drag start/end

## NOOIT haptics voor
- Scrolling (iOS doet dit zelf)
- Elke keystroke
- Passive state updates (data ontvangen)
- Decoratief gebruik

## UIImpactFeedbackGenerator styles
- `.light`: subtiele confirmatie (toggle aan/uit)
- `.medium`: standaard button tap bij belangrijk
- `.heavy`: significante impact (delete bevestigd)
- `.soft`: organisch (nieuwe kaart verschijnt, drop)
- `.rigid`: mechanisch (step counter, tick)

## UINotificationFeedbackGenerator
- `.success`: taak voltooid, save gelukt
- `.warning`: iets om te checken, near-limit
- `.error`: iets ging fout, validation fail

## UISelectionFeedbackGenerator
Voor picker/segment selectie changes.

## Pattern — belangrijk
```swift
// 1. Prepare VOOR je de trigger verwacht
let generator = UIImpactFeedbackGenerator(style: .medium)
generator.prepare()

// 2. Impact op EXACT moment van visuele feedback
generator.impactOccurred()

// 3. Nil-en na gebruik (of release via ARC automatisch)
```

## Code pattern voor SwiftUI
```swift
import UIKit

struct HapticButton: View {
  let action: () -> Void
  let title: String

  var body: some View {
    Button(title) {
      let generator = UIImpactFeedbackGenerator(style: .medium)
      generator.impactOccurred()
      action()
    }
  }
}
```

## Code pattern voor @Observable / TCA
Haptics als side effect, niet in view logic:
```swift
// In reducer/action handler
case .didTapDelete:
  UINotificationFeedbackGenerator().notificationOccurred(.warning)
  state.isDeleted = true
  return .none
```

## Intensiteit hierarchie binnen één flow
Bouw op, niet random:
- Browse: .selection (zacht)
- Tap card: .light impact
- Confirm action: .medium impact
- Delete/destructive: .warning of .heavy
- Completion: .success

## Dubbele haptics
Voor emphasis (level up, streak):
```swift
UIImpactFeedbackGenerator(style: .medium).impactOccurred()
DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
  UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
}
```

## Core Haptics voor custom patterns
Voor game-achtige of echt unieke feedback:
- `CHHapticEngine`
- Custom pattern files (.ahap)
- Alleen overwegen als `UIImpactFeedbackGenerator` niet volstaat

## Output bij review
- Component met action trigger
- Huidige haptic (of ontbreken)
- Voorstel met specifieke style + reden
