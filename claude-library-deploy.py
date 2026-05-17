#!/usr/bin/env python3
"""
claude-library-deploy.py
────────────────────────
Gebruikt vanuit Claude Code of terminal:

  python3 claude-library-deploy.py

Wat het doet:
  1. Vraagt om je GitHub token (of leest GITHUB_TOKEN env var)
  2. Maakt een nieuwe GitHub repo aan
  3. Upload index.html + components.json
  4. Activeert GitHub Pages
  5. Print de live URL

Vereisten:
  pip install PyGithub

GitHub token aanmaken:
  https://github.com/settings/tokens/new
  Scopes nodig: repo (alle), workflow (optioneel)
"""

import os
import sys
import json
import base64
import time
from pathlib import Path

try:
    from github import Github, GithubException, Auth
except ImportError:
    print("❌  PyGithub niet gevonden. Installeer via:")
    print("    pip install PyGithub")
    sys.exit(1)

# ── CONFIG ────────────────────────────────────────────────────────────────────

REPO_NAME        = "claude-library"
REPO_DESCRIPTION = "Persoonlijke Claude component library — skills, agents, memory, tools & meer"
REPO_PRIVATE     = True           # Privé repo — vereist GitHub Pro voor Pages
BRANCH           = "main"
COMMIT_MESSAGE   = "chore: initiële Claude Library deploy"

# Bestanden om te uploaden (pad op schijf → pad in repo)
FILES_TO_UPLOAD = {
    "index.html":                                         "index.html",
    "components.json":                                    "components.json",
    "validate_component.py":                              "validate_component.py",
    "CONTRIBUTING.md":                                    "CONTRIBUTING.md",
    "CLAUDE.md":                                          "CLAUDE.md",
    "worker.js":                                          "worker.js",
    "wrangler.toml":                                      "wrangler.toml",
    "cockpit/index.html":                                 "cockpit/index.html",
    "snippets/animated-navbar/index.html":                "snippets/animated-navbar/index.html",
    "snippets/animated-navbar/snippet.html":              "snippets/animated-navbar/snippet.html",
    "snippets/animated-navbar/snippet.css":               "snippets/animated-navbar/snippet.css",
    "snippets/animated-navbar/snippet.js":                "snippets/animated-navbar/snippet.js",
    "snippets/theme-toggle/index.html":                   "snippets/theme-toggle/index.html",
    "snippets/theme-toggle/snippet.html":                 "snippets/theme-toggle/snippet.html",
    "snippets/theme-toggle/snippet.css":                  "snippets/theme-toggle/snippet.css",
    "snippets/theme-toggle/snippet.js":                   "snippets/theme-toggle/snippet.js",
}
# Workflows apart — pad bevat submap
WORKFLOW_FILES = {
    ".github/workflows/validate.yml": ".github/workflows/validate.yml",
}

# Optioneel: extra mappen aanmaken met een placeholder .gitkeep
SCAFFOLD_DIRS = [
    "skills/.gitkeep",
    "agents/.gitkeep",
    "memory/.gitkeep",
    "mcp/.gitkeep",
    "tools/.gitkeep",
    "architecture/.gitkeep",
    "plugins/.gitkeep",
    "orchestration/.gitkeep",
]

README_CONTENT = """\
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
"""

# ── HELPERS ───────────────────────────────────────────────────────────────────

