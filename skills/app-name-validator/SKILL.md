---
name: app-name-validator
description: Valideert een iOS app-naam vóór het begin van ontwikkeling. Controleert App Store beschikbaarheid, trademark, domein en Bundle ID. Legt de goedgekeurde naam vast in CLAUDE.md en app-manifest.json. Gebruik als eerste stap bij elk nieuw app-project.
allowed-tools: WebSearch, WebFetch, Bash, Read, Write, Edit
---

# App Name Validator

## Wanneer te gebruiken

Altijd als eerste stap bij een nieuw iOS app-project — vóór `ios-baseline`, vóór `/new-app`, vóór het aanmaken van een Xcode project.

**Trigger:** "ik wil een app maken die...", "nieuwe app: [naam]", `/app-name-validator [naam]`

---

## Stap 1 — Naam ophalen

Vraag de gebruiker (of leid af uit context):

- **App naam** (display name zoals zichtbaar in de App Store)
- **Doelmarkt** (NL / US / global)
- **App categorie** (bijv. Health & Fitness, Productivity)
- **Developer naam / organisatie** (voor Bundle ID opbouw)

Als de naam al bekend is uit de context, sla dit over en ga direct naar Stap 2.

---

## Stap 2 — Vier checks parallel

Voer alle vier checks uit via WebSearch:

### Check 1 — App Store beschikbaarheid

```
WebSearch: "\"[app naam]\" site:apps.apple.com"
WebSearch: "[app naam] iOS app store"
WebFetch: https://itunes.apple.com/search?term=[app+naam]&entity=software&limit=10
```

Beoordeel:
- Bestaat er een app met exact deze naam? → **CONFLICT**
- Bestaat er een app met een vergelijkbare naam in dezelfde categorie? → **RISICO**
- Geen relevante hits → **VRIJ**

### Check 2 — Trademark check

```
WebSearch: "[app naam] trademark registered USPTO"
WebSearch: "[app naam] trademark EUIPO Europe"
WebSearch: "\"[app naam]\" trademark software technology"
```

Beoordeel:
- Actief merk in software/tech categorie → **CONFLICT**
- Merk in andere categorie → **RISICO** (vermeld klasse)
- Geen hits → **WAARSCHIJNLIJK VRIJ** [INSCHATTING — geen juridisch advies]

### Check 3 — Domein beschikbaarheid

```
WebSearch: "[appnaam].com beschikbaar domein"
WebSearch: "[appnaam].app domain available"
WebFetch: https://www.namecheap.com/domains/registration/results/?domain=[appnaam].com
```

Controleer minimaal: `.com`, `.app`, `.io`, `.nl` (als NL-markt)

Beoordeel per extensie: **VRIJ** / **BEZET** / **PREMIUM**

### Check 4 — Bundle ID beschikbaarheid

Standaard Bundle ID opbouw: `com.[developer].[appnaam]` (alleen lowercase, geen spaties)

```
WebSearch: "com.[developer].[appnaam] app bundle identifier"
```

Controleer ook: App Store Connect vereist unieke Bundle ID wereldwijd. Na Stap 2 ook controleren in Apple Developer Console (handmatige stap — instrueer gebruiker).

---

## Stap 3 — Rapport genereren

```
App Naam Validatie: [Naam]
─────────────────────────────────────────
App Store:    ✓ VRIJ / ⚠ RISICO / ✗ CONFLICT
Trademark:    ✓ VRIJ / ⚠ RISICO / ✗ CONFLICT
Domein .com:  ✓ VRIJ / ✗ BEZET ($XX/jr als premium)
Domein .app:  ✓ VRIJ / ✗ BEZET
Bundle ID:    com.[developer].[appnaam] — [status]
─────────────────────────────────────────
Advies: GOEDGEKEURD / OVERWEEG ALTERNATIEF / NIET AANBEVOLEN

Toelichting:
[Concrete bevindingen per check]

Alternatieve namen (als risico's aanwezig):
- [Naam variant 1]
- [Naam variant 2]
```

**Aanbeveling bij CONFLICT:** stel 2-3 alternatieven voor (suffix, prefix, of spelling variant) en herhaal de checks voor het gekozen alternatief.

---

## Stap 4 — Naam vastleggen (alleen bij GOEDGEKEURD)

### 4a — app-manifest.json aanmaken

Maak aan in de projectmap (of huidige map als nog geen project bestaat):

```json
{
  "app": {
    "name": "[App Naam]",
    "bundle_id": "com.[developer].[appnaam]",
    "category": "[App Store categorie]",
    "target_market": "[NL/US/global]",
    "developer": "[developer naam]",
    "validated": "[datum YYYY-MM-DD]",
    "validation_status": "approved"
  },
  "domains": {
    ".com": "[vrij/bezet]",
    ".app": "[vrij/bezet]",
    ".io": "[vrij/bezet]"
  },
  "checks": {
    "app_store": "[vrij/risico/conflict]",
    "trademark": "[vrij/risico/conflict]",
    "bundle_id": "[status]"
  }
}
```

### 4b — CLAUDE.md bijwerken of aanmaken

Voeg toe aan het begin van `CLAUDE.md` in de projectmap:

```markdown
# [App Naam]

## App identiteit
- **Naam:** [App Naam]
- **Bundle ID:** com.[developer].[appnaam]
- **Categorie:** [categorie]
- **Doelmarkt:** [markt]
- **Naam gevalideerd:** [datum]
```

Als `CLAUDE.md` al bestaat, voeg de "App identiteit" sectie toe onder de bestaande header.

---

## Stap 5 — Bevestiging aan gebruiker

Na het vastleggen:

```
✓ Naam "[App Naam]" gevalideerd en vastgelegd

Bestanden bijgewerkt:
  - app-manifest.json  (nieuw aangemaakt)
  - CLAUDE.md          (App identiteit sectie toegevoegd)

Bundle ID: com.[developer].[appnaam]

Volgende stap: /new-app of ios-baseline om het project op te zetten.
```

---

## Veelgemaakte fouten

| Fout | Fix |
|---|---|
| Naam alleen in US-store checken | Check ook NL/EU store als doelmarkt NL is |
| Trademark skip als "kleine app" | Altijd checken — Apple kan een app weigeren bij actief merk |
| Bundle ID met hoofdletters of spaties | Altijd lowercase, punten als separator: `com.dev.appnaam` |
| Naam vastleggen vóór alle checks klaar zijn | Eerst alle 4 checks, dan pas vastleggen |
| Geen alternatieven voorstellen bij conflict | Minimaal 2 alternatieven aandragen |

---

## Minimale output vereisten

- ✅ Alle 4 checks uitgevoerd
- ✅ Rapport met duidelijk GOEDGEKEURD / RISICO / CONFLICT per check
- ✅ Bundle ID voorstel (lowercase, geen spaties)
- ✅ Bij goedkeuring: app-manifest.json aangemaakt
- ✅ Bij goedkeuring: CLAUDE.md bijgewerkt met App identiteit
- ✅ Alle inschattingen gelabeld als [INSCHATTING]
