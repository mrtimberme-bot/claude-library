---
name: xcode-simulator-expert
description: Token-efficient Xcode simulator en build workflow. Gebruik bij alle simulator-interacties. Bespaart 90%+ tokens vs raw screenshot approach.
allowed-tools: Bash, Read
---

# Xcode Simulator Expert

## Principe: accessibility > screenshots

Standaard aanpak: screenshot → 1600-6300 tokens per interactie.
Dit skill's aanpak: accessibility tree → 10-50 tokens per interactie.

**96% tokenbesparing** op een typische development sessie.

## Build workflows

### Efficient build commando
In plaats van ruwe xcodebuild output (500+ regels), gebruik:
````bash
xcodebuild build \
  -scheme <scheme> \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=17.5' \
  -quiet | tail -20
````

Of nog beter met xcbeautify:
````bash
xcodebuild build \
  -scheme <scheme> \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=17.5' | xcbeautify
````

### Build success check
````bash
xcodebuild build ... 2>&1 | grep -E "(BUILD SUCCEEDED|error:|warning:)" | head -10
````

Output is 3-5 regels in plaats van honderden.

### Build error parse
Als build faalt, grep specifiek:
````bash
xcodebuild build ... 2>&1 | grep -B2 -A2 "error:" | head -30
````

## Simulator lifecycle

### List available
````bash
xcrun simctl list devices available | grep "iPhone 16"
````

### Boot simulator
````bash
xcrun simctl boot "iPhone 16 Pro"
open -a Simulator
````

### Install app
````bash
xcrun simctl install booted /path/to/MyApp.app
````

### Launch
````bash
xcrun simctl launch booted com.bundleid.app
````

### Logs (filter noise)
````bash
xcrun simctl spawn booted log stream \
  --predicate 'subsystem == "com.bundleid.app"' \
  --level debug | head -50
````

## UI interactie via accessibility

### Beter dan screenshot: dump accessibility tree
````bash
xcrun simctl io booted ui get
````

Geeft gestructureerd:
Button "Login" at (128, 400)
TextField "Email" at (64, 200)
Label "Welcome back" at (64, 100)

Dit is **semantisch** — robuust tegen UI changes.

### Semantische tap
In plaats van coordinate tap:
````bash
# BAD: fragile
xcrun simctl io booted tap 128 400

# GOOD: semantic (via UI test automation)
idb ui tap-el "Login"
````

### Text input
````bash
# Focus field via accessibility
idb ui tap-el "Email TextField"
# Type text
xcrun simctl io booted input text "test@example.com"
````

## Screenshots — alleen als echt nodig

Screenshots zijn duur (1600+ tokens). Gebruik alleen voor:
- Visuele verificatie van exact design match
- Bug reports van visuele issues
- Design review (hig-compliance skill)

Als screenshot nodig:
````bash
xcrun simctl io booted screenshot --compression=80 /tmp/shot.png
````

Compressie bespaart nog eens 30-50% tokens.

## Preview capture (voor SwiftUI)

In plaats van simulator boot + install + launch, gebruik Xcode Previews:
````bash
# Via MCP - Claude Code CLI
mcp__xcode__capture_preview <file.swift>
````

Veel sneller én token-efficient voor pure UI werk.

## Debugging patterns

### LLDB via MCP
````bash
mcp__XcodeBuildMCP__debug_attach <bundle-id>
````

Dan breakpoints, po commands, etc.

### Console logs filter
````bash
# Alleen errors van jouw app
log stream --predicate 'subsystem == "com.yours" AND category == "error"'
````

## Build cache strategieën

### Derived data reset (als build issues)
````bash
rm -rf ~/Library/Developer/Xcode/DerivedData/<ProjectName>-*
````

### Module cache reset
````bash
rm -rf ~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex
````

### Package resolution reset
````bash
xcodebuild -resolvePackageDependencies
````

## Output verwachting

Bij build task:
✓ Build SUCCESS (0 errors, 2 warnings)
Warnings:

ContentView.swift:42 - Initialization of immutable value 'x' was never used


Bij UI interactie:
✓ Tapped "Login" button
✓ Entered text in Email field
✓ Current screen: LoginView

**Geen screenshots tenzij gevraagd.** Altijd semantisch.
