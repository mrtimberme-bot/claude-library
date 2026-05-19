#!/usr/bin/env python3
"""
library-fetch.py
────────────────
Haalt een component altijd live op uit de GitHub library.
Geen persistente cache — elke aanroep = laatste versie.

Aangeroepen door Claude Code slash commands:
  /library          → interactief menu
  /load <id>        → direct laden op ID
  /load-for <type>  → suggesties op basis van context

Retourneert de component-inhoud op stdout zodat Claude Code
hem direct als context kan gebruiken.

Gebruik:
  python3 library-fetch.py --list
  python3 library-fetch.py --load security-auditor
  python3 library-fetch.py --for ui
  python3 library-fetch.py --for auth
  python3 library-fetch.py --suggest CLAUDE.md
"""

import os
import sys
import re
import json
import argparse
import textwrap
from pathlib import Path
from datetime import datetime

try:
    import requests
except ImportError:
    print("pip install requests", file=sys.stderr)
    sys.exit(1)

# ── CONFIG ────────────────────────────────────────────────────────────────────

LIBRARY_REPO   = os.environ.get("CLAUDE_LIBRARY_REPO", "mrtimberme-bot/claude-library")
LIBRARY_BRANCH = os.environ.get("CLAUDE_LIBRARY_BRANCH", "main")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN", "")

# Tijdelijke map per sessie — wordt niet hergebruikt tussen sessies
SESSION_TMP    = Path("/tmp/claude-library-session")

# Context-type → relevante component IDs
CONTEXT_MAP = {
    "ui":          ["hig-compliance", "accessibility-auditor", "motion-designer",
                    "haptics-designer", "ux-designer", "frontend-skill"],
    "auth":        ["security-auditor", "privacy-manifest"],
    "security":    ["security-auditor", "privacy-manifest"],
    "release":     ["app-store-readiness", "release-manager", "post-launch"],
    "feature":     ["hig-compliance", "accessibility-auditor", "swift-reviewer",
                    "security-auditor"],
    "review":      ["swift-reviewer", "hig-compliance", "accessibility-auditor",
                    "security-auditor"],
    "onboarding":  ["onboarding-designer", "ux-designer", "motion-designer"],
    "network":     ["security-auditor"],
    "data":        ["security-auditor", "swift-reviewer"],
    "localization":["localization-manager"],
    "audit":       ["app-store-readiness", "accessibility-auditor",
                    "security-auditor", "hig-compliance"],
    "launch":      ["app-store-readiness", "release-manager", "post-launch",
                    "privacy-manifest"],
    "animation":   ["motion-designer", "haptics-designer"],
    "agent":       ["agent"],
    "memory":      ["claude-md-memory"],
    "orchestratie":["prompt-chain-orch"],
    "document":    ["docx-skill", "pdf-skill"],
    "mcp":         ["gdrive-mcp"],
}

# ── KLEUREN ───────────────────────────────────────────────────────────────────

RESET="\033[0m"; BOLD="\033[1m"; DIM="\033[2m"
GREEN="\033[32m"; YELLOW="\033[33m"; CYAN="\033[36m"
RED="\033[31m"; BLUE="\033[34m"; MAGENTA="\033[35m"

def cl(color, t): return f"{color}{t}{RESET}"
def bold(t):      return cl(BOLD, t)
def dim(t):       return cl(DIM, t)

TYPE_COLORS = {
    "skill":GREEN,"plugin":MAGENTA,"agent":YELLOW,
    "memory":CYAN,"mcp":BLUE,"api":CYAN,
    "arch":RED,"infra":DIM,"orch":MAGENTA,"set":YELLOW,
}
TYPE_LABELS = {
    "skill":"skill","plugin":"plugin","agent":"agent",
    "memory":"memory","mcp":"MCP","api":"API","arch":"arch",
    "infra":"infra","orch":"orch","set":"set",
}

# ── GITHUB — ALTIJD LIVE ──────────────────────────────────────────────────────

