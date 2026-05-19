---
name: competitor-intelligence
description: Gespecialiseerde competitive intelligence voor iOS/Android apps. Analyseert concurrenten via App Store aanwezigheid, review mining, feature gaps, ASO en monetisatie. Levert een geprioriteerd marktaandeel-rapport. Gebruik bij feature beslissingen, dalende ranking, nieuwe marktlancering, of kwartaalmonitoring.
allowed-tools: WebSearch, WebFetch, Read, Write
---

# App Competitor Intelligence

## Doel

Breng de marktpositie van een app volledig in kaart door concurrenten te analyseren op lagen die generiek deep-research mist: App Store reviews, update cadans, ASO keywords, feature whitespace en monetisatiemodellen. Output is altijd een concreet rapport met geprioriteerde verbeterpunten voor marktaandeel.

## Wanneer te gebruiken

- Vóór een grote feature-beslissing
- Bij dalende App Store ranking of ratings
- Bij lancering in nieuwe markt of categorie
- Kwartaalmonitoring van de concurrentiepositie
- Bij het schrijven of herzien van een ASO-strategie

## Verschil met /deep-research

| deep-research | competitor-intelligence |
|---|---|
| Generiek onderzoek | iOS/Android app-specifiek |
| Vrije structuur | Vast schema per concurrent |
| Concept-gefocust | Actie-gefocust (marktaandeel) |
| Geen review mining | Expliciete 1★/2★ review mining |
| Geen ASO-dimensie | ASO keyword analyse ingebouwd |
| Geen feature matrix | Feature gap matrix standaard |

---

## Aanpak

### Stap 1 — Context ophalen

Verzamel bij de gebruiker (of leid af uit beschikbare context):

- Naam en korte beschrijving van de app
- App Store categorie (bijv. Health & Fitness, Finance, Productivity)
- Doelmarkt en taal (NL, US, global)
- Huidige monetisatie (gratis, IAP, subscription, eenmalig)
- Bekende concurrenten (optioneel — anders zelf identificeren)

Als de app in de huidige projectdirectory beschikbaar is, lees dan CLAUDE.md of relevante config-bestanden voor context.

---

### Stap 2 — Concurrenten identificeren (minimaal 3-5)

Zoek via meerdere hoeken tegelijk:

```
WebSearch: "[categorie] best iOS apps 2025 top rated"
WebSearch: "[jouw app naam] alternatives iOS app store"
WebSearch: "best [use case] iPhone app review 2025"
WebSearch: "[categorie] app store top charts [markt] 2025"
WebSearch: "[jouw app naam] vs competitors comparison"
```

Doel: 3-5 **directe concurrenten** (zelfde use case) + 1-2 **indirecte** (andere aanpak, zelfde behoefte).

---

### Stap 3 — Per concurrent: gestructureerde analyse

Vul voor elke concurrent dit schema in via WebSearch en WebFetch:

```
Concurrent: [naam]
├── App Store aanwezigheid
│   ├── Beoordeling: X.X/5 (Y beoordelingen)
│   ├── Ratingtrend: stijgend / stabiel / dalend [INSCHATTING]
│   ├── Laatste update: datum
│   ├── Update cadans: X updates/jaar [INSCHATTING]
│   └── Categorie ranking: #X in [categorie] [INSCHATTING]
├── Monetisatie
│   ├── Model: gratis / freemium / paid / subscription
│   ├── Prijs: €X/maand of €X eenmalig
│   ├── Trial: ja (X dagen) / nee
│   └── IAP: ja / nee — wat
├── Features top 5 (uit screenshots + beschrijving)
├── ASO analyse
│   ├── Titel keywords
│   ├── Subtitle keywords
│   └── Beschrijving focus
└── Store page kwaliteit: A+ (screenshots+video+A/B) / B / C
```

---

### Stap 4 — Review mining (kritiekste stap)

Dit is de stap die generieke research mist. Voer dit uit voor de top 2-3 concurrenten:

**Zoekqueries:**
```
WebSearch: "[concurrent naam] iOS app 1 star reviews complaints 2024 2025"
WebSearch: "[concurrent naam] app negative reviews what went wrong"
WebSearch: "site:reddit.com [concurrent naam] app problems"
WebSearch: "[concurrent naam] app feature request users want"
WebFetch: review aggregator pagina's (bijv. AppFollow, AppBot, Sensor Tower review samples)
```

**Extracteer per concurrent:**

