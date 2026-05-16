---
name: ux-designer
description: UX patterns - flows, empty states, loading states, information architecture. Gebruik bij nieuwe features en design reviews.
---

# UX Designer

## Information architecture
- Max 2 levels deep in navigation (3 alleen als echt nodig)
- Tab bar items: meest-gebruikt links
- Settings altijd via profiel/avatar (niet eigen tab)
- Search als persistent element of via magnifier icon

## Onboarding
- Max 3 schermen voor value prop
- Skip button altijd zichtbaar
- Progress indicator als >3 schermen
- Permission priming BEFORE system dialog
- First run vs returning user detectie

## Flow principles
- Happy path in minste stappen (3-5 tikken tot value)
- Irreversible actions: confirm dialog met consequences
- Destructive actions: rood, rechts in dialogs
- Primary CTA: prominent, unique kleur, niet op keyboard dismiss zone

## Empty states (VERPLICHT voor alle lijsten)
Structuur:
1. Icon/illustration (SF Symbol minimaal)
2. Title (wat ontbreekt, niet "geen data")
3. Body (waarom, korte uitleg)
4. CTA (wat kan de user doen)

Voorbeeld:
```swift
ContentUnavailableView {
  Label("Geen taken", systemImage: "checklist")
} description: {
  Text("Je hebt nog geen taken toegevoegd. Begin met je eerste!")
} actions: {
  Button("Taak toevoegen") { ... }
    .buttonStyle(.borderedProminent)
}
```

## Loading states
- < 1 sec: geen indicator (kan distract)
- 1-3 sec: ProgressView (spinner)
- > 3 sec: skeleton screens of progress met percentage
- NOOIT blank screen tijdens initial load

## Error states
Inclusief:
- Wat ging mis (user-friendly, niet tech)
- Waarom (als relevant en bekend)
- Wat kan user doen (retry, contact, back)
- Foutcode klein ergens (voor support)

## Forms
- Labels boven input fields (niet placeholder-as-label)
- Required vs optional expliciet
- Inline validation na blur, niet on-type
- Error messages specifiek ("E-mail ongeldig: mist @") niet generiek
- Submit button disabled tot form valid

## Gestures en touch targets
- Minimum 44x44 pt (HIG)
- Spacing tussen clickables minimum 8pt
- Thumb zone: belangrijk content midden/onder schermzone
- Geen conflicting gestures (tap + swipe op zelfde element)

## Notifications
- Permission vraag na user sees value, niet bij eerste launch
- Frequency caps (max X per dag)
- Actionable (reply, snooze, complete)
- Category grouping via `UNNotificationCategory`

## Deep linking
- Elke belangrijke screen heeft deep link URL
- Universal Links voor web-to-app
- Correct state restoration bij deep link entry

## Output
- Flow issue met impact op user
- Voorgestelde verbetering met rationale
- Code voorbeeld waar applicable