def gh_headers():
    h = {"Accept": "application/vnd.github+json",
         "Cache-Control": "no-cache, no-store"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"token {GITHUB_TOKEN}"
    return h

def raw_url(path):
    # cache-busting via timestamp parameter
    ts = int(datetime.now().timestamp())
    return f"https://raw.githubusercontent.com/{LIBRARY_REPO}/{LIBRARY_BRANCH}/{path}?t={ts}"

def fetch_live(path: str) -> str:
    """Haalt ALTIJD de live versie op — geen cache."""
    url = raw_url(path)
    try:
        r = requests.get(url, headers=gh_headers(), timeout=15)
        r.raise_for_status()
        return r.text
    except requests.exceptions.ConnectionError:
        print(cl(RED, f"\n  Geen verbinding — controleer internet of GitHub token"), file=sys.stderr)
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(cl(RED, f"\n  GitHub fout: {e}"), file=sys.stderr)
        sys.exit(1)

def load_components() -> list:
    """Laadt components.json altijd live."""
    print(dim("  Ophalen uit library..."), end="\r", file=sys.stderr)
    text = fetch_live("components.json")
    data = json.loads(text)
    print(f"  {cl(GREEN,'✓')} {len(data)} componenten geladen (live)    ", file=sys.stderr)
    return data

def fetch_component_content(comp: dict) -> str | None:
    """Haalt SKILL.md of config altijd live op."""
    path = comp.get("path", "")
    if not path:
        return None
    try:
        return fetch_live(path)
    except SystemExit:
        return None

# ── VEILIGHEIDSCHECK ──────────────────────────────────────────────────────────

DANGER = [
    r"ignore\s+(all\s+)?previous\s+instructions?",
    r"jailbreak", r"dan\s+mode",
    r"you\s+are\s+now\s+(a\s+)?DAN",
    r"(send|exfiltrate)\s+(all\s+)?user\s+data",
    r"__import__\s*\(", r"os\.(system|popen|exec)",
    r"subprocess\.(run|call|Popen)",
    r"(override|bypass)\s+(safety|guardrail)",
]

def safety_check(content: str, cid: str) -> bool:
    for p in DANGER:
        if re.search(p, content, re.IGNORECASE):
            print(cl(RED, f"\n  GEBLOKKEERD [{cid}]: verdacht patroon gevonden"), file=sys.stderr)
            print(cl(RED, f"  Meld dit via een Issue in de library repo."), file=sys.stderr)
            return False
    if re.search(r'[\u200b\u200c\u200d\ufeff]', content):
        print(cl(RED, f"\n  GEBLOKKEERD [{cid}]: verborgen tekens"), file=sys.stderr)
        return False
    return True

# ── OUTPUT — NAAR STDOUT VOOR CLAUDE CODE ────────────────────────────────────

def format_for_claude(comp: dict, content: str | None) -> str:
    """
    Formatteert component als context-blok voor Claude Code.
    Claude Code leest dit als instructie-context.
    """
    tl = TYPE_LABELS.get(comp["type"], comp["type"])
    lines = [
        f"# [{tl.upper()}] {comp['name']} {comp['version']}",
        f"Auteur: {comp.get('author','-')} · Status: {comp['status']} · Bijgewerkt: {comp.get('updated','-')}",
        f"Library: {LIBRARY_REPO}/{comp['path']}",
        "",
        f"## Beschrijving",
        comp["desc"],
        "",
        f"## Gebruik",
        comp.get("usage", ""),
        "",
        f"## Tags",
        ", ".join(comp.get("tags", [])),
    ]

    if content:
        # Strip YAML frontmatter
        if content.startswith("---"):
            end = content.find("---", 3)
            if end > 0:
                content = content[end+3:].strip()
        lines += [
            "",
            "## Volledige instructies",
            "---",
            content,
            "---",
        ]

    lines += [
        "",
        f"_Live opgehaald op {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_",
    ]
    return "\n".join(lines)

def write_session_context(comp_id: str, formatted: str):
    """Schrijft naar tijdelijke sessie-map (niet persistent)."""
    SESSION_TMP.mkdir(exist_ok=True)
    out = SESSION_TMP / f"{comp_id}.md"
    out.write_text(formatted, encoding="utf-8")
    return out

# ── COMMANDO'S ────────────────────────────────────────────────────────────────

def cmd_list(components: list):
    """Toont alle beschikbare componenten."""
    print(f"\n  {bold('Claude Library')} — {dim(LIBRARY_REPO)}\n")
    by_type = {}
    for comp in components:
        by_type.setdefault(comp["type"], []).append(comp)

    for type_key in sorted(by_type):
        tl = TYPE_LABELS.get(type_key, type_key).upper()
        tc = TYPE_COLORS.get(type_key, "")
        print(f"  {cl(tc, bold(tl))}")
        for comp in sorted(by_type[type_key], key=lambda x: x["name"]):
            status = {"active":"●","wip":"◐","draft":"○","deprecated":"✕"}.get(comp["status"],"○")
            tags = dim(", ".join(comp["tags"][:3]))
            print(f"    {status}  {comp['id']:<34} {comp['version']:<6}  {tags}")
        print()

    print(dim(f"  Gebruik: python3 library-fetch.py --load <id>"))
    print(dim(f"  Context: python3 library-fetch.py --for ui|auth|release|review|...\n"))

def cmd_load(ids: list, components: list) -> int:
    """Laadt één of meer componenten live op en print ze naar stdout."""
    index = {c["id"]: c for c in components}
    loaded = 0

    for cid in ids:
        # Fuzzy match als exacte ID niet gevonden
        comp = index.get(cid)
        if not comp:
            matches = [c for c in components if cid.lower() in c["name"].lower()
                      or cid.lower() in c["id"]]
            if matches:
                comp = matches[0]
                print(cl(YELLOW, f"  '{cid}' → '{comp['id']}' gebruikt"), file=sys.stderr)
            else:
                print(cl(RED, f"  '{cid}' niet gevonden — gebruik --list"), file=sys.stderr)
                continue

        print(dim(f"  Ophalen: {comp['name']}..."), file=sys.stderr)
        content = fetch_component_content(comp)

        if content and not safety_check(content, comp["id"]):
            continue

        formatted = format_for_claude(comp, content)
        out_path = write_session_context(comp["id"], formatted)

        print(f"\n  {cl(GREEN,'✓')} {bold(comp['name'])} {comp['version']} geladen", file=sys.stderr)
        print(f"  Pad: {out_path}", file=sys.stderr)

        # Naar stdout — Claude Code leest dit als context
        print(formatted)
        print("\n" + "─"*60 + "\n")
        loaded += 1

    return loaded

def cmd_for(context_type: str, components: list):
    """Laadt alle componenten die bij een context-type passen."""
    context_type = context_type.lower()
    ids = CONTEXT_MAP.get(context_type)

    if not ids:
        # Probeer gedeeltelijke match
        matches = [k for k in CONTEXT_MAP if context_type in k]
        if matches:
            ids = CONTEXT_MAP[matches[0]]
            print(cl(YELLOW, f"  '{context_type}' → '{matches[0]}' gebruikt"), file=sys.stderr)
        else:
            print(cl(RED, f"  Onbekend context-type: '{context_type}'"), file=sys.stderr)
            print(f"  Beschikbaar: {', '.join(sorted(CONTEXT_MAP.keys()))}", file=sys.stderr)
            sys.exit(1)

    print(f"\n  {bold('Context:')} {context_type} "
          f"→ {len(ids)} componenten\n", file=sys.stderr)
    cmd_load(ids, components)

def cmd_suggest(claude_md_path: str, components: list):
    """Analyseert een CLAUDE.md en suggereert componenten — laadt ze daarna live."""
    path = Path(claude_md_path)
    if not path.exists():
        print(cl(RED, f"  Niet gevonden: {claude_md_path}"), file=sys.stderr)
        sys.exit(1)

    content = path.read_text(encoding="utf-8").lower()
    index   = {c["id"]: c for c in components}
    scores  = {}
    reasons = {}

    # Signaalwoord matching
    SIGNALS = {
        "swiftui":["hig-compliance","accessibility-auditor","swift-reviewer"],
        "ios":["hig-compliance","security-auditor","app-store-readiness","privacy-manifest"],
        "swift":["swift-reviewer","security-auditor"],
        "accessibility":["accessibility-auditor"],
        "hig":["hig-compliance"],
        "app store":["app-store-readiness","privacy-manifest"],
        "privacy":["privacy-manifest","security-auditor"],
        "keychain":["security-auditor"],
        "security":["security-auditor"],
        "localization":["localization-manager"],
        "animation":["motion-designer"],
        "haptics":["haptics-designer"],
        "onboarding":["onboarding-designer","ux-designer"],
        "release":["app-store-readiness","release-manager"],
        "post-launch":["post-launch"],
        "mcp":["gdrive-mcp"],
        "orchestrat":["prompt-chain-orch"],
    }

    for signal, ids in SIGNALS.items():
        if signal in content:
            for cid in ids:
                if cid in index:
                    scores[cid] = scores.get(cid, 0) + 2
                    reasons.setdefault(cid, []).append(f"'{signal}'")

    for comp in components:
        if comp["id"] in content:
            scores[comp["id"]] = scores.get(comp["id"], 0) + 5
            reasons.setdefault(comp["id"], []).append("direct vermeld")

    ranked = sorted(
        [(index[cid], scores[cid], reasons.get(cid,[])) for cid in scores if cid in index],
        key=lambda x: x[1], reverse=True
    )

    if not ranked:
        print("  Geen suggesties gevonden.", file=sys.stderr)
        return

    print(f"\n  {bold('Suggesties op basis van')} {claude_md_path}:\n", file=sys.stderr)
    for i, (comp, score, r) in enumerate(ranked, 1):
        tc = TYPE_COLORS.get(comp["type"], "")
        tl = TYPE_LABELS.get(comp["type"], comp["type"])
        print(f"  {bold(str(i)):>5}.  "
              f"{cl(tc, f'[{tl}]'):<20}"
              f"{bold(comp['name']):<32}"
              f"{dim(comp['version'])}  "
              f"{dim('← ' + ', '.join(r[:2]))}", file=sys.stderr)
    print(file=sys.stderr)

    raw = input(f"  {bold('Welke laden? (nummers, a=alles, n=niets): ')}").strip()
    if not raw or raw.lower() == "n":
        return

    if raw.lower() == "a":
        selected_ids = [r[0]["id"] for r in ranked]
    else:
        all_listed = [r[0] for r in ranked]
        id_map = {str(i+1): c for i, c in enumerate(all_listed)}
        selected_ids = []
        for token in raw.split(","):
            token = token.strip()
            if "-" in token:
                try:
                    s, e = token.split("-", 1)
                    for n in range(int(s), int(e)+1):
                        c = id_map.get(str(n))
                        if c:
                            selected_ids.append(c["id"])
                except ValueError:
                    pass
            else:
                c = id_map.get(token)
                if c:
                    selected_ids.append(c["id"])

    print(file=sys.stderr)
    cmd_load(selected_ids, components)

# ── INSTALLATIE ──────────────────────────────────────────────────────────────

CLAUDE_SKILLS = Path.home() / ".claude" / "skills"

def cmd_install(ids: list, components: list) -> int:
    """Installeert skills permanent naar ~/.claude/skills/<id>/SKILL.md"""
    index = {c["id"]: c for c in components}
    installed = 0

    for cid in ids:
        comp = index.get(cid)
        if not comp:
            matches = [c for c in components if cid.lower() in c["id"]]
            if matches:
                comp = matches[0]
                print(cl(YELLOW, f"  '{cid}' → '{comp['id']}' gebruikt"), file=sys.stderr)
            else:
                print(cl(RED, f"  '{cid}' niet gevonden"), file=sys.stderr)
                continue

        if comp.get("type") not in ("skill",):
            print(cl(YELLOW, f"  '{cid}' is geen skill (type: {comp.get('type')}) — overgeslagen"), file=sys.stderr)
            continue

        print(dim(f"  Ophalen: {comp['name']}..."), end="\r", file=sys.stderr)
        content = fetch_component_content(comp)
        if not content:
            print(cl(RED, f"  '{cid}' — geen inhoud gevonden               "), file=sys.stderr)
            continue

        if not safety_check(content, comp["id"]):
            continue

        dest = CLAUDE_SKILLS / comp["id"]
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "SKILL.md").write_text(content, encoding="utf-8")
        print(f"  {cl(GREEN,'✓')} {bold(comp['name']):<36} → {dest}/SKILL.md", file=sys.stderr)
        installed += 1

    if installed:
        print(f"\n  {cl(GREEN, bold(str(installed)))} skill(s) geïnstalleerd in {CLAUDE_SKILLS}\n", file=sys.stderr)
    return installed