1. **Top 5 klachten uit 1★/2★ reviews** — wat doet de app structureel niet goed?
2. **Top 5 geprezen features uit 4★/5★** — wat moeten ze absoluut behouden?
3. **Terugkerende feature requests** — wat wil de gebruiker dat er ontbreekt?
4. **Afhaakredenen** — "ik ben overgestapt omdat..."

Label alle inschattingen als [INSCHATTING] wanneer je niet direct de reviews kunt lezen.

---

### Stap 5 — Feature gap matrix

Vergelijk features van alle concurrenten vs. jouw app in één matrix:

```
Feature              | Jouw app | Conc. A | Conc. B | Conc. C | Prioriteit
--------------------|----------|---------|---------|---------|----------
[Feature 1]         |    ✓     |    ✓    |    ✓    |    ✓    | —
[Feature 2]         |    ✗     |    ✓    |    ✓    |    ✗    | KRITIEK (2/3)
[Feature 3]         |    ✓     |    ✗    |    ✗    |    ✗    | USP
[Feature 4]         |    ✗     |    ✗    |    ✗    |    ✗    | WHITESPACE
```

**Classificatie:**
- **KRITIEK**: feature aanwezig bij 2+ concurrenten, ontbreekt bij jou
- **KANS (WHITESPACE)**: feature ontbreekt bij iedereen — differentiatie mogelijk
- **USP**: alleen jij hebt dit — behoud en versterk
- **PARITY**: iedereen heeft het, jij ook — hygiene, geen onderscheid

---

### Stap 6 — ASO gap analyse

```
WebSearch: "[concurrent naam] app store keywords title optimization"
WebSearch: "[categorie] app store keyword ranking top apps"
```

Identificeer:
- Keywords waarop top-concurrenten ranken maar jij niet
- Ondergebruikte zoektermen in de categorie (lage competitie, redelijk volume)
- Verbeterpunten voor titel, subtitle, screenshots first impression

---

### Stap 7 — Synthese rapport

Genereer het volledige rapport in deze structuur:

```markdown
## Competitive Intelligence Rapport: [App naam]
**Datum:** [datum] | **Markt:** [markt] | **Categorie:** [categorie]

### Executive Summary (3 zinnen)
[Huidige positie] · [Grootste kans] · [Grootste dreiging]

### Concurrentenmatrix
[Tabel uit stap 3 — alle concurrenten naast elkaar]

### Gebruikersklachten bij concurrenten (kansen voor jou)
Voor elke klacht: aanwezig bij X concurrenten, concrete verbetering voor jouw app

1. [Klacht] — [X concurrenten] — [jouw kans]
2. ...

### Feature Gaps

**Kritiek (fix vóór volgende release):**
- [Feature] — [X/Y concurrenten] — gebruikersimpact: hoog

**Kansen (whitespace — niemand doet dit goed):**
- [Feature] — differentiatie-potentieel: hoog/midden

**Jouw USPs (behoud en versterk):**
- [Feature] — marktvoordeel: [beschrijving]

### ASO verbeterpunten
[Specifieke keyword/titel/screenshot aanpassingen met rationale]

### Monetisatie inzicht
[Vergelijking + aanbeveling — wat doet de marktleider, wat is de outsider opportunity]

### Prioritaire acties voor marktaandeel
Gerangschikt op impact/effort ratio:

| # | Actie | Impact | Effort | Rationale |
|---|-------|--------|--------|-----------|
| 1 | ... | Hoog | Laag | ... |
| 2 | ... | Hoog | Midden | ... |
| 3 | ... | Midden | Laag | ... |

### Onzekerheden
[Alle claims gelabeld als INSCHATTING met reden]

### Bronlijst
[Alle bronnen — type, datum, URL]
```

---

## Minimale output vereisten

- ✅ Minimaal 3 concurrenten geanalyseerd
- ✅ Review mining voor top 2 concurrenten
- ✅ Feature gap matrix ingevuld
- ✅ Minimaal 5 geprioriteerde acties
- ✅ Alle schattingen gelabeld [INSCHATTING]
- ✅ Bronlijst met datum en type
- ✅ Executive summary max 3 zinnen

## Veelgemaakte fouten

| Fout | Fix |
|---|---|
| Alleen 5★ reviews lezen | 1★ en 2★ zijn de goudmijn voor feature gaps |
| Concurrent beschrijven zonder actie | Elke bevinding vertalen naar "dus jij kan..." |
| Feature-lijst zonder prioritering | Altijd impact + effort aangeven |
| ASO overslaan | Keywords zijn laaghangend fruit voor marktaandeel |
| Dezelfde bronnen als deep-research | Zoek specifiek naar App Store review sites, Reddit, forums |
