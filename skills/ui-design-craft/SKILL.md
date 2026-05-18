---
name: ui-design-craft
description: Creates distinctive, production-grade UI for HTML/CSS/JS and iOS/SwiftUI. Use when asked to design, build, or improve interfaces, screens, components, or pages. Commits to a bold aesthetic direction before writing code — no generic AI aesthetics.
version: "1.0.0"
status: active
tags: [design, html, css, ios, swiftui, ui, frontend]
---

# UI Design Craft

Produces visually striking, production-grade interfaces for both **HTML/CSS/JS** and **iOS/SwiftUI**. The quality bar is share-worthy: could appear in an App Store feature or on a design portfolio.

**Synthesised from:** Anthropic frontend-design, Ilm-Alan aesthetic anchors, UI/UX Pro Max accessibility standards, twostraws SwiftUI-pro, vabole/ios-ui-craft.

---

## Before Any Code

Four questions — answer them before touching the editor:

1. **Platform** — HTML/CSS/JS, React, SwiftUI, or mixed?
2. **Purpose** — What problem does this solve? Who uses it?
3. **Tone** — Pick one: calm/serene · playful/energetic · premium/refined · utilitarian · editorial · brutalist · warm/organic · cold/technical
4. **Differentiator** — What is the one thing a user will remember?

**Rule:** Choose a clear conceptual direction and execute it with full precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

---

## Aesthetic Anchors

Pick one anchor per project. Hybridising anchors is a category error. Nothing is left to default.

| Anchor | Palette | Typography | Texture / Motion |
|--------|---------|-----------|-----------------|
| **Swiss** | White surface, one accent | Sans-serif, strict grid | Visible grid lines, no decoration |
| **Industrial** | Black bg, semantic signals | Monospace, flat borders | Hard edges, zero animation |
| **Brutalist** | Primary colour clash | System fonts mixed deliberately | Hard shadows, native controls |
| **Aurora Maximalist** | Dark + mesh gradients | Oversized variable display type | Spring-physics motion |
| **Retro-Futuristic** | Deep black + neon pair | Period display font | CRT scanlines or chromatic aberration |
| **Organic** | Earth tones | Humanist serifs | Grain (feTurbulence), 16–32 px radii |
| **Lo-Fi** | Paper-yellow | Mixed system fonts | Rotated 2–8°, halftone |
| **Editorial** | 2–3 strong brand colours | Display font + body contrast | Staggered reveals, large white space |

Token fidelity: the rendered output must stay within the anchor's range.

---

## Universal Anti-Patterns

Never do these — they are hallmarks of generic AI output:

| Anti-Pattern | Instead |
|---|---|
| Inter / Roboto / Arial everywhere | Distinctive display font + refined body pairing |
| Purple/indigo gradient on white | Contextual, committed palette — dominant + sharp accent |
| White card rectangles with drop shadow | Context-specific containers with personality |
| Evenly distributed colours | One dominant colour, sharp accent, neutral base |
| Placeholder lorem ipsum | Real or clearly authored content only |
| Emoji as design elements | SF Symbols (iOS), custom SVG or icon font (web) |
| Generic tab bars with no personality | Custom styling, meaningful icons |
| Glass on every surface | Glass only for controls / navigation layer — never obscures content |

---

## HTML / CSS / JS

### Typography
- Pair a **distinctive display font** with a **refined body font**
- Load via Google Fonts or system font stack — never Arial/Inter as primary
- Set a clear hierarchy: display → heading → subheading → body → caption

### Colour
- Declare a `--color-primary`, `--color-accent`, `--color-surface`, `--color-text` in `:root`
- Dominant colour + sharp accent outperforms timid palettes
- Minimum **4.5:1 contrast ratio** for normal text (WCAG AA)

### Motion
- Prefer CSS-only animations
- One well-orchestrated page load (staggered `animation-delay`) > scattered micro-interactions
- Use `prefers-reduced-motion` media query to disable animations

### Performance
- Images: WebP or AVIF, lazy-loaded
- CLS < 0.1 — reserve space for images and fonts
- Font loading: `font-display: swap`

### Implementation
```css
:root {
  --color-primary: /* committed choice */;
  --color-accent:  /* sharp contrast */;
  --color-surface: /* base background */;
  --color-text:    /* high-contrast text */;
  --font-display:  'YourDisplayFont', serif;
  --font-body:     'YourBodyFont', sans-serif;
  --radius:        /* anchor-specific */;
}
```

---

## iOS / SwiftUI

### Defaults
- Deployment target: **iOS 26**
- Language: **Swift 6.2**, modern concurrency (`async/await`, `Actor`)
- Avoid UIKit unless explicitly requested
- No third-party frameworks without asking

### Typography
```swift
// Display impact
Text("Dashboard")
    .font(.largeTitle.bold())
    .foregroundStyle(.primary)

// Brand identity (when context warrants)
Text("Premium")
    .font(.custom("NewYork-Bold", size: 32))

// Secondary information
Text("Last updated 5 min ago")
    .font(.subheadline)
    .foregroundStyle(.secondary)
```

Hierarchy: `largeTitle` → `title` → `headline` → `body` → `subheadline` → `caption`

### Colour & Dark Mode
- Design **dark first**, then adapt to light — dark mode produces more distinctive results
- Use semantic colours: `.primary`, `.secondary`, `.background`, `.tint`
- One dominant tint, applied with purpose

### Motion
- Spring animations are the default: `.bouncy`, not `.easeInOut`
- Morph between states — don't swap
- Add haptics to every meaningful interaction

```swift
.animation(.bouncy, value: isExpanded)
let impact = UIImpactFeedbackGenerator(style: .medium)
impact.impactOccurred()
```

### Liquid Glass (iOS 26+)
- Glass **frames content** — never obscures it
- Glass for: navigation layer, floating controls, toolbars
- Do not glass the content layer

### The Three Principles
| Principle | Rule |
|-----------|------|
| **Hierarchy** | Controls float above content. Glass frames, never obscures. |
| **Harmony** | Concentric corners matching device hardware. Fluid gestures. |
| **Consistency** | Same identity, adapted expression across iPhone, iPad, Mac. |

---

## Quality Checklist

Before marking UI complete:

**Accessibility**
- [ ] Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
- [ ] Touch targets ≥ 44×44pt (iOS) / 44px (web)
- [ ] All interactive elements keyboard-navigable
- [ ] VoiceOver / ARIA labels on icon-only controls
- [ ] `prefers-reduced-motion` respected

**Visual**
- [ ] Typography hierarchy is clear without colour
- [ ] Colour is intentional — not distributed evenly
- [ ] Motion serves content, not distraction
- [ ] No placeholder text or fake data in final output

**iOS specific**
- [ ] No deprecated API (check `foregroundColor` → `foregroundStyle`, etc.)
- [ ] Dark mode tested
- [ ] Screenshot looks share-worthy

**Web specific**
- [ ] CLS < 0.1
- [ ] Images use WebP/AVIF with explicit dimensions
- [ ] Fonts load with `font-display: swap`

---

## Iteration Loop

### Web
1. Implement in HTML/CSS
2. Open in browser — does it look share-worthy?
3. If not: identify the weakest element (typography? colour? spacing?) and fix it
4. Repeat until proud

### iOS
```bash
xcrun simctl io booted screenshot /tmp/ui.png && sips --resampleHeightWidthMax 1800 /tmp/ui.png
```
1. Build → screenshot
2. Evaluate: could this appear on Apple's App Store feature page?
3. If not: fix and screenshot again
4. Ship only when the answer is yes
