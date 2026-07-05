---
name: ios-micro-change
description: Use when the user wants to nudge, reposition, resize, or tweak a single UI element in a SwiftUI view (e.g. "5pt lager", "meer padding boven", "knop iets naar links", "card hoger op het scherm") without doing a full redesign. Triggers on phrases like "iets hoger", "iets lager", "verplaats", "kleine aanpassing", "micro change", "nudge".
---

# iOS Micro Change

## Overview

Snelle, gerichte aanpassing aan **één UI-element** in een SwiftUI view via simulator + screenshot + Edit. Geen design review, geen herontwerp — alleen de SwiftUI modifier tweaken die het element op zijn plek zet.

**Kernprincipe:** screenshot eerst zodat de gebruiker kan aanwijzen, dan minimale Edit op de modifier.

## When to Use

✅ **Wel gebruiken bij:**
- "Deze knop mag 8pt lager"
- "De card staat te dicht tegen de bovenrand"
- "Maak de spacing tussen X en Y iets groter"
- "Element naar links / rechts / boven / onder"
- "Iets meer ademruimte hier"

❌ **Niet gebruiken bij:**
- Volledig herontwerp van view → `swiftui-design-principles` of `ui-design-craft`
- Animatie/transitie tweaks → `motion-designer`
- Kleur/typografie wijzigingen → `color-system` / `typography-expert`
- Onbekend welke view → eerst vragen welk scherm

## Workflow

### Stap 1 — Simulator + app starten

Eerst controleren of de simulator al draait. Gebruik `mcp__XcodeBuildMCP__session_show_defaults` om project/scheme/sim te bevestigen, dan `mcp__XcodeBuildMCP__build_run_sim` (vaak met lege args).

### Stap 2 — Gebruiker laat zien welk scherm

Vraag de gebruiker om in de app naar het scherm te navigeren waar de wijziging moet gebeuren. **Wacht op bevestiging** ("ik ben er") voordat je verder gaat.

### Stap 3 — Screenshot + UI hiërarchie

Maak beide:
- `mcp__XcodeBuildMCP__screenshot` → visuele referentie voor de gebruiker
- `mcp__XcodeBuildMCP__snapshot_ui` → view-hiërarchie met coördinaten en accessibility identifiers

De screenshot wordt automatisch getoond. Uit de UI snapshot extraheer je de top-level views/elementen.

### Stap 4 — Lijst aanpasbare elementen tonen

Toon een korte genummerde lijst van elementen op het scherm, met hun identifier of beschrijving:

```
Aanpasbare elementen op dit scherm:
1. Header titel ("Charging Arrival")
2. SoC card (groot, midden boven)
3. Comparison row (links/rechts)
4. Action button ("Start charging", onderaan)
```

Vraag: **welk element wil je aanpassen, en welke kant op (hoger/lager/links/rechts) en hoeveel pt?**

### Stap 5 — Vind de view in code

Op basis van het gekozen element:
- Gebruik `Grep` op de accessibility label of zichtbare tekst uit de screenshot
- Lokaliseer het exacte SwiftUI bestand + regel
- Lees de omliggende context om te zien welke modifier al aanwezig is

### Stap 6 — Pas de juiste modifier toe

Kies de **minst invasieve** modifier:

| Wens | Modifier |
|---|---|
| Element hoger/lager binnen layout | Pas bestaande `.padding(.top, X)` aan, of voeg toe |
| Element links/rechts | `.padding(.leading/.trailing, X)` |
| Vrij positioneren zonder layout te breken | `.offset(x:, y:)` |
| Ruimte tussen elementen in VStack/HStack | `Spacer()` / `.spacing` op de stack |
| Element groter/kleiner | `.frame(width:, height:)` |
| Hele view omhoog/omlaag | `.padding(.top)` op de container of `Spacer()` herordenen |

**Voorkeur:** `.padding` > `Spacer/spacing` > `.offset` (offset breekt layout het minst voorspelbaar — alleen gebruiken als padding niet kan).

### Stap 7 — Edit + verifieer

1. Eén `Edit` call op de juiste regel
2. `mcp__XcodeBuildMCP__build_run_sim` opnieuw
3. Nieuwe `screenshot` ter vergelijking
4. Vraag de gebruiker: **"Goed zo, of nog een tikje?"**

## Quick Reference

```swift
// Hoger plaatsen (meer ruimte boven element)
.padding(.top, 16)

// Lager plaatsen (binnen container)
.padding(.top, 32)   // verhoog bestaande waarde

// Naar links
.padding(.leading, -8)  // negatief = naar links
// of beter:
.offset(x: -8)

// Spacing in VStack vergroten
VStack(spacing: 16) { ... }   // was 8

// Element fysiek verplaatsen zonder layout-impact
.offset(y: -12)   // 12pt omhoog
```

## Common Mistakes

| Fout | Fix |
|---|---|
| Direct `.offset` gebruiken | Probeer eerst `.padding` — offset breekt geen layout maar overlapt wel |
| Hele view aanpassen i.p.v. één modifier | Lokaliseer het exacte element via UI snapshot identifier |
| Geen screenshot vooraf | Zonder visueel anker raakt de iteratie troebel |
| Doorgaan zonder gebruiker te vragen welk element | Altijd lijst tonen + keuze laten maken |
| Magic numbers introduceren | Check of er een `DesignTokens.Spacing.*` waarde past (EvRoute regel 13) |
| "8pt lager" toepassen zonder bestaande `.padding(.top, X)` te checken | Lees eerst de huidige waarde — anders dubbele offset (bv. 16 wordt 24, niet 8) |

## EvRoute-specifiek

- Gebruik `DesignTokens.Spacing.*` waarden waar mogelijk i.p.v. losse cijfers
- Geen hardcoded kleuren/fonts/spacing (CLAUDE.md regel 13)
- Default simulator: iPhone 16 Pro, iOS 18.x

## Red Flags — STOP

- Gebruiker zegt "ik wil het anders" zonder richting → **vraag eerst welke kant op**
- Meer dan 3 elementen tegelijk willen wijzigen → dit is geen micro-change, switch naar `swiftui-design-principles`
- Modifier wijziging breekt andere views → terugdraaien, andere aanpak (Spacer, frame, of stack-spacing)
