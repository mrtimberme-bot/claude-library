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

## Na de setup

Gebruik vanuit elk project:
```bash
python3 /pad/naar/library-fetch.py --list
python3 /pad/naar/library-fetch.py --load <component-id>
python3 /pad/naar/library-fetch.py --for ui
```
