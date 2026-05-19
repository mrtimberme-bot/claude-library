# Design Spec: iOS Template Project met Golden Skillset

**Datum:** 2026-05-19  
**Status:** Goedgekeurd  
**Auteur:** Timothy Stekkinger

---

## Samenvatting

Een `/new-app` slash command in Claude Code dat een nieuw iOS project aanmaakt, de ios-golden skillset installeert (globaal én lokaal in het project), en een startup-hook configureert die automatisch controleert of de golden set updates heeft. Een `/check-skills` slash command biedt dezelfde check op aanvraag.

---

## Probleemstelling

Bij het starten van een nieuw iOS project zijn er altijd twee handmatige stappen:
1. De juiste skills installeren vanuit de library
2. Onthouden welke skills er zijn en welke lifecycle-fase ze dekken

Bovendien raken lokale skill-installaties verouderd als de library groeit — er is geen mechanisme dat dit signaleert.

---

## Architectuur

### Aanpak: library-fetch.py uitbreiden

Bestaande tool (`~/Claude/Library/library-fetch.py`) krijgt drie nieuwe flags:

| Flag | Functie |
|---|---|
| `--new-project <naam> <pad>` | Maakt projectstructuur aan + installeert golden set |
| `--check-updates <set-id>` | Vergelijkt lokale `.meta.json` met live `components.json` |
| `--sync-project <set-id>` | Updatet `~/.claude/skills/` én `.claude/skills/` |

---

## Componenten

### 1. `/new-app` skill (`~/.claude/commands/new-app.md`)

Slash command dat Claude orkestreert. Aanroep:

```
/new-app MijnApp
```

**Uitvoervolgorde:**

1. `mkdir -p ~/Projects/MijnApp` + `cd ~/Projects/MijnApp`
2. `git init`
3. `python3 ~/Claude/Library/library-fetch.py --install` voor alle 46 ios-golden skills → `~/.claude/skills/`
4. Kopieer alle skills naar `.claude/skills/` in het project (lokale snapshot)
5. Schrijf `.claude/skills/.meta.json` met versie-tracking per skill
6. Schrijf `CLAUDE.md` met skill-index geordend per lifecycle-fase
7. Schrijf `.claude/settings.json` met UserPromptSubmit hook
8. `tuist init --name MijnApp --platform iOS`
9. `git add -A && git commit -m "chore: init project with ios-golden skillset v$(date +%Y-%m-%d)"`

**Resultaat:** project is direct klaar voor development, Claude heeft alle 46 skills beschikbaar.

---

### 2. Startup hook

Bestand: `.claude/settings.json` in elk nieuw project

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/Claude/Library/library-fetch.py --check-updates ios-golden 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

Het script draait bij de **eerste prompt van elke sessie** (matcher leeg = altijd). Output-formaat:

```
[SKILLS] 3 updates beschikbaar: swift-architecture (v1.0→v1.1), hig-compliance (v1.0→v1.2), ios-baseline (v1.0→v1.3)
Typ 'ja' om bij te werken of negeer dit bericht.
```

Claude ontvangt deze tekst als context en meldt het aan de gebruiker. Bij akkoord:

```bash
python3 ~/Claude/Library/library-fetch.py --sync-project ios-golden
```

**Cache:** het script slaat de datum van de laatste check op in `.meta.json`. Bij hetzelfde uur wordt de check overgeslagen om onnodige netwerkverzoeken te voorkomen.

---

### 3. `/check-skills` slash command (`~/.claude/commands/check-skills.md`)

Handmatige variant. Claude voert uit:

```bash
python3 ~/Claude/Library/library-fetch.py --check-updates ios-golden
```

Toont:
- Skills die up-to-date zijn (compact)
- Skills met beschikbare updates (uitgebreid: wat veranderde)
- Vraag: bijwerken ja/nee

---

### 4. Versie-tracking: `.claude/skills/.meta.json`

```json
{
  "set": "ios-golden",
  "set_version": "v1.0",
  "installed": "2026-05-19",
  "last_checked": "2026-05-19T10:00:00",
  "skills": {
    "ios-baseline":       { "version": "v1.0", "updated": "2026-05-19" },
    "swift-architecture": { "version": "v1.0", "updated": "2026-05-19" },
    "hig-compliance":     { "version": "v1.0", "updated": "2026-05-19" }
  }
}
```

Vergelijkingslogica in `--check-updates`:
1. Laad `.claude/skills/.meta.json`
2. Fetch `components.json` van de library (GitHub raw CDN)
3. Vergelijk `updated`-veld per skill
4. Print alleen skills met een nieuwere datum dan lokaal opgeslagen

---

### 5. CLAUDE.md template (gegenereerd door `/new-app`)

```markdown
# MijnApp — CLAUDE.md

## Skills (ios-golden — geïnstalleerd 2026-05-19)

### Fase 1 · Setup & architectuur
- ios-baseline, ios-blok-workflow, swift-architecture, tuist-expert, swift-api-design-guidelines

### Fase 2 · Development
- swift-concurrency-expert, swift-reviewer, swift-formatstyle, swiftdata-expert, core-data-expert, swiftdata-cloudkit

### Fase 3 · Testing & debugging
- swift-testing-expert, ios-testing, debug-detective, diagnose, instruments-profiling, swiftui-performance-audit, parallel-code-review

### Fase 4 · UI / Design
- hig-compliance, swiftui-design-principles, swiftui-liquid-glass, ui-design-craft, figma-to-swiftui
- theme-designer, motion-designer, haptics-designer, ux-designer, onboarding-designer
- accessibility-auditor, apple-accessibility-enhanced, focus-engine-tvos

### Fase 5 · Features
- push-notifications-expert, widgetkit-liveactivities, app-intents-expert, apple-foundation-models, storekit-iap, localization-manager

### Fase 6 · Privacy & security
- privacy-manifest, security-auditor

### Fase 7 · Build & CI/CD
- xcode-simulator-expert, ios-build-verify, ios-cicd

### Fase 8 · App Store
- app-store-readiness, app-store-review-compliance, app-store-connect-automation

### Fase 9 · Post-launch
- post-launch

## Skills updaten
python3 ~/Claude/Library/library-fetch.py --sync-project ios-golden
```

---

## Bestandsstructuur na `/new-app MijnApp`

```
~/Projects/MijnApp/
├── .claude/
│   ├── settings.json          ← startup hook
│   ├── commands/
│   │   └── check-skills.md    ← /check-skills slash command
│   └── skills/
│       ├── .meta.json         ← versie-tracking
│       ├── ios-baseline/
│       │   └── SKILL.md
│       ├── swift-architecture/
│       │   └── SKILL.md
│       └── ... (44 meer)
├── CLAUDE.md                  ← skill-index per fase
├── Project.swift              ← Tuist config
├── Tuist/
├── Sources/
│   └── MijnApp/
│       └── MijnAppApp.swift
└── Tests/
```

---

## Implementatieplan (volgorde)

1. **library-fetch.py uitbreiden** — `--check-updates`, `--sync-project`, `--new-project`
2. **`/new-app` skill schrijven** — slash command in `~/.claude/commands/`
3. **`/check-skills` skill schrijven** — slash command in `~/.claude/commands/`
4. **Testen** — `/new-app TestApp` uitvoeren, hook valideren, update simuleren

---

## Niet in scope

- Automatisch pushen naar GitHub bij project-aanmaak (aparte feature)
- Ondersteuning voor niet-iOS projecten (web, macOS only)
- Grafische UI voor de update-check (website toont al de library)