def encode_file(filepath: str) -> str:
    """Leest een bestand en geeft base64-encoded content terug."""
    with open(filepath, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def get_token() -> str:
    """Haalt GitHub token op uit env var of vraagt interactief."""
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        print(f"✓  GitHub token gevonden via GITHUB_TOKEN env var")
        return token

    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  GitHub Personal Access Token nodig                 ║")
    print("║  Aanmaken: github.com/settings/tokens/new           ║")
    print("║  Scopes: repo (alle aanvinken)                       ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    import getpass
    token = getpass.getpass("Plak je GitHub token (verborgen input): ").strip()
    if not token:
        print("❌  Geen token ingevoerd.")
        sys.exit(1)
    return token

def find_files() -> dict:
    """Zoekt alle te uploaden bestanden (hoofd + workflows) in dezelfde map als dit script."""
    script_dir = Path(__file__).parent
    found = {}
    missing = []

    all_files = {**FILES_TO_UPLOAD, **WORKFLOW_FILES}
    for local_name, repo_path in all_files.items():
        local_path = script_dir / local_name
        if local_path.exists():
            found[str(local_path)] = repo_path
        else:
            missing.append(local_name)

    if missing:
        print(f"⚠️   Bestanden niet gevonden: {', '.join(missing)}")
        print(f"    Verwacht in: {script_dir}")
        if not found:
            sys.exit(1)

    return found

# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print("\n🚀  Claude Library Deploy\n")

    # 1. Token ophalen
    token = get_token()

    # 2. Verbinden met GitHub
    try:
        g = Github(auth=Auth.Token(token))
        user = g.get_user()
        username = user.login
        print(f"✓  Ingelogd als: {username}")
    except GithubException as e:
        print(f"❌  GitHub authenticatie mislukt: {e.data.get('message', e)}")
        sys.exit(1)

    # 3. Repo aanmaken (of bestaande gebruiken)
    try:
        repo = user.get_repo(REPO_NAME)
        print(f"✓  Repo bestaat al: {repo.html_url}")
        print("   Bestanden worden bijgewerkt (bestaande content overschreven).")
    except GithubException:
        print(f"   Repo '{REPO_NAME}' aanmaken...")
        repo = user.create_repo(
            name=REPO_NAME,
            description=REPO_DESCRIPTION,
            private=REPO_PRIVATE,
            auto_init=True,        # maakt main branch + initieel commit
        )
        print(f"✓  Repo aangemaakt: {repo.html_url}")
        time.sleep(2)              # even wachten zodat GitHub de branch initialiseert

    # 4. README uploaden / bijwerken
    readme_content_b64 = base64.b64encode(README_CONTENT.encode()).decode()
    try:
        existing = repo.get_contents("README.md", ref=BRANCH)
        repo.update_file(
            "README.md", "docs: README bijgewerkt",
            README_CONTENT, existing.sha, branch=BRANCH
        )
        print("✓  README.md bijgewerkt")
    except GithubException:
        repo.create_file("README.md", "docs: README aangemaakt", README_CONTENT, branch=BRANCH)
        print("✓  README.md aangemaakt")

    # 5. Scaffold mappen aanmaken
    for gitkeep_path in SCAFFOLD_DIRS:
        try:
            repo.get_contents(gitkeep_path, ref=BRANCH)
        except GithubException:
            try:
                repo.create_file(
                    gitkeep_path, f"chore: map {gitkeep_path.split('/')[0]} aangemaakt",
                    "", branch=BRANCH
                )
                print(f"✓  Map aangemaakt: {gitkeep_path.split('/')[0]}/")
            except GithubException as e:
                print(f"⚠️   Map overgeslagen ({gitkeep_path}): {e}")

    # 6. Bestanden uploaden
    files = find_files()
    for local_path, repo_path in files.items():
        with open(local_path, "rb") as f:
            content = f.read()

        try:
            existing = repo.get_contents(repo_path, ref=BRANCH)
            repo.update_file(
                repo_path,
                f"{COMMIT_MESSAGE} — update {repo_path}",
                content,
                existing.sha,
                branch=BRANCH,
            )
            print(f"✓  Bijgewerkt: {repo_path}")
        except GithubException:
            repo.create_file(
                repo_path,
                f"{COMMIT_MESSAGE} — {repo_path}",
                content,
                branch=BRANCH,
            )
            print(f"✓  Geüpload: {repo_path}")

    # 7. GitHub Pages activeren
    print("\n   GitHub Pages activeren...")
    import urllib.request, urllib.error

    pages_url = f"https://api.github.com/repos/{username}/{REPO_NAME}/pages"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    }
    pages_payload = json.dumps({
        "source": {"branch": BRANCH, "path": "/"}
    }).encode()

    req = urllib.request.Request(pages_url, data=pages_payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            pages_data = json.loads(resp.read())
            pages_live_url = pages_data.get("html_url", f"https://{username}.github.io/{REPO_NAME}")
            print(f"✓  GitHub Pages geactiveerd")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "already enabled" in body or e.code == 409:
            pages_live_url = f"https://{username}.github.io/{REPO_NAME}"
            print(f"✓  GitHub Pages was al actief")
        else:
            print(f"⚠️   Pages activering: {e.code} — {body}")
            pages_live_url = f"https://{username}.github.io/{REPO_NAME}"

    # 8. Samenvatting
    print(f"""
╔══════════════════════════════════════════════════════════╗
║  ✅  Deploy geslaagd!                                    ║
╠══════════════════════════════════════════════════════════╣
║  Repo:   {repo.html_url:<46} ║
║  Pages:  {pages_live_url:<46} ║
║                                                          ║
║  Let op: GitHub Pages kan 1-2 minuten nodig hebben      ║
║  voordat de URL live is.                                 ║
╚══════════════════════════════════════════════════════════╝

Volgende stappen:
  1. Voeg skills toe in /skills/ en update components.json
  2. Run dit script opnieuw om te syncen
  3. Of gebruik: GITHUB_TOKEN=xxx python3 claude-library-deploy.py
""")

if __name__ == "__main__":
    main()
