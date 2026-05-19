# Claude Library — setup map

## Jouw taak

Voer de volledige library setup uit zoals beschreven in SETUP.md.
Lees SETUP.md eerst volledig, daarna voer je alle stappen uit in volgorde.

Start direct — geen bevestiging nodig.

## Vereiste env vars

Zet ze voor je Claude Code start:
```bash
export GITHUB_TOKEN=ghp_jouwtoken
claude  # start Claude Code in deze map
```

Of geef ze mee bij het starten:
```bash
GITHUB_TOKEN=ghp_jouwtoken claude
```

## Wat er in deze map staat

| Bestand | Functie |
|---|---|
| SETUP.md | Stap-voor-stap instructies voor Claude Code |
| index.html | Library browser (GitHub Pages UI) |
| components.json | Component registry |
| validate_component.py | Veiligheidsvalidator |
| claude-library-deploy.py | GitHub deploy script |
| library-fetch.py | Live component fetcher |
| CONTRIBUTING.md | Bijdragegids voor externe makers |
| .github/workflows/validate.yml | GitHub Actions validatie |

## Regels voor skills

**Verwijder nooit skills** uit `Library/skills/`, `~/.claude/skills/`, of `components.json` zonder expliciete toestemming van de gebruiker. Toevoegen en syncen mag altijd; verwijderen alleen als de gebruiker dit expliciet bevestigt.

**iOS Golden Set (ios-golden) — herbeoordelingsregel:**
Na elke nieuwe skill-import controleer je altijd of de nieuwe skills thuishoren in de `ios-golden` set. Criteria voor toevoeging:
- De skill heeft `ios`, `swift`, `swiftui`, `xcode`, `tvos`, `visionos`, `apple` of `app-store` in de tags
- De skill is relevant voor één van de iOS lifecycle fases:
  - **F0 · Pre-development**: marktonderzoek, competitive intelligence, app concept validatie
  - **F1 · Setup & architectuur**: project setup, tooling, Swift architectuur
  - **F2 · Development**: Swift, SwiftUI, data, concurrency
  - **F3 · Testing & debugging**: tests, profiling, debugging
  - **F4 · UI / Design**: HIG, SwiftUI design, accessibility
  - **F5 · Features**: notificaties, widgets, IAP, AI, lokalisatie
  - **F6 · Privacy & security**: privacy manifest, security
  - **F7 · Build & CI/CD**: Xcode, simulators, CI/CD
  - **F8 · App Store**: review compliance, ASC, store readiness
  - **F9 · Post-launch**: monitoring, onderhoud
- De skill is nog niet opgenomen in de set

Werk `ios-golden` bij in `components.json` en push naar GitHub na de beoordeling.

## Build na merge

Na elke merge naar de `main` branch voer je altijd een build uit:
```bash
npx wrangler deploy
```

Dit zorgt dat de live worker gesynchroniseerd blijft met de GitHub-bronbestanden.

## Na de setup

Gebruik vanuit elk project:
```bash
python3 /pad/naar/library-fetch.py --list
python3 /pad/naar/library-fetch.py --load <component-id>
python3 /pad/naar/library-fetch.py --for ui
```
