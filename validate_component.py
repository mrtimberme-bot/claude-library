#!/usr/bin/env python3
"""
validate_component.py
─────────────────────
Valideert een component (SKILL.md of component JSON entry) op veiligheid,
structuur en kwaliteit voordat het in de library wordt opgenomen.

Gebruik:
  python3 validate_component.py pad/naar/SKILL.md
  python3 validate_component.py pad/naar/component.json
  python3 validate_component.py --all          # valideert alle componenten in components.json

Wordt ook automatisch aangeroepen door de GitHub Actions workflow (.github/workflows/validate.yml)
bij elke pull request.

Exit codes:
  0 = alles ok
  1 = validatiefouten gevonden (PR wordt geblokkeerd)
  2 = interne fout
"""

import sys
import os
import json
import re
import hashlib
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# ── CONFIGURATIE ──────────────────────────────────────────────────────────────

# Maximale bestandsgrootte voor een component (bytes)
MAX_FILE_SIZE = 512_000  # 500 KB

# Verplichte velden in components.json entry
REQUIRED_FIELDS = ["id", "name", "type", "status", "version", "desc", "usage", "tags", "author", "updated", "path"]

# Toegestane types en statussen
ALLOWED_TYPES   = {"skill", "plugin", "agent", "memory", "mcp", "api", "arch", "infra", "orch"}
ALLOWED_STATUSES = {"active", "wip", "draft", "deprecated"}

