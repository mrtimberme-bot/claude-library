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

## HARD-GATE: Altijd consultatiefase eerst

<HARD-GATE>
Sla NOOIT de consultatiefase over. Schrijf GEEN code, maak GEEN wijzigingen, en start NIET met de 5-laags workflow totdat de gebruiker expliciet akkoord heeft gegeven op een van de voorgestelde design opties.
</HARD-GATE>

## Fase 0 — Consultatie (verplicht, altijd eerst)

Voordat je ook maar één regel code schrijft, doorloop je deze stappen in volgorde.

### Stap 1: Screen context begrijpen

Lees de relevante SwiftUI view file(s). Identificeer:
- Welke content / data wordt getoond?
- Wat zijn de interactiepunten (buttons, taps, navigation)?
- Welke DesignTokens worden al gebruikt?
- Wat voelt generiek of "goedkoop"?

### Stap 2: Stel 3 gerichte vragen (één per keer)

Vraag nooit meer dan één vraag per bericht. Typische vragen:

1. **Toon** — "Welke sfeer past bij dit scherm: rustig & vertrouwend, energiek & motiverend, of premium & minimalisch?"
2. **Gebruikersmoment** — "Wanneer ziet de gebruiker dit scherm? (bijv. dagelijks dashboard, eenmalige setup, beloning na actie)"
3. **Differentiator** — "Wat moet de gebruiker onthouden als hij dit scherm wegklikt?"

Pas de vragen aan op wat je al weet vanuit de code.

### Stap 3: Presenteer 2–3 concrete design voorstellen

Presenteer voorstellen als duidelijk genummerde opties, elk met:
- **Naam** (bijv. "Optie A — Aurora Gradient Hero")
- **Aesthetisch anker** uit de tabel hieronder
- **Wat er concreet anders wordt** (max 4 bulletpoints, visueel beschreven)
- **Trade-off** — wat lever je in of win je?

Voorbeeld formaat:
```
**Optie A — Aurora Gradient Hero**
Anker: Aurora Maximalist
• Hero card met radial mesh gradient (brand → transparant) rechtsboven
• Voertuignaam in 32pt bold rounded, wit op donker
• 3 stat pills (kWh / km / connector) in glass-achtige capsules
• Entree-animatie: slide-in van onderaf met spring-bounce
Trade-off: visueel impactvol, vraagt wel een donkere achtergrond
```

**Wacht op akkoord.** Zeg expliciet: *"Welke optie spreekt je aan, of wil je elementen combineren?"*

### Stap 4: Bevestig keuze en start pas dan

Zodra de gebruiker een keuze bevestigt (optie A/B/C, combinatie, of eigen richting), ga je verder naar de 5-laags workflow. Vat de gekozen richting in één zin samen zodat de gebruiker weet wat er gebouwd wordt.

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
