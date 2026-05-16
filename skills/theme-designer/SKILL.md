---
name: theme-designer
description: Definieer unieke brand identity per app - kleuren, typografie, motion personality, haptic vocabulary. Gebruik bij nieuwe app setup en design refresh.
allowed-tools: Read, Write, Edit
---

# Theme Designer

Zorg dat elke app een **eigen karakter** heeft, geen generieke SwiftUI.

## Aanpak: bold aesthetic direction

Elke nieuwe app krijgt EXPLICIETE keuze uit:
- Brutally minimal
- Maximalist chaos
- Retro-futuristic
- Organic/natural
- Luxury/refined
- Playful/toy-like
- Editorial/magazine
- Brutalist/raw
- Art deco/geometric
- Soft/pastel
- Industrial/utilitarian

Ook combinaties mogelijk (bijv. "refined brutalism"). Maar altijd BOLD keuze.

## Design questionnaire

Voor elke nieuwe app, genereer deze vragen:

### 1. Feel
"Beschrijf in 3 woorden hoe je wilt dat deze app voelt:"
Voorbeelden:
- "Calm, focused, warm"
- "Energetic, playful, surprising"
- "Serious, precise, trustworthy"
- "Soft, nostalgic, personal"

### 2. Target gebruiker moment
"Wanneer op de dag gebruikt men dit? In welke stemming?"
- Morgen (energie nodig) → warme tonen, subtiele animaties
- Middag (productiviteit) → neutraal, weinig afleiding
- Avond (ontspanning) → donker, zacht, bouncy

### 3. Competitor aesthetic
"Welke bestaande app voelt NIET hoe deze zou moeten voelen? En welke app's vibe kom je dichtbij?"

Dit helpt oneiro identity te definiëren.

## Theme output format

Genereer `Modules/DesignSystem/Theme.swift`:

````swift
import SwiftUI

public enum Theme {

  // MARK: - Brand identity
  public static let feel = "Calm, focused, warm"
  public static let aestheticDirection = "Refined minimalism with organic warmth"

  // MARK: - Colors
  public enum Colors {
    // Primary brand
    public static let brand = Color("Brand") // asset catalog
    public static let brandLight = Color("BrandLight")
    public static let brandDark = Color("BrandDark")

    // Semantic
    public static let background = Color("Background")
    public static let surface = Color("Surface")
    public static let surfaceElevated = Color("SurfaceElevated")

    // Content
    public static let textPrimary = Color("TextPrimary")
    public static let textSecondary = Color("TextSecondary")
    public static let textTertiary = Color("TextTertiary")

    // Semantic states
    public static let success = Color("Success")
    public static let warning = Color("Warning")
    public static let error = Color("Error")
  }

  // MARK: - Typography
  public enum Typography {
    // Display - distinctive, memorable
    public static let display = Font.custom("Fraunces-Bold", size: 34)
      .width(.expanded)

    // Title - readable but characterful
    public static let title = Font.custom("Fraunces-Semibold", size: 28)

    // Headline - UI emphasis
    public static let headline = Font.system(size: 17, weight: .semibold, design: .rounded)

    // Body - SF Pro for maximum readability
    public static let body = Font.system(size: 17)
    public static let bodyEmphasized = Font.system(size: 17, weight: .semibold)

    // Caption
    public static let caption = Font.system(size: 13, weight: .medium)
    public static let footnote = Font.system(size: 12, weight: .regular)

    // Monospace for data
    public static let mono = Font.system(size: 14, design: .monospaced)
  }

  // MARK: - Spacing (4pt grid)
  public enum Spacing {
    public static let xxs: CGFloat = 2
    public static let xs: CGFloat = 4
    public static let sm: CGFloat = 8
    public static let md: CGFloat = 16
    public static let lg: CGFloat = 24
    public static let xl: CGFloat = 32
    public static let xxl: CGFloat = 48
    public static let xxxl: CGFloat = 64
  }

  // MARK: - Radius
  public enum Radius {
    public static let xs: CGFloat = 4
    public static let sm: CGFloat = 8
    public static let md: CGFloat = 12
    public static let lg: CGFloat = 16
    public static let xl: CGFloat = 24
    public static let pill: CGFloat = 999
  }

  // MARK: - Motion personality
  /// This app's motion DNA — all animations stem from these.
  public enum Motion {
    /// Micro-interactions (button press, toggle)
    public static let micro: Animation = .spring(response: 0.25, dampingFraction: 0.85)

