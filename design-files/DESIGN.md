---
name: Monochrome Precision
colors:
  surface: '#fdf8f8'
  surface-dim: '#ddd9d9'
  surface-bright: '#fdf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f2'
  surface-container: '#f1edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#47464a'
  inverse-surface: '#313030'
  inverse-on-surface: '#f4f0ef'
  outline: '#78767b'
  outline-variant: '#c8c5ca'
  surface-tint: '#5f5e60'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1d'
  on-primary-container: '#858386'
  inverse-primary: '#c8c6c8'
  secondary: '#5d5e66'
  on-secondary: '#ffffff'
  secondary-container: '#e3e1ec'
  on-secondary-container: '#63646c'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1f1a1a'
  on-tertiary-container: '#8a8282'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e1e4'
  primary-fixed-dim: '#c8c6c8'
  on-primary-fixed: '#1c1b1d'
  on-primary-fixed-variant: '#474649'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c6c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#ebe0df'
  tertiary-fixed-dim: '#cec4c4'
  on-tertiary-fixed: '#1f1a1a'
  on-tertiary-fixed-variant: '#4c4545'
  background: '#fdf8f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  h1-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  scale: '{''xs'': ''4px'', ''sm'': ''8px'', ''md'': ''16px'', ''lg'': ''24px'', ''xl'':
    ''32px'', ''2xl'': ''48px'', ''3xl'': ''64px''}'
---

## Brand & Style

This design system is built on a foundation of **Minimalism** and **Utility**, heavily inspired by the "shadcn/ui" philosophy of providing a clean, unopinionated canvas for high-density productivity. The brand personality is disciplined, neutral, and precise. It targets professional environments—SaaS, developer tools, and financial dashboards—where clarity and speed of information processing are paramount. 

The aesthetic avoids visual noise and vibrant distractions, relying on a strict grayscale palette to establish hierarchy. The emotional response is one of calm efficiency and structural integrity. Every element exists for a functional purpose, utilizing whitespace not just for "breathing room" but as a deliberate tool for grouping and separation.

## Colors

The palette is strictly monochromatic. High-contrast black (`#09090B`) is reserved for primary actions, critical text, and active states. Surfacing relies on subtle shifts between white (`#FFFFFF`) and very light grays (`#F9FAFB`, `#F4F4F5`) to define different functional areas without the need for heavy shadows or borders.

Status and confidence indicators are represented through grayscale intensity rather than hue. High confidence or "Success" states utilize solid black or dark charcoal, while low confidence or "Inactive" states use muted grays. This ensures the UI remains accessible and maintains its professional, restrained character. Semantic naming is used throughout to facilitate a seamless transition to a future dark mode.

## Typography

The design system uses **Inter** exclusively to ensure a clean, systematic look that excels in data-rich environments. The scale is intentionally tight and compact to maximize information density. 

Letter spacing is slightly reduced for headings to create a "locked-in" editorial feel. Body text defaults to 14px for standard interfaces, optimized for readability in professional dashboards. Weight is used as the primary tool for hierarchy—using Semibold (600) and Bold (700) to pull attention toward headings and labels while keeping the actual font sizes modest.

## Layout & Spacing

This design system utilizes a **Fixed Grid** approach for internal content containers to maintain a structured, organized appearance, while allowing outer sections to remain fluid. The layout rhythm is based on a 4px baseline unit, ensuring all components and spacing values are multiples of 4.

On desktop, a 12-column grid is standard with 16px gutters. For mobile, the grid collapses to 4 columns with 16px side margins. Padding within components like cards and inputs is kept tight (typically 8px or 12px) to support high-density layouts common in productivity software.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** and **Low-Contrast Outlines** rather than dramatic shadows. Surfaces are stacked using the semantic `muted` and `background` colors. 

- **Level 0 (Base):** The main background (`#FFFFFF`).
- **Level 1 (Surface):** Slight gray surfaces (`#F9FAFB`) for sidebars or secondary content areas.
- **Level 2 (Popovers/Modals):** White surfaces with a very soft, subtle shadow (blur 8-16px, opacity 4-8% black) and a 1px border in `#E4E4E7`.

This approach ensures the UI feels flat and architectural, emphasizing the content over the container.

## Shapes

The shape language is disciplined and geometric. A `roundedness` of **1** (0.25rem / 4px) is the standard for most UI elements. This provides a subtle softening of the interface without veering into the "bubbly" aesthetic of consumer-facing apps.

- **Buttons & Inputs:** 4px radius.
- **Cards & Modals:** 8px radius (`rounded-lg`).
- **Checkboxes:** 2px radius to maintain a sharp, technical appearance.

## Components

### Buttons
- **Primary:** Solid black (`#09090B`) with white text. High contrast, sharp focus.
- **Secondary:** Light gray background (`#F4F4F5`) with black text.
- **Outline:** Transparent background with a 1px border (`#E4E4E7`).
- **Ghost:** Transparent background, text only, background appears on hover.

### Input Fields
Inputs use a 1px border (`#E4E4E7`). On focus, the border transitions to black or gains a subtle ring. Placeholder text uses `muted-foreground`.

### Chips & Tags
Small, 12px text, 4px radius. Usually light gray with dark text. For "Active" tags, use solid black with white text.

### Cards
White background, 1px border (`#E4E4E7`), and a small 8px radius. No shadow unless the card is draggable or floating.

### Lists
Dense list items (32-40px height) with 1px bottom separators. Hover states use the `accent` color (`#F4F4F5`).

### Checkboxes & Radios
Consistent with the 4px grid. Checkboxes use a small 2px radius; Radios remain circular. Both use black for the "checked" state.