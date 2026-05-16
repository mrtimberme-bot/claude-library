# Bijdragen aan de Claude Library

Bedankt voor je interesse om een component bij te dragen. Dit document legt uit hoe je een skill, plugin, agent of ander onderdeel kunt indienen.

## Hoe het werkt

1. Fork deze repository
2. Voeg je component toe (zie formaat hieronder)
3. Valideer lokaal met het validatiescript
4. Open een Pull Request
5. De geautomatiseerde checks draaien automatisch
6. De library-beheerder reviewt en merget (of geeft feedback)

## Component formaat

### Optie A — JSON entry in `components.json`

Voeg een object toe aan de lijst in `components.json`:

```json
{
  "id": "mijn-skill-naam",
  "name": "Mijn skill naam",
  "type": "skill",
  "status": "active",
  "version": "v1.0",
  "desc": "Beschrijving van minimaal 50 tekens die uitlegt wat deze component doet en wanneer je hem gebruikt.",
  "usage": "# Trigger zinnen:\n- \"doe X met...\"\n- \"gebruik Y om...\"",
  "tags": ["tag1", "tag2", "tag3"],
  "author": "jouw-github-username",
  "updated": "2026-05-16",
  "path": "skills/mijn-skill/SKILL.md",
  "docs": "https://link-naar-documentatie-of-#"
}
```

**Verplichte velden:** id, name, type, status, version, desc, usage, tags, author, updated, path

**Toegestane types:** `skill` · `plugin` · `agent` · `memory` · `mcp` · `api` · `arch` · `infra` · `orch`

**Toegestane statussen:** `active` · `wip` · `draft` · `deprecated`

### Optie B — SKILL.md bestand

Maak een map aan onder het juiste type en voeg een `SKILL.md` toe:

```
skills/
  jouw-skill-naam/
    SKILL.md          ← verplicht
    voorbeelden/      ← aanbevolen
    tests/            ← aanbevolen
```

**Minimale SKILL.md structuur:**

```markdown
---
name: Jouw skill naam
description: Korte omschrijving
author: jouw-github-username
version: v1.0
license: MIT
---

## Wat doet deze skill?

Beschrijf hier duidelijk het doel en de werking.

## Wanneer gebruiken?

Trigger zinnen of situaties waarin je deze skill inzet.

## Gebruik

Instructies voor Claude of concrete prompt-voorbeelden.

## Voorbeelden

Concrete input → output voorbeelden.
```

## Validatie lokaal uitvoeren

Voordat je een PR opent, valideer je component lokaal:

```bash
# Valideer een specifiek bestand:
python3 validate_component.py pad/naar/SKILL.md
python3 validate_component.py pad/naar/component.json

# Valideer alle componenten in components.json:
python3 validate_component.py --all
```

Het script controleert:

| Check | Wat het doet |
|---|---|
| Structuur | Verplichte velden aanwezig en correct type |
| Prompt injection | Detecteert pogingen om Claude's gedrag te manipuleren |
| Geblokkeerde domeinen | Voorkomt verwijzingen naar verdachte externe services |
| Verborgen tekens | Detecteert zero-width characters en unicode obfuscatie |
| Bestandsgrootte | Maximum 500 KB per bestand |
| Kwaliteit | Beschrijving, usage en tags voldoende ingevuld |
| Secrets scan | Geen API keys, tokens of wachtwoorden |

## Wat wordt niet geaccepteerd?

- Componenten met prompt injection patronen of jailbreak-pogingen
- Verwijzingen naar externe diensten zonder duidelijk doel
- Componenten die data exfiltreren of systeemcommando's aanroepen
- Bestanden groter dan 500 KB
- Componenten zonder beschrijving of gebruik

## Review proces

Na je PR:
1. **Geautomatiseerde checks** draaien direct (±1 minuut)
2. Bij fouten: het systeem plaatst een commentaar met uitleg
3. Bij succes: de beheerder reviewt de inhoud handmatig
4. Feedback of goedkeuring volgt binnen een paar dagen

## Vragen?

Open een [Issue](../../issues) of neem contact op via de repo discussions.
