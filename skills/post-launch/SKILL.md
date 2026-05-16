---
name: post-launch
description: Post-launch monitoring en update planning — crashes, App Store reviews, ratings, feedback patterns, hotfix beslissing. Activeert na App Store approval, bij vermelding van "post-launch", "dag 1/7/30 check", "crash rate", "app review", of bij planning van een update na live release.
---

# Post-Launch Skill

Na lancering begint een andere fase: luisteren naar gebruikers, problemen snel identificeren, en beslissen wat er volgende komt.

## De drie check-in momenten

### Dag 1 — Stabiliteitscheck
Focus: is er niks kapot?
- Crash rate > 2% → **start direct een hotfix**
- Crash rate 1-2% → monitor volgende 24u, hotfix als het niet daalt
- Crash rate < 1% → goed, ga verder

Actie: `git checkout -b fix/hotfix-dag1` en `/wrap-feature` direct daarna

### Dag 7 — Gebruikerssignalen
Focus: wat zeggen vroege gebruikers?
- Lees **alle** reviews van de afgelopen week
- Identificeer patronen (3+ gelijkaardige opmerkingen = patroon)
- Categoriseer: bug / UX verbeter / feature request / positief
- Maak GitHub issues voor alles wat actie nodig heeft

### Dag 30 — Update planning
Focus: wat gaat de volgende versie bevatten?
- Analyseer feedback patronen uit week 1-4
- Kijk naar App Analytics: welke features worden veel gebruikt, welke niet?
- Besluit: patch (bugfixes) / minor (nieuwe features) / niks
- Plan eerste blokken voor volgende versie

## Crash drempelwaarden

| Crash rate | Actie |
|-----------|-------|
| > 5% | Hotfix vandaag, overweeg versie intrekken |
| 2-5% | Hotfix binnen 24u |
| 1-2% | Monitor, hotfix als aanhoudend |
| 0.5-1% | Bug fixen in normale cyclus |
| < 0.5% | Prima, geen actie nodig |

## Review response strategie

**Beantwoord WEL:**
- 1-2 ster reviews met specifieke klacht (laat zien dat je luistert)
- Bug reports met "kan ik niet reproduceren" (vraag reproductiestappen)
- Positieve reviews met specifieke functies (bedank en benoem roadmap)

**Beantwoord NIET:**
- Vage 1-ster reviews zonder tekst
- Spam

**Response template:**
```
Bedankt voor je feedback! [Specifieke reactie op klacht/vraag].
We nemen dit mee in onze volgende update. — Het {{APP_NAME}} team
```

## Hotfix workflow

Als hotfix nodig:

1. Branch aanmaken: `git checkout main && git checkout -b fix/hotfix-{{beschrijving}}`
2. Reproduceer het crash-scenario
3. Fix implementeren (klein en gericht — geen andere wijzigingen)
4. `/quick-audit`
5. `/ship patch` met urgentie-notitie voor Apple Review

Vermeld in App Store What's New: "Kritieke bug opgelost die [symptoom] veroorzaakte."

## Update backlog structuur

Bijhouden in `docs/release/backlog.md`:

```markdown
# Update Backlog

## v{{VOLGENDE_PATCH}} — Bugfixes
- [ ] {{BUG_1}} (bron: crash log / review)

## v{{VOLGENDE_MINOR}} — Features  
- [ ] {{FEATURE_1}} (bron: dag-7 review analyse)
- [ ] {{FEATURE_2}} (bron: feature request x3)

## Later / overwegen
- [ ] {{IDEE}} (bron: 1 review)
```

## Metrics om bij te houden

Per release loggen in `docs/release/post-launch-log.md`:
- Dag 1 crash rate
- Dag 7 gemiddelde rating
- Dag 30 totaal downloads
- Meest gerapporteerde issues
- Meest gewaardeerde features

Dit bouwt een historisch beeld op van wat werkt per app.

## Wanneer verder gaan met ontwikkelen

Start pas een nieuwe major feature als:
- Crash rate < 1% op laatste versie
- Geen open hotfix branches
- Dag-7 check is gedaan en issues zijn getriaged