    /// Standard UI (sheet, navigation)
    public static let standard: Animation = .spring(response: 0.4, dampingFraction: 0.8)

    /// Emphasized (celebration, achievement)
    public static let emphasized: Animation = .spring(response: 0.5, dampingFraction: 0.65)

    /// Soft, contemplative (slow reveal)
    public static let soft: Animation = .spring(response: 0.7, dampingFraction: 0.9)

    /// Reduce motion variant
    public static func respectful(_ animation: Animation) -> Animation? {
      // Use in views with @Environment(\.accessibilityReduceMotion)
      animation
    }
  }

  // MARK: - Haptic vocabulary
  /// App's haptic personality
  public enum Haptics {
    /// Subtle confirmation (toggle, selection)
    public static func light() {
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    /// Standard UI feedback (button tap)
    public static func medium() {
      UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    /// Important action (save, submit)
    public static func success() {
      UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    /// Warning or destructive
    public static func warning() {
      UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    /// Error state
    public static func error() {
      UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
  }

  // MARK: - Shadow
  public enum Shadow {
    public static let subtle = (color: Color.black.opacity(0.04), radius: CGFloat(4), y: CGFloat(1))
    public static let medium = (color: Color.black.opacity(0.08), radius: CGFloat(12), y: CGFloat(4))
    public static let large = (color: Color.black.opacity(0.12), radius: CGFloat(24), y: CGFloat(8))
  }
}
````

## Kleurenpalet generatie

Voor elke app, vraag de feel en genereer:

### Warm palette (calm, focused)
- Brand: `#D4A574` (warm amber)
- Background light: `#FDF8F3` (creme)
- Background dark: `#1C1814` (espresso)
- Accent: `#5C8A7D` (sage)

### Cool palette (serious, precise)
- Brand: `#2E5266` (deep teal)
- Background light: `#F7F9FB`
- Background dark: `#0F1419`
- Accent: `#E8B54B` (mustard)

### Playful palette (energetic)
- Brand: `#FF6B6B` (coral)
- Background light: `#FFF9F5`
- Background dark: `#1A0F1C` (plum-black)
- Accent: `#4ECDC4` (turquoise)

Altijd contrast checken:
- Text primary op background: WCAG AA (4.5:1) minimum
- Brand op background: min 3:1

## Typography pairing

Vermijd generieke combi's. Kies intentioneel:

### Refined minimal
- Display: Fraunces (serif met karakter)
- Body: SF Pro

### Editorial
- Display: Playfair Display
- Body: Inter

### Playful
- Display: Clash Display
- Body: SF Pro Rounded

### Industrial
- Display: Space Grotesk
- Body: SF Mono voor data, SF Pro voor content

### Warm/organic
- Display: Fraunces (met variable axes)
- Body: Sohne (of SF Pro)

## Asset Catalog setup

Elke kleur als Color Set met light + dark variant:
Colors.xcassets/
Brand.colorset/
Any Appearance: HEX
Dark Appearance: HEX
Background.colorset/
...

## Motion personality rules

Bepaal EEN van deze als app-signature:
- **Crisp**: snel, dampingFraction .85+ (serieus, productief)
- **Bouncy**: playful, dampingFraction .6-.7 (fun, kinder)
- **Soft**: traag, response .5+ (contemplatief, wellness)
- **Precise**: linear voor mechanica, spring voor UI (industrial)

Niet mixen! Een app heeft één motion personality.

## Output bij design kickoff

Schrijf naar `docs/design/brand-identity.md`:
````markdown
# [App Naam] - Brand Identity

## Feel
[3 woorden]

## Aesthetic direction
[Gekozen richting]

## Color palette
- Brand: #HEX
- Background: light #HEX, dark #HEX
- ...

## Typography
- Display: [font]
- Body: [font]
- ...

## Motion personality
[crisp/bouncy/soft/precise]

## Haptic vocabulary
[Wanneer welke haptic]

## Inspiration references
[Screenshots, links]

## Competitor differentiation
[Hoe onderscheiden we ons]
````

En `Modules/DesignSystem/Theme.swift` met alle tokens.

## Belangrijk

Geen **Inter, Roboto, Arial, generic system fonts** als display. Geen **purple gradients on white**. Geen **cookie-cutter material design**. Elke app moet herkenbaar zijn.
