---
name: business-plan
description: Schrijft een volledig business plan voor een iOS app. Doorloopt stap voor stap: marktanalyse, business model canvas, monetisatiestrategie, go-to-market plan en financieel model. Leest bestaande projectdocs als context. Output naar docs/business-plan/. Gebruik bij: nieuwe app lanceren, investor pitch voorbereiden, strategische richting vastleggen.
allowed-tools: WebSearch, WebFetch, Read, Write, Bash
---

# Business Plan Skill — iOS App

## Wanneer te gebruiken

- Je wilt een business plan schrijven voor een iOS app (nieuw of bestaand project)
- Je bereidt een investor pitch voor
- Je wilt de strategische richting van je app vastleggen
- Je wilt markt, monetisatie en go-to-market op papier hebben

**Trigger:** `/business-plan`, "schrijf een business plan", "maak een business plan voor [app]"

---

## Stap 1 — Projectcontext ophalen

Lees de beschikbare projectdocumentatie **vóór** je vragen stelt. Zoek in volgorde:

```
docs/vision.md
docs/features.md
docs/research/competitor-analysis.md
docs/research/competitive-intelligence*.md
CLAUDE.md (App identiteit sectie)
app-manifest.json
```

Noteer intern wat je al weet over:
- App naam en categorie
- Doelmarkt (NL / EU / global)
- MVP-features
- Bestaande concurrentie-inzichten
- Monetisatiemodel (als al vastgelegd)

Sla alles over wat al bekend is uit de docs — vraag alleen wat nog ontbreekt.

---

## Stap 2 — Ontbrekende informatie ophalen

Stel **één vraag tegelijk**. Sla vragen over waarvan je het antwoord al weet uit Stap 1.

Vragen (in volgorde van prioriteit):

1. **Doelgroep:** Wie is de primaire gebruiker? (bijv. EV-rijder in NL die langeafstandsritten maakt)
2. **Kernprobleem:** Welk specifiek probleem lost de app op dat bestaande oplossingen niet goed doen?
3. **Monetisatie:** Freemium / betaald / abonnement / eenmalig? Al een idee over prijspunten?
4. **Tijdlijn:** Wanneer wil je live op de App Store? Wanneer wil je eerste inkomsten?
5. **Budget:** Wat is het maandelijkse budget voor API-kosten, marketing, tooling?
6. **Investor/eigen geld:** Zoek je investering of bootstrapped?
7. **Succes na 12 maanden:** Wat zijn je doelcijfers? (downloads, MRR, rating)

---

## Stap 3 — Marktanalyse

Voer online research uit voor ontbrekende cijfers. Gebruik WebSearch voor:

```
WebSearch: "[app categorie] market size Europe [huidig jaar]"
WebSearch: "[app categorie] iOS app revenue statistics"
WebSearch: "EV charging route planning app users statistics"
WebSearch: "[concurrenten] downloads revenue estimates"
```

Bereken TAM / SAM / SOM:

| Niveau | Definitie | Methode |
|--------|-----------|---------|
| **TAM** (Total Addressable Market) | Totale markt als je 100% zou hebben | EV-rijders × gemiddeld app-spend |
| **SAM** (Serviceable Addressable Market) | Deel dat je écht kunt bereiken | TAM × geografisch bereik × platform (iOS only) |
| **SOM** (Serviceable Obtainable Market) | Realistisch te veroveren in jaar 1-3 | SAM × realistisch marktaandeel |

Concurrentieanalyse (voor elke relevante concurrent):
- Naam + App Store rating + aantal ratings
- Prijsmodel
- Sterkste feature
- Grootste zwakte / klacht in reviews
- Geschatte maandelijkse downloads (sensor tower / data.ai schattingen via WebSearch)

---

## Stap 4 — Business Model Canvas

Werk alle 9 blokken uit:

### 1. Klantsegmenten
Wie zijn de gebruikers? Segmenteer op gedrag, niet demografie:
- Primair segment: [beschrijving + grootte inschatting]
- Secundair segment: [beschrijving + grootte inschatting]

### 2. Waardepropositie
Eén zin per segment: "Wij helpen [segment] om [probleem] te oplossen door [oplossing], in tegenstelling tot [alternatief]."

### 3. Kanalen
Hoe bereik je gebruikers?
- Organisch: App Store Search (ASO), SEO, word-of-mouth
- Betaald: Apple Search Ads, social media ads
- Partnerships: EV-fabrikanten, laadnetwerken, EV-communities

