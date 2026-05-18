---
name: pdf-skill
description: Leest, analyseert en extraheert inhoud uit PDF-bestanden
version: "1.0.0"
status: active
tags: [pdf, analyse, extractie, ocr]
---

# PDF Skill

Leest, analyseert en extraheert inhoud uit PDF-bestanden. Ondersteunt tekst extractie, samenvatting, data mining en het beantwoorden van vragen over de inhoud van PDFs — inclusief gescande documenten via OCR.

## Wanneer te gebruiken

Trigger bij: "lees deze PDF", "vat dit document samen", "extraheer data uit dit PDF", "beantwoord vragen over dit bestand".

Voor meerdere PDFs tegelijk: noem elk bestandspad expliciet.

## Aanpak

1. Lees de volledige PDF of de gevraagde paginas
2. Identificeer structuur: koppen, secties, tabellen, figuren
3. Beantwoord de vraag op basis van de gelezen inhoud

## Beperkingen

- Gescande PDFs zonder OCR-laag kunnen niet worden gelezen
- Zeer grote PDFs (100+ paginas): verwerk per sectie

