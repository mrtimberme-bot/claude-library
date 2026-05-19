---
description: Start of day — context laden, status check, plan voor vandaag
---

# Start of Day

## 1. Git context

```bash
git status
git branch --show-current
git log --oneline -5
```

## 2. Open PRs en CI status

```bash
gh pr list --author @me --state open
gh run list --limit 5
```

Highlight failures: toon welke job faalt en de laatste error.

## 3. Active feature context

Als er een feature branch actief is:
```bash
# Feature naam ophalen
BRANCH=$(git branch --show-current)
FEATURE=${BRANCH#feat/}
FEATURE=${FEATURE#fix/}

# Plan lezen als dat bestaat
cat "docs/tasks/$FEATURE-plan.md" 2>/dev/null || \
cat "docs/tasks/daily-log.md" 2>/dev/null | tail -40
```

## 4. App Store status (als app live is)

Als het project een App Store listing heeft (controleer `fastlane/Appfile`):
```bash
# Controleer of App Store Connect API geconfigureerd is
cat fastlane/Appfile 2>/dev/null | grep app_identifier

# Actieve reviews/releases
gh api "repos/$(git remote get-url origin | sed 's/.*github.com\///;s/.git//')/releases?per_page=3" \
  --jq '.[].tag_name' 2>/dev/null | head -3
```

Als Fastlane is geconfigureerd en er een recente release is → check voor open App Review feedback.

## 5. Template-sync check (wekelijks, elke maandag)

```bash
DAY=$(date +%u)  # 1=maandag
if [ "$DAY" = "1" ]; then
  echo "📋 Maandag: template-sync check"
  # Controleer of ios-app-template updates heeft
  gh api repos/timothystekkinger/ios-app-template/commits \
    --jq '.[0] | "Template laatste update: \(.commit.committer.date[:10]) — \(.commit.message | split("\n")[0])"' \
    2>/dev/null || echo "Template repo niet bereikbaar"
fi
```

Als er updates zijn → stel voor: "Er zijn template updates beschikbaar. Wil je `/template-sync` uitvoeren?"

## 6. Cost check (als Claude API gebruikt wordt)

Als `Services/Claude/` of `Services/ClaudeService.swift` bestaat:
```bash
# Check vandaag's API kosten (als CostTracker aanwezig)
grep -r "CostTracker\|totalCost\|usageCost" "$(basename $(pwd))/" --include="*.swift" -l 2>/dev/null | head -3
```

Geef tip: "Gebruik `/cost-check` voor gedetailleerde API kostenanalyse."

## 7. Dagelijkse briefing

Genereer een beknopte briefing:

```
📅 Vandaag: {{DATUM}}

🌿 Branch: {{BRANCH}}
📋 Open PRs: {{AANTAL}}
{{CI_STATUS_REGEL}}

Waar waren we:
{{LAATSTE_DAILY_LOG_ENTRY}}

Volgende stap:
{{AANBEVELING}}

Blockers:
{{BLOCKERS_OF_GEEN}}
```

## 8. Aanbeveling voor vandaag

Stel concreet voor:
- Als er CI failures zijn → `/fix-ci`
- Als PR open is en CI groen → merge of review vragen
- Als geen feature actief is → `/plan-feature` voor nieuwe feature
- Als app bijna klaar voor release → `/audit` dan `/ship`
- Als er template updates zijn (maandag) → `/template-sync`

## 9. Akkoord

Stel: "Klaar om te starten? Of wil je iets aanpassen?"

Niet in code duiken zonder akkoord.