### 4. Klantrelaties
Hoe onderhoud je de relatie?
- Onboarding flow
- Push notificaties / in-app communicatie
- Community / social proof
- Support kanaal

### 5. Inkomstenstromen
Gedetailleerde uitwerking — zie Stap 5.

### 6. Kernmiddelen
Wat heb je nodig om dit te leveren?
- Technisch: iOS-ontwikkelkennis, API-toegang (laaddata, routering, weer)
- Data: laadstationsdatabase, voertuigprofielen
- Merk: naam, visuele identiteit
- Juridisch: privacy compliance (GDPR), Apple Developer account

### 7. Kernactiviteiten
Wat doe je dagelijks / wekelijks?
- App-ontwikkeling en -updates
- Data-kwaliteit bewaken (laadstations, up-to-date?)
- Gebruikersfeedback verwerken
- App Store optimalisatie
- Marketing content

### 8. Kernpartners
Wie heb je nodig?
- Laaddata API-aanbieders (Open Charge Map, OCPI-netwerken)
- Kaartdata (Apple Maps, Mapbox, HERE)
- Payment processor (StoreKit 2 / Apple)
- Mogelijk: EV-fabrikanten voor deep integration

### 9. Kostenstructuur
Zie Stap 6.

---

## Stap 5 — Monetisatiestrategie

### Freemium model (aanbevolen voor consumer apps)

Werk uit welke features free vs. pro zijn:

| Feature | Free | Pro |
|---------|------|-----|
| [feature 1] | ✅ | ✅ |
| [feature 2] | beperkt | ✅ |
| [feature 3] | ❌ | ✅ |

**Prijsstrategie:**
- Maandprijs: vergelijk met directe concurrenten (benchmark via WebSearch)
- Jaarprijs: typisch 40-50% korting op maandprijs × 12
- Lifetime: optioneel, typisch 3-4× jaarprijs
- Gratis proefperiode: 7 of 14 dagen (verhoogt conversie significant)

**Conversiedoelen:**
- Gemiddelde freemium→paid conversie consumer apps: 2-5%
- Met goede onboarding en duidelijke waardepropositie: 5-8%
- Bereken break-even: [maandelijkse kosten] ÷ [prijs per gebruiker] = benodigde betalende gebruikers

### Alternatieve / aanvullende inkomstenstromen

Overweeg:
- **B2B licenties** — aan fleet managers, EV-lease bedrijven
- **Data partnerships** — geanonimiseerde routedata aan laadnetwerken
- **White-label** — app als white-label aan EV-fabrikanten
- **Affiliate** — commissie op laadpas-abonnementen

---

## Stap 6 — Kostenstructuur

Maak een realistisch maandbudget:

### Vaste kosten (maandelijks)
| Post | Geschatte kosten |
|------|-----------------|
| Apple Developer Program | €8/maand (€99/jaar) |
| Routering API (bijv. Mapbox, HERE) | €0-50 (pay-per-use) |
| Laaddata API | €0-200 (afhankelijk van provider) |
| Hosting / backend | €0-50 (als serverless) |
| Analytics tool | €0-30 |
| Crash reporting | €0-25 |
| **Subtotaal infrastructuur** | **€8-363/maand** |

### Variabele kosten
| Post | Geschatte kosten |
|------|-----------------|
| Apple Search Ads | [budget] per maand |
| Social media ads | [budget] per maand |
| Content / design | [budget] per maand |

### Eenmalige kosten (launch)
| Post | Geschatte kosten |
|------|-----------------|
| App icoon / design | €0-500 |
| Website | €0-200 |
| PR / launch activiteiten | €0-500 |

---

## Stap 7 — Go-to-Market plan

### Fase 1: Pre-launch (4-8 weken voor launch)
- [ ] Landingspagina live met e-mail waitlist
- [ ] App Store pagina voorbereiden (screenshots, beschrijving, keywords)
- [ ] TestFlight beta met 20-50 EV-rijders uit doelgroep
- [ ] Aanmelden bij EV-communities (forums, Facebook-groepen, Reddit r/electricvehicles)
- [ ] Contact met EV-influencers / YouTubers voor review

### Fase 2: Launch week
- [ ] App Store submission 2 weken voor launch (review buffer)
- [ ] Product Hunt launch
- [ ] Press release naar tech- en EV-media
- [ ] Post in alle EV-communities (authentiek, geen spam)
- [ ] Apple Search Ads activeren op dag 1

