---
name: ios-blok-workflow
description: De blok-gebaseerde werkwijze voor iOS app ontwikkeling — één feature per blok, één feature branch, één PR, met notify protocol via ntfy. Activeert bij vermelding van "blok", "migratie blok", "feature branch", of bij start van een nieuwe substantiële feature. Werkt voor DiscoverScan en alle volgende iOS apps.
---

# iOS Blok Workflow

De manier waarop ik substantiëel werk in iOS apps oppak: in **blokken**. Eén blok = één feature = één feature branch = één PR.

## Definitie van een blok

Een blok is een logisch afgerond stuk werk dat:
- Op zichzelf reviewbaar is
- In 2-6 uur gedaan kan worden (groter? splitsen)
- Een eigen feature branch krijgt
- Een eigen PR oplevert

Voorbeelden: "Camera capture flow", "Keychain integratie", "History grid view", "Design system tokens".

GEEN blok: "wat opruimen", "een paar bugs fixen", "kleine refactor". Dat zijn losse commits op een lopende branch.

## Flow per blok

### 1. Lees eerst
- `docs/PRD.md` — productdefinitie
- `docs/architecture/*.md` — relevante architectuur stukken
- Bestaande code in de feature folder
- `docs/tasks/<blok-naam>.md` als die bestaat

### 2. Plan
Schets wijzigingen voordat je code schrijft. Output:
- Welke bestanden nieuw / gewijzigd / verwijderd
- Welke types/functies/views erbij komen
- Eventuele afwijkingen van bestaande patterns + waarom
- Welke handmatige acties (Xcode UI, fonts, signing) nodig zijn

Notify: `/notify "⚠️ [Blok-naam] plan klaar - review?"`

### 3. Wacht op review
Tenzij gebruiker expliciet "ga door" of "geen review nodig" zegt.

### 4. Implementeer in kleine logische stappen
- Begin met types/protocols (compileert direct)
- Dan service-laag
- Dan ViewModel
- Dan View
- Dan tests

Notify bij significante mijlpalen, niet elke commit.

### 5. Verifieer
```bash
xcodebuild -scheme <SchemeName> -destination 'platform=iOS Simulator,name=iPhone 15' build
xcodebuild test ...
swiftlint
```

### 6. PR voorbereiden
- Geen `git push` zonder expliciete toestemming
- PR description met: wat, waarom, hoe te testen, screenshots/screencasts indien UI

Notify: `/notify "✅ [Blok-naam] klaar - PR draft"`

## Notify Protocol

Gebruik `/notify` voor:
- ⚠️ Plan klaar voor review
- ⏸ Manuele Xcode UI actie nodig
- ✅ Sub-taak compleet
- 🎯 Hele blok live
- 🚨 Blocker / build failure

Géén notify voor: elke file edit, elke commit, elke succesvolle build. Alleen op echte beslismomenten.

## Branch & commit conventies

**Branch naam**: `feat/<blok-naam>` of `fix/<korte-beschrijving>` of `chore/<wat>`. Engels, lowercase, kebab-case.

**Commit messages**: Conventional Commits.
- `feat: add camera capture view`
- `fix: handle missing camera permission gracefully`
- `refactor: extract identification logic into service`
- `chore: bump deployment target to iOS 17`

Eén commit = één logische wijziging.

## Wanneer een blok stoppen / opsplitsen

Als tijdens implementatie blijkt dat het blok groter is dan ingeschat:
1. Notify direct: `/notify "🚨 [Blok-naam] groter dan verwacht - splitsen?"`
2. Wacht op beslissing
3. Splits in 2 blokken met duidelijke grens
