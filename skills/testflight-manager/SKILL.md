---
name: testflight-manager
description: TestFlight beheer vanuit Claude Code — upload builds, voeg testers toe en check de status van actieve betas. Gebruikt Fastlane pilot + App Store Connect API. Vereist geconfigureerde ASC API key.
allowed-tools: Bash, Read, WebFetch
---

# TestFlight Manager

## Vereisten

Controleer altijd eerst of de omgeving correct is geconfigureerd:

```bash
# Vereiste env vars
echo $APP_STORE_CONNECT_API_KEY_ID      # bijv. ABC123DEF
echo $APP_STORE_CONNECT_API_ISSUER_ID   # UUID
echo $APP_STORE_CONNECT_API_KEY_PATH    # pad naar .p8 bestand

# Fastlane beschikbaar?
which fastlane || gem install fastlane
```

Als een van de vars ontbreekt → stop en instrueer de gebruiker:

> "Stel eerst je App Store Connect API key in:
> `export APP_STORE_CONNECT_API_KEY_ID=...`
> `export APP_STORE_CONNECT_API_ISSUER_ID=...`
> `export APP_STORE_CONNECT_API_KEY_PATH=/pad/naar/AuthKey_*.p8`
> Zie: appstoreconnect.apple.com → Users and Access → Integrations → App Store Connect API"

---

## Commando's

### `/testflight-upload` — Build archiveren en uploaden

**Flow:**

1. Detecteer het Xcode project/workspace in de huidige map
2. Vraag naar scheme als niet duidelijk
3. Archive + export + upload

```bash
# Stap 1: Archive
xcodebuild archive \
  -workspace "MijnApp.xcworkspace" \
  -scheme "MijnApp" \
  -configuration Release \
  -archivePath "build/MijnApp.xcarchive" \
  -allowProvisioningUpdates

# Stap 2: Export IPA
xcodebuild -exportArchive \
  -archivePath "build/MijnApp.xcarchive" \
  -exportPath "build/export" \
  -exportOptionsPlist "ExportOptions.plist"

# Stap 3: Upload naar TestFlight
fastlane pilot upload \
  --ipa "build/export/MijnApp.ipa" \
  --skip_submission true \
  --skip_waiting_for_build_processing true \
  --changelog "$(git log --oneline -5 | head -1)"
```

**ExportOptions.plist template** (maak aan als niet aanwezig):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>JOUW_TEAM_ID</string>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
```

**Na upload:**
- Toon build nummer en versie
- Meldt dat Apple verwerking ~5-30 minuten duurt
- Stel voor: `fastlane pilot builds` om status te checken

---

### `/testflight-add` — Tester toevoegen

**Gebruik:** `/testflight-add tester@email.com [groepnaam]`

Als geen groepnaam opgegeven → voeg toe aan default groep.

```bash
# Tester toevoegen aan specifieke groep
fastlane pilot add \
  --email "tester@email.com" \
  --first_name "Voornaam" \
  --last_name "Achternaam" \
  --groups "Beta Testers"

# Meerdere testers tegelijk (komma-gescheiden)
fastlane pilot add \
  --email "tester1@email.com,tester2@email.com" \
  --groups "Beta Testers"

# Beschikbare groepen opvragen
fastlane pilot builds
```

**Alternatief via App Store Connect API (als Fastlane niet werkt):**
```bash
# JWT token genereren en tester toevoegen via REST API
# Gebruik: https://api.appstoreconnect.apple.com/v1/betaTesters
```

**Na toevoeging:**
- Bevestig: "✓ tester@email.com toegevoegd aan [groep]"
- Informeer: tester ontvangt uitnodigingsmail van Apple
- Tester moet TestFlight-app installeren en uitnodiging accepteren

---

### `/testflight-status` — Overzicht actieve betas

**Toont:**
- Actieve builds per groep
- Aantal testers per groep
- Vervaldatum builds (90 dagen na upload)
- Recente crashlogs (als beschikbaar)

```bash
# Alle actieve builds
fastlane pilot builds

# Lijst van testers
fastlane pilot list

# Gedetailleerde info over specifieke build
fastlane pilot builds --app_identifier "com.jouw.app"
```

**Output formatteren als:**
```
TestFlight Status — [App naam]
─────────────────────────────────
Actieve builds:
  v2.1.0 (build 47) — 23 testers — verloopt 2024-08-15
  v2.0.5 (build 43) — 8 testers  — verloopt 2024-07-30

Groepen:
  Internal (5 testers) — automatische distributie: aan
  Beta Testers (26 testers) — automatische distributie: uit

Recente crashes: [of 'geen crashes in laatste 7 dagen']
```

---

## Veelgemaakte problemen

| Probleem | Oorzaak | Fix |
|---|---|---|
| `No suitable application records were found` | App nog niet aangemaakt in ASC | Maak app aan in App Store Connect |
| `Missing compliance` | Export compliance niet ingevuld | Voeg `ITSAppUsesNonExemptEncryption = NO` toe aan Info.plist |
| `Invalid toolchain` | Xcode command line tools ontbreken | `xcode-select --install` |
| `Authentication failed` | Verkeerde Key ID of verlopen key | Controleer env vars, hermaak key in ASC |
| Build zichtbaar maar niet testbaar | Apple verwerkt nog | Wacht 5-30 min, check met `fastlane pilot builds` |
| Tester ontvangt geen mail | Uitnodiging in spam of Apple throttling | Check ASC → TestFlight → testers, stuur opnieuw |

---

## Fastlane lane (optioneel)

Voor herhaald gebruik, voeg toe aan `fastlane/Fastfile`:

```ruby
lane :beta do |options|
  # Increment build number
  increment_build_number(
    build_number: latest_testflight_build_number + 1
  )
  
  # Build
  build_app(
    workspace: "MijnApp.xcworkspace",
    scheme: "MijnApp",
    configuration: "Release"
  )
  
  # Upload
  upload_to_testflight(
    skip_waiting_for_build_processing: true,
    changelog: options[:changelog] || "Bug fixes en verbeteringen"
  )
  
  # Notify
  puts "✓ Build #{lane_context[SharedValues::BUILD_NUMBER]} geüpload naar TestFlight"
end
```

Aanroepen: `fastlane beta changelog:"Nieuwe feature X toegevoegd"`