### Fase 3: Groei (maanden 1-6)
- [ ] ASO optimaliseren op basis van eerste keyword-data
- [ ] Review-prompt triggeren na positieve actie in app
- [ ] Eerste gebruikersfeedback verwerken in update binnen 2 weken
- [ ] Organische groei meten: K-factor (hoeveel nieuwe users per bestaande user)
- [ ] Betalende gebruikers interviewen: wat was de trigger voor conversie?

### KPIs om te volgen
| Metric | Doel maand 1 | Doel maand 6 |
|--------|-------------|-------------|
| Downloads | [X] | [X] |
| DAU/MAU ratio | >20% | >30% |
| Free→Pro conversie | 2% | 4% |
| MRR | €[X] | €[X] |
| App Store rating | >4.0 | >4.5 |
| Churn (maandelijks) | <8% | <5% |

---

## Stap 8 — Financieel model (12 maanden)

Maak een maandelijkse projectie:

```
Aannames:
- Maandelijkse download-groei: X%
- Free→Pro conversie: X%
- Maandprijs Pro: €X
- Churn: X% per maand
- Apple commissie: 30% jaar 1, 15% daarna (Small Business Program)

Maand 1:
  Downloads:          [X]
  Actieve gebruikers: [X]
  Betalend:           [X] ([X]%)
  MRR (bruto):        €[X]
  Apple commissie:    -€[X]
  MRR (netto):        €[X]
  Kosten:             -€[X]
  Netto:              €[X]

Break-even maand: [X]
```

---

## Stap 9 — Risico's en mitigatie

Identificeer de top 5 risico's:

| Risico | Kans | Impact | Mitigatie |
|--------|------|--------|-----------|
| Apple wijzigt App Store regels | Laag | Hoog | Diversifieer naar web-app |
| Laaddata API stopt of wordt duur | Middel | Hoog | Meerdere providers, Open Charge Map backup |
| Grotere speler kopieert feature | Hoog | Middel | Snelheid en community als moat |
| Lage conversie freemium→paid | Middel | Hoog | A/B test onboarding, pricing |
| Privacy-wetgeving GDPR | Laag | Hoog | Privacy-first architectuur, geen tracking |

---

## Stap 10 — Output schrijven

Schrijf het volledige business plan naar:

```
docs/business-plan/
  business-plan.md          ← volledig document
  financial-model.md        ← maandelijkse projectie (jaar 1-3)
  competitive-landscape.md  ← concurrentieanalyse (als nog niet bestaat)
```

### Format business-plan.md

```markdown
# Business Plan — [App Naam]
**Versie:** 1.0  
**Datum:** [YYYY-MM-DD]  
**Status:** Concept / Review / Definitief

## Executive Summary
[3-5 zinnen: wat, voor wie, waarom nu, wat vraag je]

## 1. Probleemstelling
## 2. Oplossing & Waardepropositie
## 3. Doelgroep & Markt (TAM/SAM/SOM)
## 4. Concurrentieanalyse
## 5. Business Model Canvas
## 6. Monetisatiestrategie
## 7. Go-to-Market Plan
## 8. Kostenstructuur
## 9. Financieel Model
## 10. Team
## 11. Mijlpalen & Tijdlijn
## 12. Risico's & Mitigatie
## 13. Wat vragen we (als investor pitch)
```

---

## Minimale output vereisten

- ✅ Alle 9 Business Model Canvas blokken uitgewerkt
- ✅ TAM / SAM / SOM berekend met bronnen
- ✅ Minimaal 3 concurrenten geanalyseerd
- ✅ Free vs. Pro feature-tabel uitgewerkt
- ✅ Prijsstrategie met benchmark onderbouwd
- ✅ 12-maanden financieel model met break-even punt
- ✅ Go-to-market plan met concrete acties en datums
- ✅ Top 5 risico's met mitigatiestrategie
- ✅ Weggeschreven naar `docs/business-plan/business-plan.md`
- ✅ Alle marktcijfers gelabeld als [INSCHATTING] of voorzien van bron

---

## Anti-patterns

| Fout | Fix |
|------|-----|
| Marktcijfers zonder bron | Altijd bron vermelden of [INSCHATTING] toevoegen |
| "We richten ons op iedereen met een EV" | Segmenteer — eerste 1000 gebruikers zijn een specifiek type |
| Financieel model zonder churn | Churn vernietigt SaaS-modellen; altijd meenemen |
| Go-to-market = "social media posten" | Concreet: welk kanaal, welke community, welke datum |
| Concurrenten onderschatten | Analyseer reviews op hun zwaktes — dat is jouw kans |
| Apple commissie vergeten | 30% jaar 1 / 15% daarna via Small Business Program |
