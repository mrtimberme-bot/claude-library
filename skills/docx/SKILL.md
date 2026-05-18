---
name: word-document-skill
description: Maakt en bewerkt .docx Word-documenten vanuit Claude
version: "1.0.0"
status: active
tags: [documenten, word, export]
---

# Word Document Skill

Maakt en bewerkt `.docx` Word-documenten vanuit Claude. Gebruik voor het genereren van rapporten, contracten, technische documentatie of andere gestructureerde tekst als een Word-bestand de gevraagde output is.

## Wanneer te gebruiken

Trigger bij: "maak een Word-document", "exporteer als .docx", "schrijf een rapport als Word-bestand".

Niet voor PDF, HTML of Google Docs output.

## Aanpak

1. Bepaal de gewenste structuur: koppen, paragrafen, lijsten, tabellen
2. Gebruik python-docx of vergelijkbaar voor generatie
3. Lever het bestand als download of pad op

## Beperkingen

- Geen rich media embedding (afbeeldingen, grafieken) zonder extra stap
- Stijlen zijn basis tenzij een template wordt meegegeven

