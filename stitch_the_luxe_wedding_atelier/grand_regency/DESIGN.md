---
name: Grand Regency
colors:
  surface: '#fff7fb'
  surface-dim: '#e2d7e1'
  surface-bright: '#fff7fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf0fb'
  surface-container: '#f6eaf5'
  surface-container-high: '#f1e5f0'
  surface-container-highest: '#ebdfea'
  on-surface: '#1f1a21'
  on-surface-variant: '#4c454a'
  inverse-surface: '#352e36'
  inverse-on-surface: '#f9edf8'
  outline: '#7d757b'
  outline-variant: '#cec3cb'
  surface-tint: '#6e576d'
  primary: '#140516'
  on-primary: '#ffffff'
  primary-container: '#2d1b2e'
  on-primary-container: '#9a8199'
  inverse-primary: '#dabed8'
  secondary: '#775a19'
  on-secondary: '#ffffff'
  secondary-container: '#fed488'
  on-secondary-container: '#785a1a'
  tertiary: '#0a0a08'
  on-tertiary: '#ffffff'
  tertiary-container: '#21211f'
  on-tertiary-container: '#8a8885'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f7daf4'
  primary-fixed-dim: '#dabed8'
  on-primary-fixed: '#271528'
  on-primary-fixed-variant: '#554055'
  secondary-fixed: '#ffdea5'
  secondary-fixed-dim: '#e9c176'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4201'
  tertiary-fixed: '#e5e2de'
  tertiary-fixed-dim: '#c8c6c2'
  on-tertiary-fixed: '#1c1c1a'
  on-tertiary-fixed-variant: '#474744'
  background: '#fff7fb'
  on-background: '#1f1a21'
  surface-variant: '#ebdfea'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.15em
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 32px
  margin-desktop: 80px
  margin-mobile: 24px
---

## Brand & Style

The design system embodies the "Grand Regency" aesthetic—a fusion of classical opulence and contemporary editorial flair. It is tailored for a high-end wedding planning experience, targeting a clientele that values exclusivity, dramatic elegance, and meticulous detail.

The visual language draws heavily from **High-Contrast / Bold** editorial layouts and **Minimalism**. It prioritizes extreme white space to allow high-resolution photography and exquisite typography to breathe. The emotional response is one of "quiet luxury"—sophisticated, authoritative, and deeply romantic, reminiscent of a bespoke invitation or a luxury fashion house's digital flagship.

## Colors

The palette is anchored by the interplay of deep shadows and luminous highlights.

- **Primary (Midnight Plum):** Used for primary text, deep-tone backgrounds, and high-impact UI elements to provide weight and drama.
- **Secondary (Burnished Gold):** Applied as an accent for calls-to-action, delicate borders, and iconography to denote luxury and "the golden touch."
- **Background (Soft Parchment):** The primary canvas. It provides a warmer, more sophisticated feel than pure white, evoking high-quality stationery.
- **Neutral:** A muted plum-grey used for secondary labels and metadata to maintain legibility without breaking the monochromatic harmony.

## Typography

This design system utilizes a sharp typographic hierarchy to mirror a luxury magazine.

- **Headlines:** Use **Playfair Display**. Large sizes should use tight letter spacing and high-contrast weights to emphasize the serif's elegance.
- **UI & Body:** Use **Manrope**. It provides a clean, airy contrast to the dramatic headlines. 
- **Labels:** Small labels and overlines should always be in uppercase with generous letter spacing to evoke a sense of professional curation and architectural order.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** on desktop to maintain an editorial "locked-in" feel, transitioning to a flexible fluid model on mobile. 

- **Rhythm:** An 8px base unit drives all spacing. 
- **White Space:** Be intentionally generous. Vertical sections should have at least 120px of padding on desktop to signify premium positioning.
- **Alignment:** Use asymmetrical layouts for image galleries but keep functional UI elements strictly aligned to the 12-column grid.

## Elevation & Depth

Depth in this design system is subtle and atmospheric, avoiding heavy shadows in favor of light and material layering.

- **Tonal Layers:** Use Soft Parchment for the base and pure white for elevated "cards" or containers.
- **Shadows:** Use extremely diffused, low-opacity shadows (e.g., `0px 20px 40px rgba(45, 27, 46, 0.05)`). The shadow color should be a tinted version of Midnight Plum rather than black.
- **Gradients:** Use very soft linear gradients for Gold elements to simulate a "metallic sheen" rather than a flat color.
- **Borders:** Depth is often defined by 0.5px "hairline" borders in Burnished Gold (#C5A059) or a lightened Plum tint.

## Shapes

The design system employs **Sharp (0)** edges to convey a sense of formal precision and timelessness. Rectilinear forms mimic the edges of premium cardstock and high-fashion editorial frames. 

In select cases where interactivity must be softened (such as user avatars), use a circular crop, but all structural containers and buttons must remain sharp-edged.

## Components

### Buttons
- **Primary:** Midnight Plum background, White text, 0px radius. On hover, the border becomes Burnished Gold.
- **Secondary:** Transparent background, 1px Burnished Gold border, Midnight Plum text.
- **Tertiary:** Text-only in Label-Caps style with a thin Gold underline that expands on hover.

### Forms
- **Input Fields:** Bottom-border only (hairline style) in Midnight Plum. On focus, the border transitions to 1.5px Burnished Gold with a very subtle Soft Parchment background fill.
- **Labels:** Use `label-caps` typography, positioned above the input.

### Cards
- **Editorial Card:** Sharp edges, no border, Soft Parchment background. Content is centered with generous internal padding.
- **Interactive Card:** White background with a 1px Gold border and the "Ambient Shadow" defined in the Elevation section.

### Additional Components
- **Date Picker:** Should resemble a classic calendar grid with delicate serif numbers and Gold highlights for the selected date.
- **Navigation:** A minimal top bar with centered branding and `label-caps` links, using a slight "frosted parchment" backdrop blur when scrolling.