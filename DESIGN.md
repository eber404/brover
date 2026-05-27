---
name: brover
description: Secure local env secrets manager for macOS
colors:
  void-navy: "#10161f"
  rift-edge: "#1d2b3f"
  signal-cyan: "#1fb6ff"
  abyss-bg: "#070b12"
typography:
  display:
    fontFamily: "'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif"
    fontWeight: 600
    lineHeight: 1.2
  headline:
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif"
    fontWeight: 400
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontFamily: "'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif"
    fontWeight: 500
    fontSize: "12px"
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal-cyan}"
    textColor: "#0a1628"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-primary-hover:
    backgroundColor: "#67d0ff"
  button-outline:
    backgroundColor: "rgba(15,23,42,0.70)"
    textColor: "#cbd5e1"
    borderColor: "{colors.rift-edge}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-destructive:
    backgroundColor: "rgba(127,29,29,0.30)"
    textColor: "#fca5a5"
    borderColor: "#f87171"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  input:
    backgroundColor: "#0f172a"
    textColor: "#e2e8f0"
    borderColor: "{colors.rift-edge}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "8px 12px"
  input-focus:
    ringColor: "{colors.signal-cyan}"
    ringWidth: "2px"
  card:
    backgroundColor: "rgba(2,6,14,0.40)"
    borderColor: "{colors.rift-edge}"
    rounded: "{rounded.md}"
    padding: "12px"
  dialog:
    backgroundColor: "#0d131d"
    borderColor: "{colors.rift-edge}"
    rounded: "{rounded.md}"
    shadow: "0 25px 50px -12px rgba(0,0,0,0.75)"
    padding: "20px"
  switch-off:
    backgroundColor: "#334155"
  switch-on:
    backgroundColor: "{colors.signal-cyan}"
  chip-enabled:
    backgroundColor: "rgba(16,185,129,0.12)"
    textColor: "#6ee7b7"
  chip-disabled:
    backgroundColor: "#1e293b"
    textColor: "#94a3b8"
---

# Design System: brover

## 1. Overview

**Creative North Star: "Terminal Night Ops"**

A dark, navy-grounded interface built for focused technical work. The palette draws from deep space and terminal aesthetics: inky void backgrounds, subtle rift-like borders, and a single cold-cyan signal color used only on elements that demand attention. No gradients as decoration, no glow for mood, no shine. Depth comes from tonal layering of semi-transparent surfaces.

The IBM Plex Sans type family reinforces the technical-preision tone without feeling generic or corporate. Information density is high but never cramped. Every interactive element earns its hover state.

**Key Characteristics:**
- Deep navy base with cold cyan accent for actionable signals only
- Flat layered surfaces, no shadows except elevated overlays
- IBM Plex Sans throughout, 1.25+ scale ratio between hierarchy steps
- Destructive actions carryrose-tinted treatment, not just iconography
- Radia gradient body background establishes depth without texture

