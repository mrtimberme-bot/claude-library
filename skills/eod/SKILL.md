---
description: End of day — veilig afsluiten, dag loggen, notificatie sturen
---

# End of Day

## 1. Uncommitted werk afhandelen

```bash
git status
```

Categoriseer wat er is:
- Feature werk in progress → commit `wip: <beschrijving>`
- Experiment dat misschien weg kan → `git stash push -m "<beschrijving>"`
- Niks → ga door

```bash
# Als er iets te committen is
git add .
git commit -m "wip: {{BESCHRIJVING}}"
```

## 2. Backup push

```bash
git push origin HEAD
```

Als geen upstream: `git push -u origin $(git branch --show-current)`

## 3. CI status

```bash
gh run list --limit 3
```

Als er failures zijn → noteer ze voor morgen, doe nu niks.

## 4. Daily log bijwerken

Append naar `docs/tasks/daily-log.md`:

```markdown
## {{DATUM}}

### Gedaan
- {{WAT_IS_GEDAAN}}

### Volgende stap
{{CONCRETE_VOLGENDE_STAP}}

### Openstaand / blockers
{{OPENSTAANDE_VRAGEN_OF_GEEN}}

### Notes voor morgen
{{EXTRA_CONTEXT}}
```

Vul dit in op basis van de sessie — niet generiek, maar concreet.

## 5. Simulator afsluiten

```bash
xcrun simctl shutdown all
```

## 6. Dag samenvatting

Genereer een korte samenvatting (max 2 zinnen) van wat er vandaag gedaan is.

/notify "💤 EOD: {{KORTE_SAMENVATTING_MAX_8_WOORDEN}}"

## 7. Afsluitmelding

Toon:
```
👋 Klaar voor vandaag.

Morgen verder met: {{VOLGENDE_STAP}}

Start morgen met: /sod
```

⚠️ Sluit Xcode NIET automatisch — doe dat zelf met Cmd+Q als gewenst.
