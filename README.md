# Claude Library

Persoonlijke component library voor Claude — skills, agents, memory, MCP servers, tools en meer.

## Structuur

```
/skills/          — SKILL.md bestanden
/agents/          — agent configuraties
/memory/          — CLAUDE.md en memory configs
/mcp/             — MCP server configuraties
/tools/           — API tool configs
/plugins/         — plugin definities
/orchestration/   — prompt chain patronen
/architecture/    — Architecture Decision Records (ADRs)
```

## Gebruik

Open `index.html` (GitHub Pages) voor de visuele library browser.

Voeg componenten toe door `components.json` te bewerken.

## Bijwerken via Claude Code

```bash
python3 claude-library-deploy.py
```

---
Gegenereerd met Claude