### Named Rules
**The Signal Rule.** The cyan accent (#1fb6ff) appears on ≤10% of any screen. Its rarity is the point. It marks selection, focus, primary actions, and toggled states. Nothing else gets this color.

## 2. Colors

Deep navy-charcoal base with a single cold-cyan accent. No gradients, no glow, no shine.

### Primary
- **Signal Cyan** (#1fb6ff / oklch(72% 0.16 220)): Active/selected states, focus rings, primary button backgrounds, toggled switch wheels. Used sparingly per The Signal Rule.

### Neutral
- **Void Navy** (#10161f): Primary sidebar and panel backgrounds. The deepest surface.
- **Rift Edge** (#1d2b3f): All borders and dividers. Structural color, never decorative.
- **Abyss Background** (#070b12): Root body background. Radial gradient anchor.

### Dark Surface Variants
- **Slate 900** (rgba(15,23,42,0.70~0.95)): Input backgrounds, outline button fills, dropdown backgrounds.
- **Slate 950** (rgba(2,6,14,0.30~0.50)): Card backgrounds, hover surfaces on lists.
- **Slate 800** (rgba(30,41,59,0.95)): Selected item backgrounds, active states.

### Semantic
- **Emerald 300/600 tint**: Enabled app status chips (emerald-950/50 bg + emerald-300 text).
- **Rose 200/400/500/600 tint**: Destructive button text and borders, delete confirmation.

### Named Rules
**The Void Rule.** Background never uses pure black. Always tint toward the blue-black Abyss Navy (#070b12) or Void Navy (#10161f).

**The Edge Rule.** Borders are Rift Edge (#1d2b3f). Dividers and structural strokes use this color exclusively. Never use full-opacity white or black for borders.

## 3. Typography

**Font:** IBM Plex Sans (with Avenir Next and Segoe UI fallbacks)

**Character:** Technical and precise without sterility. Geometric enough to read cleanly at small sizes; humanist enough not to feel like a terminal emulator.

### Hierarchy
- **Display/H1** (600 weight, ~18px, lh 1.2): Space names in sidebar badge, dialog titles.
- **Headline** (500 weight, 14px, lh 1.4): Target row names, section headings, selected item names.
- **Title** (600 weight, 14px, lh 1.4): Button labels, panel headers.
- **Body**, default (400 weight, 14px, lh 1.5, max 75ch): Environment name labels, descriptions, all prose.
- **Label** (500 weight, 12px, lh 1.4, letter-spacing 0.02em): Status chips, badge text, metadata.

### Named Rules
**The Scale Discipline Rule.** Hierarchy through scale plus weight contrast (minimum 1.25 ratio). Avoid same-size elements with only color差异化.

## 4. Elevation

Flat layered surfaces. No shadows except on elevated overlays (dialogs, dropdowns, tooltips). Depth comes from tonal opacity on backgrounds, not from box-shadows.

### Shadow Vocabulary
- **Overlay shadow** (`shadow-2xl`): Dialogs and modals only. Value: 0 25px 50px -12px rgba(0,0,0,0.75).
- **Dropdown/toltip shadow** (`shadow-lg`): Context menus, color picker menus, name tooltips. Value: 0 10px 15px -3px rgba(0,0,0,0.40).
- **No shadow** (default): Cards, list items, inputs, buttons at rest. Flat.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only on elevated overlay elements (dialogs, dropdowns, tooltips). Cards, list items, and buttons never carry shadows.

## 5. Components

### Buttons
- **Style:** Rounded-lg (8px radius). IBM Plex Sans, 12px/500 weight, medium horizontal padding.
- **Primary:** Signal cyan bg, near-black text. Hover: lighter cyan (#67d0ff). Focus ring via accent color.
- **Outline:** Rift Edge border, semi-transparent slate-900 fill, slate-100 text. Hover: slightly lighter background.
- **Destructive:** Rose border (#f87171), rose-950/30 background, rose-200 text. Hover: rose-900/40 background.

### Chips / Status Pills
- **Style:** Fully rounded (pill shape), 10px font at 500 weight.
- **Enabled:** emerald-950/50 bg + emerald-300 text.
- **Disabled:** slate-800 bg + slate-400 text.

### Cards / Containers
- **Corner Style:** Rounded-xl (12px radius).
- **Background:** slate-950/40 (rgba(2,6,14,0.40)).
- **Border:** Rift Edge stroke.
- **Shadow Strategy:** None by default (Flat-By-Default Rule).
- **Internal Padding:** 12px.

### Inputs / Fields
- **Style:** 40px height, rounded-lg, Rift Edge border, slate-900 background, IBM Plex Sans 14px.
- **Focus:** Ring-2 in Signal Cyan. Border color does not change on focus.
- **Textarea:** Same treatment but variable height, min-height 80px.

### Dialog
- **Corner Style:** Rounded-xl.
- **Background:** Slate-tinted #0d131d.
- **Border:** Rift Edge stroke.
- **Shadow:** shadow-2xl.
- **Overlay:** Black 60% opacity backdrop.
- **Internal Padding:** 20px.

### Toggle Switch
- **Size:** 44px wide x 24px tall (w-11 h-6), fully rounded.
- **Off:** slate-700 bg.
- **On:** Signal Cyan bg.
- **Thumb:** 20px circle, slate-950, translates 20px on toggle.

### Navigation (Sidebar)
- **Space Badge Buttons:** 44px square, rounded-xl, selected/unselected border treatment.
- **Target Rows:** Rounded-md, color dot + name + delete on hover.
- **Context Menus:** Rift Edge border, shadow-lg, slate-950/95 background.

### Name Tooltips
- **Style:** Rift Edge border, shadow-lg, slate-950 background, 12px IBM Plex Sans.
- **Trigger:** Overflow ellipsis on target and space names.

## 6. Do's and Don'ts

### Do:
- **Do** use Signal Cyan only for selection, focus rings, primary CTA, and toggled states. Its scarcity is functional, not decorative.
- **Do** use rift-edge (#1d2b3f) for all borders and dividers. Structural color; never decorative.
- **Do** use semi-transparent backgrounds (slate-950/30 to slate-950/95) to establish layered depth. Flat-By-Default Rule.
- **Do** use shadow-2xl only on dialogs and overlays. All other surfaces are shadow-free.
- **Do** use emerald tints for enabled/success states and rose tints for destructive states.
- **Do** use IBM Plex Sans at all sizes. It is the singular type family.
- **Do** test interactive elements in dark mode. The dark palette is the product.

### Don't:
- **Don't** use `#000` or `#fff`. Tint every neutral toward the Abyss/Void hue.
- **Don't** use Signal Cyan as a decorative color or on large surface areas. The Signal Rule is absolute.
- **Don't** use gradient backgrounds on panels or cards. The body radial gradient is the only gradient; it is structural.
- **Don't** use glassmorphism, backdrop-blur, or frosted glass effects anywhere.
- **Don't** use side-stripe borders (border-left/right > 1px) as colored accent.
- **Don't** use gradient text. Use a single solid color for emphasis.
- **Don't** use hero-metric templates or identical card grids.
- **Don't** use modals as first thought. Dialogs are for confirmations and focused input, not navigation.
- **Don't** use em dashes in UI copy. Use commas, colons, semicolons, or periods.