def cmd_set(set_id: str, components: list):
    """Installeert alle skills uit een named set."""
    index = {c["id"]: c for c in components}
    s = index.get(set_id)
    if not s:
        matches = [c for c in components if c.get("type") == "set" and set_id.lower() in c["id"]]
        if matches:
            s = matches[0]
            print(cl(YELLOW, f"  '{set_id}' → '{s['id']}' gebruikt"), file=sys.stderr)
        else:
            sets = [c["id"] for c in components if c.get("type") == "set"]
            print(cl(RED, f"  Set '{set_id}' niet gevonden"), file=sys.stderr)
            if sets:
                print(f"  Beschikbare sets: {', '.join(sets)}", file=sys.stderr)
            sys.exit(1)

    if s.get("type") != "set":
        print(cl(RED, f"  '{set_id}' is geen set (type: {s.get('type')})"), file=sys.stderr)
        sys.exit(1)

    skill_ids = s.get("skills", [])
    print(f"\n  {bold('Set:')} {s['name']} — {s.get('desc','')}\n"
          f"  {len(skill_ids)} skills te installeren...\n", file=sys.stderr)
    cmd_install(skill_ids, components)


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Haal Claude Library componenten live op",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
        Voorbeelden:
          python3 library-fetch.py --list
          python3 library-fetch.py --load security-auditor hig-compliance
          python3 library-fetch.py --for ui
          python3 library-fetch.py --for auth
          python3 library-fetch.py --suggest CLAUDE.md
          python3 library-fetch.py --for release > /tmp/release-context.md
        """)
    )
    parser.add_argument("--list",    action="store_true",
                        help="Toon alle beschikbare componenten")
    parser.add_argument("--load",    nargs="+", metavar="ID",
                        help="Laad specifieke component(en) op ID")
    parser.add_argument("--for",     metavar="TYPE", dest="for_type",
                        help=f"Laad componenten voor context-type: {', '.join(sorted(CONTEXT_MAP.keys()))}")
    parser.add_argument("--suggest", metavar="CLAUDE.MD",
                        help="Analyseer CLAUDE.md en suggereer passende componenten")
    parser.add_argument("--install", nargs="+", metavar="ID",
                        help="Installeer skill(s) permanent naar ~/.claude/skills/")
    parser.add_argument("--set",     metavar="SET_ID",
                        help="Installeer alle skills uit een set (bijv. ios-foundation)")
    parser.add_argument("--repo",    metavar="USER/REPO",
                        help="Andere library repo")
    parser.add_argument("--branch",  metavar="BRANCH",
                        help="Andere branch (default: main)")

    args = parser.parse_args()

    if args.repo:
        global LIBRARY_REPO
        LIBRARY_REPO = args.repo
    if args.branch:
        global LIBRARY_BRANCH
        LIBRARY_BRANCH = args.branch

    components = load_components()

    if   args.list:     cmd_list(components)
    elif args.load:     cmd_load(args.load, components)
    elif args.install:  cmd_install(args.install, components)
    elif args.set:      cmd_set(args.set, components)
    elif args.for_type: cmd_for(args.for_type, components)
    elif args.suggest:  cmd_suggest(args.suggest, components)
    else:               parser.print_help()

if __name__ == "__main__":
    main()