# Gevaarlijke patronen in SKILL.md / prompt-inhoud
# Dit zijn patronen die kunnen wijzen op prompt injection, jailbreaks of kwaadaardige instructies
DANGEROUS_PATTERNS = [
    # Prompt injection pogingen
    (r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", "Prompt injection patroon"),
    (r"disregard\s+(all\s+)?previous", "Prompt injection patroon"),
    (r"forget\s+(everything|all)\s+(you|your)", "Prompt injection patroon"),
    (r"you\s+are\s+now\s+(a\s+)?(?:DAN|AIM|STAN|DUDE|jailbreak)", "Jailbreak persona patroon"),
    (r"jailbreak", "Jailbreak referentie"),
    (r"dan\s+mode", "DAN mode patroon"),

    # Exfiltratie van data
    (r"(send|post|upload|transmit|exfiltrate)\s+(all\s+)?(user\s+)?(data|files|credentials|tokens|keys)", "Data exfiltratie patroon"),
    (r"http[s]?://(?!docs\.(anthropic|claude)\.com|github\.com|api\.anthropic\.com|drivemcp\.googleapis\.com|mcp\.[a-z]+\.com|docs\.)[^\s]{5,}", "Onbekende externe URL in prompt"),

    # Systeemtoegang
    (r"(execute|run|eval)\s+(arbitrary|system|shell|bash|os)", "Systeemcommando patroon"),
    (r"__import__\s*\(", "Python import in prompt"),
    (r"subprocess\.(run|call|Popen)", "Subprocess aanroep"),
    (r"os\.(system|popen|exec)", "OS systeemaanroep"),

    # Rolmanipulatie
    (r"you\s+must\s+(always\s+)?(comply|obey|follow)\s+without\s+question", "Onvoorwaardelijke gehoorzaamheid"),
    (r"(override|bypass|disable)\s+(safety|filter|guardrail|restriction)", "Veiligheidsomzeiling"),
    (r"pretend\s+(that\s+)?you\s+(have\s+no|don't\s+have)\s+(restriction|limit|rule)", "Beperking omzeilen"),

    # Verborgen instructies (base64, unicode tricks)
    (r"[A-Za-z0-9+/]{60,}={0,2}", "Mogelijke base64 encoded inhoud"),
    (r"\\u[0-9a-fA-F]{4}\\u[0-9a-fA-F]{4}\\u[0-9a-fA-F]{4}", "Unicode escape sequenties"),
]

# Verdachte URL domeinen die expliciet verboden zijn
BLOCKED_DOMAINS = [
    "ngrok.io", "ngrok.app", "webhook.site", "requestbin.com",
    "burpcollaborator.net", "pipedream.net", "canarytokens.com",
]

# Minimale kwaliteitseisen voor SKILL.md
MIN_DESC_LENGTH  = 50    # minimaal 50 tekens beschrijving
MIN_USAGE_LENGTH = 30    # minimaal 30 tekens gebruiksinstructie
MAX_TAGS         = 10    # maximaal 10 tags
MIN_TAGS         = 1     # minimaal 1 tag

# ── DATASTRUCTUREN ────────────────────────────────────────────────────────────

@dataclass
class ValidationResult:
    passed: bool = True
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    info: list = field(default_factory=list)

    def error(self, msg: str):
        self.errors.append(msg)
        self.passed = False

    def warn(self, msg: str):
        self.warnings.append(msg)

    def note(self, msg: str):
        self.info.append(msg)

# ── CHECKS ────────────────────────────────────────────────────────────────────

def check_file_size(filepath: Path, result: ValidationResult):
    size = filepath.stat().st_size
    if size > MAX_FILE_SIZE:
        result.error(f"Bestand te groot: {size:,} bytes (max {MAX_FILE_SIZE:,} bytes)")
    else:
        result.note(f"Bestandsgrootte: {size:,} bytes ✓")

def check_dangerous_patterns(content: str, result: ValidationResult):
    content_lower = content.lower()
    for pattern, label in DANGEROUS_PATTERNS:
        matches = re.findall(pattern, content_lower, re.IGNORECASE)
        if matches:
            result.error(f"Gevaarlijk patroon gevonden [{label}]: '{matches[0] if isinstance(matches[0], str) else matches[0][0]}'")

def check_blocked_domains(content: str, result: ValidationResult):
    for domain in BLOCKED_DOMAINS:
        if domain in content.lower():
            result.error(f"Geblokkeerd domein gevonden: {domain}")

def check_encoding(content: str, result: ValidationResult):
    # Check op verdacht veel non-ASCII (mogelijke obfuscatie)
    non_ascii = sum(1 for c in content if ord(c) > 127)
    ratio = non_ascii / max(len(content), 1)
    if ratio > 0.3:
        result.warn(f"Hoog percentage non-ASCII tekens ({ratio:.0%}) — controleer op obfuscatie")
    # Check op zero-width characters (onzichtbare tekst)
    zero_width = re.findall(r'[\u200b\u200c\u200d\ufeff\u2060]', content)
    if zero_width:
        result.error(f"Zero-width (onzichtbare) tekens gevonden — mogelijke verborgen instructies")

def check_json_component(data: dict, result: ValidationResult):
    """Valideert een JSON component entry."""

    # Verplichte velden
    for field_name in REQUIRED_FIELDS:
        if field_name not in data:
            result.error(f"Verplicht veld ontbreekt: '{field_name}'")

    if not result.passed:
        return  # stop als structuur al niet klopt

    # Type validatie
    if data.get("type") not in ALLOWED_TYPES:
        result.error(f"Ongeldig type: '{data.get('type')}' — toegestaan: {', '.join(sorted(ALLOWED_TYPES))}")

    # Status validatie
    if data.get("status") not in ALLOWED_STATUSES:
        result.error(f"Ongeldige status: '{data.get('status')}' — toegestaan: {', '.join(sorted(ALLOWED_STATUSES))}")

    # ID validatie (alleen lowercase letters, cijfers, koppeltekens)
    if not re.match(r'^[a-z0-9][a-z0-9\-]{2,63}$', data.get("id", "")):
        result.error(f"Ongeldig id: '{data.get('id')}' — gebruik alleen kleine letters, cijfers en koppeltekens (3-64 tekens)")

    # Versie validatie
    if not re.match(r'^v\d+\.\d+', data.get("version", "")):
        result.warn(f"Versienummer '{data.get('version')}' volgt niet het aanbevolen formaat (bijv. v1.0)")

    # Beschrijving kwaliteit
    desc = data.get("desc", "")
    if len(desc) < MIN_DESC_LENGTH:
        result.warn(f"Beschrijving te kort ({len(desc)} tekens, minimaal {MIN_DESC_LENGTH} aanbevolen)")

    # Usage kwaliteit
    usage = data.get("usage", "")
    if len(usage) < MIN_USAGE_LENGTH:
        result.warn(f"Gebruiksinstructie te kort ({len(usage)} tekens, minimaal {MIN_USAGE_LENGTH} aanbevolen)")

    # Tags
    tags = data.get("tags", [])
    if not isinstance(tags, list):
        result.error("'tags' moet een lijst zijn")
    else:
        if len(tags) < MIN_TAGS:
            result.warn(f"Minimaal {MIN_TAGS} tag vereist")
        if len(tags) > MAX_TAGS:
            result.warn(f"Meer dan {MAX_TAGS} tags — overweeg te beperken")
        for tag in tags:
            if not isinstance(tag, str) or len(tag) > 30:
                result.error(f"Ongeldige tag: '{tag}' — gebruik korte strings")

    # Datum validatie
    updated = data.get("updated", "")
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', updated):
        result.warn(f"Datum '{updated}' niet in ISO formaat (YYYY-MM-DD)")

    # Auteur
    if not data.get("author", "").strip():
        result.warn("Geen auteur opgegeven")

    # Content checks op tekstvelden
    all_text = " ".join([
        data.get("desc", ""),
        data.get("usage", ""),
        data.get("name", ""),
    ])
    check_dangerous_patterns(all_text, result)
    check_blocked_domains(all_text, result)
    check_encoding(all_text, result)

def check_skill_md(content: str, result: ValidationResult):
    """Valideert een SKILL.md bestand."""

    # Frontmatter aanwezig?
    if not content.startswith("---"):
        result.warn("Geen YAML frontmatter gevonden — voeg name, description en license toe")
    else:
        # Check frontmatter velden
        fm_end = content.find("---", 3)
        if fm_end > 0:
            frontmatter = content[3:fm_end]
            for field_name in ["name", "description"]:
                if f"{field_name}:" not in frontmatter:
                    result.warn(f"Frontmatter mist veld: '{field_name}'")
            if "license:" not in frontmatter:
                result.warn("Geen licentie opgegeven in frontmatter")

    # Minimale lengte
    if len(content) < 100:
        result.error(f"SKILL.md te kort ({len(content)} tekens) — voeg beschrijving en instructies toe")

    # Gevaarlijke patronen
    check_dangerous_patterns(content, result)
    check_blocked_domains(content, result)
    check_encoding(content, result)

    result.note(f"SKILL.md lengte: {len(content):,} tekens ✓")

def compute_checksum(filepath: Path) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        sha.update(f.read())
    return sha.hexdigest()[:16]

# ── VALIDEER BESTAND ──────────────────────────────────────────────────────────

def validate_file(filepath: Path) -> ValidationResult:
    result = ValidationResult()
    result.note(f"Bestand: {filepath}")

    if not filepath.exists():
        result.error(f"Bestand niet gevonden: {filepath}")
        return result

    check_file_size(filepath, result)

    content = filepath.read_text(encoding="utf-8", errors="replace")
    suffix = filepath.suffix.lower()

    if suffix == ".json":
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            result.error(f"Ongeldige JSON: {e}")
            return result

        # Lijst van componenten of een enkel component?
        if isinstance(data, list):
            result.note(f"Lijst met {len(data)} componenten gevonden")
            for i, item in enumerate(data):
                sub = ValidationResult()
                check_json_component(item, sub)
                for err in sub.errors:
                    result.error(f"Component #{i+1} ({item.get('id','?')}): {err}")
                for w in sub.warnings:
                    result.warn(f"Component #{i+1} ({item.get('id','?')}): {w}")
        elif isinstance(data, dict):
            check_json_component(data, result)
        else:
            result.error("JSON moet een object of lijst van objecten zijn")

    elif suffix == ".md" or filepath.name.upper() == "SKILL.MD":
        check_skill_md(content, result)

    else:
        result.warn(f"Onbekend bestandstype '{suffix}' — alleen .json en .md worden volledig gevalideerd")
        check_dangerous_patterns(content, result)
        check_blocked_domains(content, result)

    checksum = compute_checksum(filepath)
    result.note(f"SHA-256 (16): {checksum}")

    return result

# ── RAPPORTEER ────────────────────────────────────────────────────────────────

def print_report(filepath: Path, result: ValidationResult):
    status = "✅  GESLAAGD" if result.passed else "❌  MISLUKT"
    print(f"\n{'─'*56}")
    print(f"  {status}  —  {filepath.name}")
    print(f"{'─'*56}")

    if result.info:
        for msg in result.info:
            print(f"  ℹ  {msg}")

    if result.warnings:
        print()
        for msg in result.warnings:
            print(f"  ⚠  {msg}")

    if result.errors:
        print()
        for msg in result.errors:
            print(f"  ✗  {msg}")

    print()

# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Valideer Claude Library componenten")
    parser.add_argument("files", nargs="*", help="Bestanden om te valideren")
    parser.add_argument("--all", action="store_true", help="Valideer alle componenten in components.json")
    args = parser.parse_args()

    targets = []

    if args.all:
        comp_file = Path("components.json")
        if not comp_file.exists():
            print("❌  components.json niet gevonden")
            sys.exit(2)
        targets.append(comp_file)

    for f in args.files:
        targets.append(Path(f))

    if not targets:
        parser.print_help()
        sys.exit(2)

    all_passed = True
    for filepath in targets:
        result = validate_file(filepath)
        print_report(filepath, result)
        if not result.passed:
            all_passed = False

    print("═"*56)
    if all_passed:
        print("  ✅  Alle checks geslaagd — component mag worden toegevoegd")
    else:
        print("  ❌  Validatie mislukt — los bovenstaande fouten op")
    print("═"*56 + "\n")

    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
