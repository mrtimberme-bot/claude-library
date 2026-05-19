---
name: deep-research
description: Use when you need to thoroughly research a topic, technology, competitor, concept, or question using multiple web sources. Triggers on requests like "onderzoek X", "wat is er bekend over Y", "deep dive into Z", or any question requiring current external knowledge beyond training data.
allowed-tools: WebSearch, WebFetch, Read, Write
---

# Deep Research

## Overzicht

Onderzoek een onderwerp grondig via meerdere zoekhoeken, meerdere bronnen per hoek, en synthetiseer tot een gestructureerd rapport met bronvermeldingen en onzekerheidsgraden.

**Kernprincipe:** Één query = confirmation bias. Altijd meerdere invalshoeken, inclusief tegenwerpingen.

## Wanneer te gebruiken

- Competitief onderzoek (concurrent, product, markt)
- Technologie-evaluatie (library, framework, tool)
- Conceptverdieping (algoritme, architectuurpatroon, standaard)
- Actualiteiten (release notes, CVE, API-wijzigingen)
- Alle vragen waarbij je trainingsdata onvolledig of verouderd kan zijn

## Aanpak

### Stap 1 — Definieer de onderzoeksvraag

Formuleer één heldere hoofdvraag én 3-5 deelvragen:

```
Hoofdvraag: Wat is de huidige staat van [onderwerp]?
Deelvragen:
  - Hoe werkt het technisch?
  - Wat zijn de sterke punten?
  - Wat zijn de zwakke punten / beperkingen?
  - Wat zeggen critici / alternatieven?
  - Wat is de huidige versie / status?
```

### Stap 2 — Zoekhoeken (minimaal 4)

Zorg dat elke hoek een andere invalshoek dekt:

| Hoek | Voorbeeldquery |
|---|---|
| **Officieel** | `[onderwerp] official documentation site:docs.* OR github.com` |
| **Praktijkervaring** | `[onderwerp] review experience pros cons 2024 OR 2025` |
| **Kritisch** | `[onderwerp] problems issues limitations alternatives` |
| **Vergelijkend** | `[onderwerp] vs [alternatief] comparison` |
| **Actueel** | `[onderwerp] latest news release changelog` |

### Stap 3 — Bronkwaliteit beoordelen

Per bron, noteer:
- **Type:** officieel / community / journalistiek / academisch / commercieel
- **Datum:** hoe recent?
- **Onzekerheidsgraad:** LAAG / MIDDEN / HOOG

Label speculatie altijd expliciet: `[SPECULATIE]`

### Stap 4 — WebFetch voor diepte

Gebruik WebFetch voor de 2-3 meest relevante bronnen om volledig te lezen i.p.v. alleen snippets.

### Stap 5 — Synthetiseer

```markdown
## Samenvatting (TL;DR)
[3-5 zinnen kernbevinding]

## Bevindingen per deelvraag
[Per deelvraag: feiten + bronnen + onzekerheid]

## Sterktes
## Beperkingen / Kritiek
## Alternatieven

## Conclusie voor [jouw context]
[Concrete implicaties]

## Bronlijst
- [Bron](url) — type, datum, onzekerheid
```

## Veelgemaakte fouten

| Fout | Fix |
|---|---|
| Alleen de eerste zoekresultaten lezen | Minimaal 4 verschillende queries draaien |
| Geen kritische hoek zoeken | Altijd expliciet zoeken op "problems", "limitations", "criticism" |
| Speculatie als feit presenteren | Label `[SPECULATIE]` bij iedere aanname |
| Verouderde bronnen niet markeren | Datum altijd vermelden; bronnen >2 jaar markeren als oud |
| Stoppen bij snippets | WebFetch de 2-3 meest relevante pagina's volledig |

## Minimale output

Altijd minimaal:
- ✅ 4+ unieke queries uitgevoerd
- ✅ Kritische / negatieve hoek meegenomen
- ✅ Onzekerheidsgraad per claim
- ✅ Bronlijst met datum en type
- ✅ Concrete conclusie voor de vraagsteller
