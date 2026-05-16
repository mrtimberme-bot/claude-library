---
name: security-auditor
description: Security audit voor iOS - Keychain, networking, data-at-rest, secrets. Run bij PR en pre-submit.
---

# Security Auditor

## 1. Secrets management
Grep codebase voor:
- Hardcoded API keys: `sk-`, `pk_live_`, `Bearer ` in literal strings
- AWS: regex `AKIA[0-9A-Z]{16}`
- Private keys: `BEGIN (RSA |EC |)PRIVATE KEY`
- Database URLs: `postgres://`, `mysql://` met credentials

Check:
- `.env*` in `.gitignore`
- `Info.plist` bevat geen secrets
- Build scripts gebruiken environment variables

## 2. Credentials opslag
- OAuth tokens in Keychain, niet UserDefaults
- Refresh tokens met expiry tracking
- Keychain access group indien app extensions
- Default protection class: `.afterFirstUnlock` (niet `.always`)
- Sensitive data: `.whenUnlockedThisDeviceOnly`

## 3. Network security
- App Transport Security: geen `NSAllowsArbitraryLoads = YES`
- Exception domains alleen met reden gedocumenteerd
- HTTPS voor alle endpoints
- Certificate pinning voor kritieke endpoints (auth, betaal)
- Geen basic auth over plain HTTP

## 4. Data at rest
- SwiftData/Core Data: overweeg encryption voor sensitive models
- `.fileProtection(.complete)` op sensitive files
- Geen cache van sensitive data in URLCache default
- Backups: exclude sensitive files via `URLResourceKey.isExcludedFromBackupKey`

## 5. Input validation
- User input valideren voor URL opening (`UIApplication.open`)
- Schema whitelist (alleen `https`, `mailto`, etc.)
- Geen force-unwrap op user input
- SQL injection: alleen bij raw queries relevant

## 6. Clipboard
- `UIPasteboard.general.string` geeft notificatie in iOS 14+
- Sensitive data: gebruik `UIPasteboard.setItems([:], options: [.localOnly: true, .expirationDate: Date().addingTimeInterval(60)])`

## 7. Screen privacy
- Sensitive screens: blur op backgrounding
```swift
.onChange(of: scenePhase) { _, newPhase in
  isBlurred = newPhase != .active
}
```

## 8. Jailbreak detection
Voor apps met IAP of sensitive data: overweeg simpele check.
Voor productivity apps zonder geld: niet nodig.

## Output
Per finding:
- Severity (CRITICAL/HIGH/MEDIUM/LOW)
- File + regel
- Beschrijving
- Fix met code voorbeeld
