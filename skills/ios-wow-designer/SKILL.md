---
name: ios-wow-designer
description: Use when designing or building a new iOS screen, feature UI, or component that needs to feel premium, polished, and memorable. Triggers on: "wow factor", "premium feel", "native iOS design", "looks cheap", "needs polish", "make it beautiful", or any new SwiftUI screen from scratch.
tags: [ios, swiftui, ux, design, motion, haptics, liquid-glass, ui]
---

# iOS Wow Designer

Orchestreert vijf gespecialiseerde design skills tot één samenhangende workflow voor een premium iOS screen.

**Kernprincipe:** Wow ontstaat uit het samenspel van visuele richting, native material, consistente spacing, beweging en tactiel gevoel — niet uit één losse stijlkeuze.

---

## Wanneer te gebruiken

- Nieuw SwiftUI screen of feature UI vanaf nul
- Bestaand scherm dat "goedkoop" of "generiek" aanvoelt
- Pre-launch UI polish voor een App Store submission
- Onboarding flows, hero screens, of feature highlights

## Wanneer NIET te gebruiken

- Alleen backend logica
- Snelle bugfix zonder UI-impact
- Pure refactor zonder visuele wijziging

---

## De 5-Laags Workflow

Doorloop alle vijf lagen in volgorde. Sla geen laag over — elke laag bouwt op de vorige.

### Laag 1 — Visuele Richting
**Skill: `ui-design-craft`**

Beantwoord vóór enige code deze vier vragen:
1. **Platform** — SwiftUI (iOS/iPadOS)?
2. **Doel** — Welk probleem lost dit screen op? Wie gebruikt het?
3. **Toon** — Kies één: `calm/serene` · `playful/energetic` · `premium/refined` · `utilitarian` · `editorial`
4. **Differentiator** — Wat onthoudt de gebruiker als hij wegklikt?

Kies één aesthetisch anker uit de tabel en voer het volledig uit:

| Anker | Sfeer |
|---|---|
| **Aurora Maximalist** | Dark bg + mesh gradients, oversized display type, spring-physics motion |
| **Swiss** | White surface, één accent, sans-serif, strict grid |
| **Premium Refined** | Diep zwart of off-white, kleine subtiele accenten, veel witruimte |
| **Playful** | Zachte kleuren, ronde vormen, bouncy animaties |
| **Editorial** | Grote typografie als designelement, weinig kleur |

### Laag 2 — iOS 26 Native Material
**Skill: `swiftui-liquid-glass`**

Pas Liquid Glass toe op de juiste surfaces:
- Gebruik `GlassEffectContainer` als meerdere glass elements naast elkaar staan
- Voeg `.glassEffect(...)` toe ná layout/appearance modifiers
- Gebruik `.interactive()` alleen op tappable/focusable elements
- Gate alles met `#available(iOS 26, *)` + niet-glass fallback

### Laag 3 — Spacing & Typografie Consistentie
**Skill: `swiftui-design-principles`**

Toets het screen op:
- Spacing puur uit de 4/8-grid: `4, 8, 12, 16, 20, 24, 32, 40, 48`
- Maximaal 3 font sizes per scherm
- Geen arbitraire waarden (`.padding(26)` → rode vlag)
- System kleuren waar mogelijk, custom kleuren consistent via tokens

### Laag 4 — Beweging
**Skill: `motion-designer`**

Voeg spring-physics toe aan alle state changes:
```swift
// Standaard iOS transition
.spring(response: 0.35, dampingFraction: 0.8)

// Playful entry (onboarding, achievements)
.spring(response: 0.5, dampingFraction: 0.65)
```
- Alle animaties zijn interruptible
- Timings: micro-interactions 100-200ms, UI transitions 250-350ms
- Nooit >600ms zonder sterke reden

### Laag 5 — Tactiel Gevoel
**Skill: `haptics-designer`**

Koppel haptic feedback aan key moments:
- Significante actie (save, delete, submit) → `.medium` of `.heavy` impact
- State change die oog kan missen → `.light` impact
- Taak voltooid → `.success` notification
- Fout → `.error` notification
- Kies: `.soft` voor organische events, `.rigid` voor mechanische

---

## Snelle Checklist

```
□ Aesthetisch anker gekozen en volledig doorgevoerd
□ Liquid Glass op juiste surfaces met fallback
□ Geen arbitraire spacing — puur 4/8-grid
□ Spring physics op alle state changes
□ Haptics gekoppeld aan significante acties
□ Dark mode getest
□ Accessibility: dynamicType + contrast ratio ok
```

---

## Valkuilen

| Valkuil | Fix |
|---|---|
| Meerdere stijlen mixen | Kies één anker en wijk er niet van af |
| Liquid Glass overal plakken | Alleen op surfaces die content omhullen |
| Animaties niet interruptible | Altijd `withAnimation` + `.animation(.spring, value:)` |
| Haptics decoratief gebruiken | Alleen bij significante acties, nooit bij scroll/keystroke |
| Willekeurige spacing | Altijd terug naar de 4/8-grid |

---

## Aanvullende skills

Na de 5-laags workflow:
- **`/hig-compliance`** — Apple-proof maken voor App Store
- **`/accessibility-auditor`** — Wow mag niet ten koste gaan van toegankelijkheid
- **`/dark-mode-design`** — Liquid Glass + dark mode consistent
- **`/color-system`** — Als kleurpalette dieper uitgewerkt moet worden
