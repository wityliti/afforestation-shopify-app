# Design Cohesion: Aligning Shopify App with Afforestation Brand

**Date**: 2026-03-03
**Status**: Approved
**Approach**: CSS Variables + Shared Tokens (A) combined with Component Wrappers (B)

## Problem

The Shopify app uses hardcoded inline styles with no design tokens, resulting in a visual disconnect from the main afforestation-app. While both use the same green color family, the Shopify app lacks the organic warmth, consistent spacing, and cohesive brand feel.

## Constraints

- Must use Polaris components for admin pages (Shopify review requirement)
- Light-touch customization on Polaris — brand personality via custom elements only
- Remix framework, no Tailwind
- Must work within Shopify admin's iframe context
- Theme extensions must remain merchant-customizable

## Design

### 1. Brand Token System

Create `app/styles/brand-tokens.css` imported at root level:

**Palette** (from afforestation-app `design-tokens.ts` and `globals.css`):
- Emerald scale: `--brand-emerald-50` through `--brand-emerald-950`
- Semantic: `--brand-primary` (#2d5a27), `--brand-primary-light` (#3d7a37), `--brand-accent` (#f0fdf4)
- Surfaces: `--brand-surface` (#fafafa), `--brand-border` (#e5e5e5)

**Warm Shadows** (from afforestation-app):
- `--shadow-warm`: `0 1px 3px rgba(27,67,50,0.06), 0 4px 16px rgba(27,67,50,0.04)`
- `--shadow-warm-lg`: `0 4px 12px rgba(27,67,50,0.08), 0 12px 40px rgba(27,67,50,0.06)`
- `--shadow-hover`: `0 12px 40px -8px rgba(27,67,50,0.12), 0 4px 12px -2px rgba(27,67,50,0.06)`

**Animation**:
- `--ease-bouncy`: `cubic-bezier(0.22, 1, 0.36, 1)`
- `--duration-normal`: `0.35s`

**Typography**:
- `--font-display`: Poppins (headings, hero text)
- `--font-body`: Inter (body, UI text)

**Radius**:
- `--radius-sm`: 6px, `--radius-md`: 8px, `--radius-lg`: 12px

**Shared Utility Classes** (ported from afforestation-app `globals.css`):
- `.topo-pattern` — topographic SVG background
- `.grain-overlay` — subtle noise texture via SVG feTurbulence
- `.dash-card` — hover lift with warm shadow transition
- `.ring-pulse` — animated glow ring for live indicators
- `.shadow-warm`, `.shadow-warm-lg` — utility classes
- `.stagger-1` through `.stagger-6` — animation delay utilities

### 2. Component Wrappers

Three thin React components wrapping Polaris primitives + brand styling:

**`app/components/StatCard.tsx`**
- Props: `icon`, `iconColor`, `value`, `label`, `sublabel`
- Uses: Polaris `Text`, brand tokens for bg/border/shadow
- Hover: translateY(-2px) with `--shadow-hover` and `--ease-bouncy`
- Replaces 3 inline-styled stat divs in the dashboard

**`app/components/ActivityItem.tsx`**
- Props: `description`, `date`, `treesPlanted`
- Uses: Polaris `Text`, brand surface bg, left border accent
- Replaces repeated inline-styled activity rows

**`app/components/BrandBanner.tsx`**
- Props: `title`, `subtitle`, `isActive`, `logoSrc`
- Uses: Polaris `Text`, `InlineStack`, `Badge`
- Gradient from `--brand-primary` to `--brand-primary-light`
- Replaces the large inline-styled active rule banner

### 3. Page-by-Page Changes

**Admin Dashboard (`app._index.tsx`)**:
- Replace all inline `style={{}}` with CSS module classes (`dashboard.module.css`)
- Stat cards -> `<StatCard>` component
- Activity items -> `<ActivityItem>` component
- Top banner -> `<BrandBanner>` component
- Rule cards, impact selector, spending controls: keep Polaris, swap hardcoded colors for CSS vars
- Add warm shadow to Cards via CSS

**Widgets Page (`app.widgets.tsx`)**: Apply brand tokens to custom styling.

**Additional Page (`app.additional.tsx`)**: Apply brand tokens to theme preset cards, align defaults.

**Link Account Page (`app.link-account.tsx`)**: Apply brand tokens to accent colors.

**Landing Page (`_index/`)**:
- Import `brand-tokens.css` into `styles.module.css`
- Replace hardcoded colors with CSS variables
- Add Poppins font for headings
- Add topographic pattern background layer
- Add grain overlay on hero section
- Align green palette to main app's exact HSL values

**Theme Extensions (Liquid blocks)**:
- Update default color values in Liquid schema to match brand tokens
- Align CSS variable naming convention (`--brand-primary` etc.)
- No structural changes

**Root Layout (`root.tsx`)**:
- Import `brand-tokens.css` globally
- Add Poppins font link alongside existing Inter

## What This Does NOT Change

- Polaris component usage or structure
- Shopify App Bridge integration
- Any backend/API logic
- Theme extension merchant customization capabilities
- The overall layout and information architecture
