---
name: onboarding-designer
description: First-run onboarding flow design. Gebruik bij nieuwe app of major feature launch.
---

# Onboarding Designer

## Doel onboarding
Niet: uitleggen wat app doet.
WEL: gebruiker zo snel mogelijk naar eerste "aha" moment.

## Regels
- Max 3 schermen value prop
- Skip altijd mogelijk
- Geen account vereist voor trial (indien kan)
- Permissions pas vragen wanneer nodig
- Progress indicator bij >3 schermen

## 3-scherm framework
**Scherm 1: Probleem**
- "Ken je dit?" — visualiseer pijn
- Relateerbaar beeld
- Korte tekst (<20 woorden)

**Scherm 2: Oplossing**
- "Wij lossen dat zo op" — core value
- Visualisatie van functie
- 1 zin hoe

**Scherm 3: Quick win**
- "Probeer het" — directe actie
- Deep link naar core feature
- Geen account modal (dat komt later)

## Permission priming — kritiek
Vraag ALTIJD voor systeem dialog:

```swift
// BAD: direct UNUserNotificationCenter.current().requestAuthorization
// GOOD:
VStack {
  Image(systemName: "bell.badge")
  Text("Laat ons je herinneren")
  Text("Wij sturen je één keer per dag een korte reminder. Nooit spam.")
  Button("OK, zet meldingen aan") { requestActualPermission() }
  Button("Later") { /* proceed zonder */ }
}
```

Reden: als user "Don't Allow" tikt op systeem dialog, je krijgt nooit meer een tweede kans zonder Settings app.

## Permissions die priming verdienen
- Notificaties
- Locatie (altijd priming, nooit direct request)
- Camera (mag soms direct, bij clear context zoals "foto toevoegen")
- Contacten
- Microfoon
- HealthKit

## Permissions die geen priming nodig hebben
- Photo library picker (PHPicker — geen permission)
- Document picker

## Account creatie
- Alleen als noodzakelijk voor core functie
- Sign in with Apple verplicht aanbieden (App Store rule 4.8)
- Email/password alleen als nodig
- Guest mode overwegen

## Returning user detectie
```swift
@AppStorage("hasCompletedOnboarding") var hasCompletedOnboarding = false

if !hasCompletedOnboarding {
  OnboardingFlow()
} else {
  MainApp()
}
```

## What's new (post-update onboarding)
Na app update met significante wijziging:
- Kort modal, niet full-screen flow
- Max 3 highlights
- "Later" optie
- Alleen tonen 1x per version

## Output
- Flow diagram in tekst
- Screen specs per step
- Permission timing recommendations
- Code skeleton voor main flow
