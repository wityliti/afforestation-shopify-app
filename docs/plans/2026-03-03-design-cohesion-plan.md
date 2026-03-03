# Design Cohesion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the Shopify app's visual design with the main afforestation-app brand by introducing a shared CSS token system, reusable component wrappers, and consistent styling across all surfaces.

**Architecture:** Create a brand-tokens.css file as the single source of truth for colors, shadows, animation, and typography. Build three thin React wrapper components (StatCard, ActivityItem, BrandBanner) that combine Polaris primitives with brand styling. Replace all hardcoded inline styles across admin pages, the landing page, and Liquid theme extensions.

**Tech Stack:** Remix, React 18, Shopify Polaris v12, CSS Modules, Liquid (theme extensions)

---

### Task 1: Create Brand Token CSS File

**Files:**
- Create: `app/styles/brand-tokens.css`

**Step 1: Create the styles directory**

```bash
mkdir -p app/styles
```

**Step 2: Write the brand tokens file**

Create `app/styles/brand-tokens.css` with the full token system. This mirrors values from afforestation-app's `globals.css` and `design-tokens.ts`:

```css
/* ============================================
   Afforestation Brand Tokens
   Shared design system for Shopify app
   Source of truth: afforestation-app/globals.css
   ============================================ */

:root {
  /* === Brand Palette (from afforestation-app emerald scale) === */
  --brand-emerald-50: #ecfdf5;
  --brand-emerald-100: #d1fae5;
  --brand-emerald-200: #a7f3d0;
  --brand-emerald-300: #6ee7b7;
  --brand-emerald-400: #34d399;
  --brand-emerald-500: #10b981;
  --brand-emerald-600: #059669;
  --brand-emerald-700: #047857;
  --brand-emerald-800: #065f46;
  --brand-emerald-900: #064e3b;
  --brand-emerald-950: #022c22;

  /* === Semantic Colors === */
  --brand-primary: #2d5a27;
  --brand-primary-light: #3d7a37;
  --brand-primary-rgb: 45, 90, 39;
  --brand-accent: #f0fdf4;
  --brand-accent-medium: #dcfce7;
  --brand-accent-strong: #bbf7d0;
  --brand-surface: #fafafa;
  --brand-surface-hover: #f5f5f5;
  --brand-border: #e5e5e5;
  --brand-text-dark: #14532d;
  --brand-text-muted: #6b7280;
  --brand-co2-blue: #0ea5e9;
  --brand-orders-purple: #8b5cf6;

  /* === Warm Shadows (green-tinted, from afforestation-app) === */
  --shadow-warm: 0 1px 3px rgba(27, 67, 50, 0.06), 0 4px 16px rgba(27, 67, 50, 0.04);
  --shadow-warm-lg: 0 4px 12px rgba(27, 67, 50, 0.08), 0 12px 40px rgba(27, 67, 50, 0.06);
  --shadow-hover: 0 12px 40px -8px rgba(27, 67, 50, 0.12), 0 4px 12px -2px rgba(27, 67, 50, 0.06);
  --shadow-banner: 0 2px 8px rgba(45, 90, 39, 0.2);

  /* === Animation === */
  --ease-bouncy: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-normal: 0.35s;
  --duration-fast: 0.2s;

  /* === Typography === */
  --font-display: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* === Radius === */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 50%;
}

/* === Utility Classes (ported from afforestation-app globals.css) === */

/* Topographic line pattern background */
.topo-pattern {
  background-image: url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 200 Q100 180 200 200 T400 200' fill='none' stroke='%231B433210' stroke-width='1'/%3E%3Cpath d='M0 220 Q100 200 200 220 T400 220' fill='none' stroke='%231B433208' stroke-width='0.8'/%3E%3Cpath d='M0 180 Q100 160 200 180 T400 180' fill='none' stroke='%231B433208' stroke-width='0.8'/%3E%3Cpath d='M0 240 Q100 220 200 240 T400 240' fill='none' stroke='%231B433206' stroke-width='0.6'/%3E%3Cpath d='M0 160 Q100 140 200 160 T400 160' fill='none' stroke='%231B433206' stroke-width='0.6'/%3E%3Cpath d='M0 100 Q100 80 200 100 T400 100' fill='none' stroke='%231B433206' stroke-width='0.5'/%3E%3Cpath d='M0 300 Q100 280 200 300 T400 300' fill='none' stroke='%231B433206' stroke-width='0.5'/%3E%3C/svg%3E");
  background-size: 400px 400px;
}

/* Grain overlay for organic texture */
.grain-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

/* Dashboard card hover lift */
.dash-card {
  transition: transform var(--duration-normal) var(--ease-bouncy),
              box-shadow var(--duration-normal) var(--ease-bouncy);
}
.dash-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* Warm shadow utilities */
.shadow-warm {
  box-shadow: var(--shadow-warm);
}
.shadow-warm-lg {
  box-shadow: var(--shadow-warm-lg);
}

/* Animated ring pulse for live indicators */
@keyframes ring-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
}
.ring-pulse {
  animation: ring-pulse 2s ease-in-out infinite;
}

/* Stagger animation utilities */
.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.1s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.2s; }
.stagger-5 { animation-delay: 0.25s; }
.stagger-6 { animation-delay: 0.3s; }
```

**Step 3: Commit**

```bash
git add app/styles/brand-tokens.css
git commit -m "feat: add brand token CSS file with shared design system values"
```

---

### Task 2: Wire Tokens into Root Layout + Add Poppins Font

**Files:**
- Modify: `app/root.tsx`

**Step 1: Import brand-tokens.css and add Poppins font link**

In `app/root.tsx`, add the Poppins font `<link>` tag after the existing Inter font link, and import the brand tokens CSS file:

Add at the top of the file (after existing imports):
```tsx
import "./styles/brand-tokens.css";
```

Add inside `<head>`, after the Inter font `<link>` (line 24):
```html
<link
  href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

**Step 2: Verify the app still loads**

```bash
cd /Users/youthocrat/Desktop/Afforestation/afforestation-shopify-app && npm run dev
```

Open the app in browser, verify no visual regressions and Poppins loads in Network tab.

**Step 3: Commit**

```bash
git add app/root.tsx
git commit -m "feat: wire brand tokens CSS and Poppins font into root layout"
```

---

### Task 3: Create StatCard Component

**Files:**
- Create: `app/components/StatCard.tsx`
- Create: `app/styles/components/stat-card.module.css`

**Step 1: Create the CSS module**

```bash
mkdir -p app/styles/components
```

Create `app/styles/components/stat-card.module.css`:

```css
.card {
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  text-align: center;
  transition: transform var(--duration-normal) var(--ease-bouncy),
              box-shadow var(--duration-normal) var(--ease-bouncy);
  box-shadow: var(--shadow-warm);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.icon {
  font-size: 40px;
  margin-bottom: 8px;
  line-height: 1;
}

.sublabel {
  margin-top: 2px;
}
```

**Step 2: Create the StatCard component**

Create `app/components/StatCard.tsx`:

```tsx
import { Text } from "@shopify/polaris";
import styles from "../styles/components/stat-card.module.css";

interface StatCardProps {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  sublabel?: string;
}

export function StatCard({ icon, iconColor, value, label, sublabel }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.icon} style={{ color: iconColor }}>
        <i className={icon}></i>
      </div>
      <Text as="p" variant="heading2xl" fontWeight="bold">
        {value}
      </Text>
      <Text as="p" variant="bodyMd" tone="subdued">{label}</Text>
      {sublabel && (
        <Text as="p" variant="bodySm" tone="subdued">
          {sublabel}
        </Text>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/components/StatCard.tsx app/styles/components/stat-card.module.css
git commit -m "feat: add StatCard component with brand token styling"
```

---

### Task 4: Create ActivityItem Component

**Files:**
- Create: `app/components/ActivityItem.tsx`
- Create: `app/styles/components/activity-item.module.css`

**Step 1: Create the CSS module**

Create `app/styles/components/activity-item.module.css`:

```css
.item {
  padding: 12px 12px 12px 16px;
  background: var(--brand-surface);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 3px solid var(--brand-primary);
  transition: background var(--duration-fast) ease;
}

.item:hover {
  background: var(--brand-surface-hover);
}

.empty {
  padding: 24px;
  text-align: center;
  background: var(--brand-surface);
  border-radius: var(--radius-md);
}
```

**Step 2: Create the ActivityItem component**

Create `app/components/ActivityItem.tsx`:

```tsx
import { Text } from "@shopify/polaris";
import styles from "../styles/components/activity-item.module.css";

interface ActivityItemProps {
  description: string;
  date: string;
}

export function ActivityItem({ description, date }: ActivityItemProps) {
  return (
    <div className={styles.item}>
      <Text as="p" variant="bodyMd">{description}</Text>
      <Text as="p" variant="bodySm" tone="subdued">{date}</Text>
    </div>
  );
}

export function ActivityEmpty() {
  return (
    <div className={styles.empty}>
      <Text as="p" variant="bodyMd" tone="subdued">
        No recent activity yet. Trees will appear here once orders are placed.
      </Text>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/components/ActivityItem.tsx app/styles/components/activity-item.module.css
git commit -m "feat: add ActivityItem component with brand left-border accent"
```

---

### Task 5: Create BrandBanner Component

**Files:**
- Create: `app/components/BrandBanner.tsx`
- Create: `app/styles/components/brand-banner.module.css`

**Step 1: Create the CSS module**

Create `app/styles/components/brand-banner.module.css`:

```css
.banner {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-light) 100%);
  border-radius: var(--radius-lg);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  box-shadow: var(--shadow-banner);
}

.logoCircle {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  overflow: hidden;
  flex-shrink: 0;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logoImg {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.4;
}
```

**Step 2: Create the BrandBanner component**

Create `app/components/BrandBanner.tsx`:

```tsx
import { Text, InlineStack, Badge } from "@shopify/polaris";
import styles from "../styles/components/brand-banner.module.css";

interface BrandBannerProps {
  title: string;
  subtitle: string;
  isActive: boolean;
  logoSrc?: string;
}

export function BrandBanner({ title, subtitle, isActive, logoSrc = "/logo.png" }: BrandBannerProps) {
  return (
    <div className={styles.banner}>
      <InlineStack gap="300" blockAlign="center">
        <div className={styles.logoCircle}>
          <img src={logoSrc} alt="Afforestation" className={styles.logoImg} />
        </div>
        <div>
          <Text as="p" variant="bodyMd" fontWeight="bold">
            {title}
          </Text>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </InlineStack>
      {isActive && <Badge tone="success">Active</Badge>}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/components/BrandBanner.tsx app/styles/components/brand-banner.module.css
git commit -m "feat: add BrandBanner component with gradient and warm shadow"
```

---

### Task 6: Refactor Admin Dashboard — Replace Inline Styles

**Files:**
- Modify: `app/routes/app._index.tsx`
- Create: `app/styles/dashboard.module.css`

This is the largest task. It replaces all inline `style={{}}` objects in the dashboard with CSS module classes and component wrappers.

**Step 1: Create the dashboard CSS module**

Create `app/styles/dashboard.module.css`:

```css
.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.ruleCard {
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--brand-border);
  background: var(--brand-surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.ruleContent {
  flex: 1;
}

.toggle {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: background var(--duration-fast) ease;
  border: none;
  padding: 0;
}

.toggleEnabled {
  background: var(--brand-primary);
}

.toggleDisabled {
  background: #d1d5db;
}

.toggleKnob {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: #fff;
  position: absolute;
  top: 2px;
  transition: left var(--duration-fast) ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggleKnobOn {
  left: 22px;
}

.toggleKnobOff {
  left: 2px;
}

.impactTypeGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.impactTypeOption {
  cursor: pointer;
  padding: 12px;
  border-radius: var(--radius-md);
  text-align: center;
  transition: all var(--duration-fast) ease;
}

.impactTypeSelected {
  border: 2px solid var(--brand-primary);
  background: var(--brand-accent);
}

.impactTypeUnselected {
  border: 2px solid var(--brand-border);
  background: #fff;
}
```

**Step 2: Replace inline styles in `app/routes/app._index.tsx`**

At the top of the file, add imports:
```tsx
import { StatCard } from "../components/StatCard";
import { ActivityItem, ActivityEmpty } from "../components/ActivityItem";
import { BrandBanner } from "../components/BrandBanner";
import dashStyles from "../styles/dashboard.module.css";
```

**Replace the active rule banner** (lines ~554-589) with:
```tsx
{!settings.isPaused && (
  <BrandBanner
    title={`Afforestation.org | ${getActiveRuleSummary()} | Active`}
    subtitle="Fund verified tree-planting with every order"
    isActive={true}
  />
)}
```

**Replace the 3 stat card divs** (lines ~642-693) with:
```tsx
<div className={dashStyles.statsGrid}>
  <StatCard
    icon="fi fi-rr-tree"
    iconColor="var(--brand-primary)"
    value={impact.totalTreesPlanted.toLocaleString()}
    label="Trees Planted"
    sublabel={`$${(impact.totalTreesPlanted * settings.costPerTree).toFixed(2)} funded`}
  />
  <StatCard
    icon="fi fi-rr-cloud"
    iconColor="var(--brand-co2-blue)"
    value={impact.totalCo2OffsetKg.toLocaleString()}
    label="kg CO₂ Offset"
    sublabel={`≈ ${(impact.totalCo2OffsetKg / 1000).toFixed(1)} tonnes`}
  />
  <StatCard
    icon="fi fi-rr-shopping-cart"
    iconColor="var(--brand-orders-purple)"
    value={impact.totalOrders.toLocaleString()}
    label="Orders Contributing"
    sublabel={`$${estimatedCost.toFixed(2)} total impact`}
  />
</div>
```

**Replace activity items** (lines ~946-968) with:
```tsx
{recentActivity.length > 0 ? (
  <BlockStack gap="200">
    {recentActivity.slice(0, 10).map((item, i) => (
      <ActivityItem
        key={i}
        description={item.description}
        date={item.date}
      />
    ))}
  </BlockStack>
) : (
  <ActivityEmpty />
)}
```

**Replace rule card inline styles** (lines ~752-807). For each rule card div, replace the inline `style={{}}` with:
```tsx
<div className={dashStyles.ruleCard}>
```

Replace each toggle div's inline style with className-based approach:
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={() => updateRule(index, { enabled: !rule.enabled })}
  onKeyDown={(e) => e.key === "Enter" && updateRule(index, { enabled: !rule.enabled })}
  className={`${dashStyles.toggle} ${rule.enabled ? dashStyles.toggleEnabled : dashStyles.toggleDisabled}`}
>
  <div className={`${dashStyles.toggleKnob} ${rule.enabled ? dashStyles.toggleKnobOn : dashStyles.toggleKnobOff}`} />
</div>
```

**Replace impact type selector inline styles** (lines ~885-909):
```tsx
<div className={dashStyles.impactTypeGrid}>
  {[
    { id: "trees", icon: "🌳", label: "Trees", price: `$${settings.costPerTree}/tree` },
    { id: "carbon", icon: "☁️", label: "Carbon Removal", price: `$${settings.costPerKgCo2}/kg` },
    { id: "both", icon: "🌍", label: "Both", price: "Combined impact" },
  ].map((option) => (
    <div
      key={option.id}
      onClick={() => updateSetting("impactType", option.id)}
      className={`${dashStyles.impactTypeOption} ${settings.impactType === option.id ? dashStyles.impactTypeSelected : dashStyles.impactTypeUnselected}`}
    >
      <Text as="p" variant="bodySm" fontWeight="semibold">{option.label}</Text>
      <Text as="p" variant="bodySm" tone="subdued">{option.price}</Text>
    </div>
  ))}
</div>
```

**Step 3: Verify the dashboard renders correctly**

```bash
npm run dev
```

Open the dashboard in the Shopify admin. Verify:
- Stat cards show with hover lift effect
- BrandBanner renders with gradient
- Activity items have left green border
- Rule toggles work correctly
- Impact type selector highlights correctly

**Step 4: Commit**

```bash
git add app/routes/app._index.tsx app/styles/dashboard.module.css
git commit -m "refactor: replace dashboard inline styles with CSS modules and brand components"
```

---

### Task 7: Apply Brand Tokens to Widgets Page

**Files:**
- Modify: `app/routes/app.widgets.tsx`

**Step 1: Replace hardcoded colors with CSS variables**

In `app/routes/app.widgets.tsx`, do a find-and-replace for all inline style color values:

| Find | Replace with |
|------|-------------|
| `"#f0fdf4"` | `"var(--brand-accent)"` |
| `"#dcfce7"` | `"var(--brand-accent-medium)"` |
| `"#bbf7d0"` | `"var(--brand-accent-strong)"` |
| `"#2d5a27"` | `"var(--brand-primary)"` |
| `"#14532d"` | `"var(--brand-text-dark)"` |
| `"#16a34a"` | `"var(--brand-emerald-600)"` |
| `"#22c55e"` | `"var(--brand-emerald-500)"` |
| `"#15803d"` | `"var(--brand-emerald-700)"` |
| `"#fafafa"` or `"#f3f4f6"` | `"var(--brand-surface)"` |
| `"#e5e5e5"` or `"#9ca3af"` | `"var(--brand-border)"` |
| `"#0ea5e9"` | `"var(--brand-co2-blue)"` |
| `"#6b7280"` | `"var(--brand-text-muted)"` |
| `borderRadius: "12px"` | `borderRadius: "var(--radius-lg)"` |
| `borderRadius: "8px"` | `borderRadius: "var(--radius-md)"` |
| `boxShadow: "0 2px 8px rgba(0,0,0,0.08)"` | `boxShadow: "var(--shadow-warm)"` |

Keep `#fff`, `#111`, and opacity-based rgba values as-is (they're neutral).

**Step 2: Verify widgets page renders correctly**

```bash
npm run dev
```

Navigate to /app/widgets, verify all preview components look correct with no visual regressions.

**Step 3: Commit**

```bash
git add app/routes/app.widgets.tsx
git commit -m "refactor: replace hardcoded colors in widgets page with brand tokens"
```

---

### Task 8: Apply Brand Tokens to Additional Page

**Files:**
- Modify: `app/routes/app.additional.tsx`

**Step 1: Replace hardcoded values**

Replace inline style color references and border-radius values with CSS variables, same mapping as Task 7. The theme preset objects (Light, Dark, Ocean, Sunset, Forest) keep their hardcoded hex values since they represent user-facing theme choices stored in the database. Only replace the UI chrome around them:

- Preset card borders: replace `borderRadius: "12px"` with `var(--radius-lg)`
- Transition values: replace `"all 0.2s"` with `all var(--duration-fast) ease`
- Selected card border color should stay dynamic (uses `preset.colors.primary`)

**Step 2: Verify and commit**

```bash
npm run dev
# Navigate to /app/additional, verify preset cards render correctly
git add app/routes/app.additional.tsx
git commit -m "refactor: apply brand tokens to additional/customize page"
```

---

### Task 9: Apply Brand Tokens to Link Account Page

**Files:**
- Modify: `app/routes/app.link-account.tsx`

**Step 1: Replace the single hardcoded color**

Replace `"#2d5a27"` (used for check icon color) with `"var(--brand-primary)"`.

**Step 2: Commit**

```bash
git add app/routes/app.link-account.tsx
git commit -m "refactor: apply brand tokens to link-account page"
```

---

### Task 10: Align Landing Page with Main App Aesthetic

**Files:**
- Modify: `app/routes/_index/styles.module.css`
- Modify: `app/routes/_index/route.tsx`

**Step 1: Update CSS variables in styles.module.css**

Replace the `:root` block (around lines 1-15) to reference brand tokens and add Poppins:

```css
:root {
  /* Inherit from brand-tokens.css — override landing-page specifics here */
  --green-50: var(--brand-accent);
  --green-100: var(--brand-accent-medium);
  --green-200: var(--brand-accent-strong);
  --green-300: #86efac;
  --green-400: #4ade80;
  --green-500: #22c55e;
  --green-600: var(--brand-emerald-600);
  --green-700: var(--brand-emerald-700);
  --green-800: #166534;
  --green-900: var(--brand-text-dark);
  --ease-out-expo: var(--ease-out-expo);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
}
```

**Step 2: Apply Poppins to headings**

Find all heading selectors in `styles.module.css` (`.headline`, `.sectionTitle`, etc.) and add:
```css
font-family: var(--font-display);
```

**Step 3: Add topographic pattern to a background section**

Find the `.pageWrapper` or main container class and add:
```css
.pageWrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 200 Q100 180 200 200 T400 200' fill='none' stroke='%231B433210' stroke-width='1'/%3E%3Cpath d='M0 220 Q100 200 200 220 T400 220' fill='none' stroke='%231B433208' stroke-width='0.8'/%3E%3Cpath d='M0 180 Q100 160 200 180 T400 180' fill='none' stroke='%231B433208' stroke-width='0.8'/%3E%3C/svg%3E");
  background-size: 400px 400px;
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}
```

**Step 4: Add grain overlay to hero section**

Find the `.hero` or `.heroSection` class and add the grain overlay pseudo-element:
```css
.heroSection::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}
```

**Step 5: Replace remaining hardcoded colors**

Search for hex colors not covered by CSS variables and replace:
- `#0a1f0a` → keep (unique dark bg for landing page)
- `#fdfdfd` → keep (near-white, fine)
- Replace shadow values with `var(--shadow-warm)` and `var(--shadow-warm-lg)` where appropriate

**Step 6: Verify and commit**

```bash
npm run dev
# Open landing page, verify:
# - Poppins on headings
# - Topographic pattern visible as subtle background
# - Grain texture on hero
# - Colors match main app palette
git add app/routes/_index/styles.module.css app/routes/_index/route.tsx
git commit -m "feat: align landing page with main app aesthetic — Poppins, topo pattern, grain overlay"
```

---

### Task 11: Align Theme Extension Default Colors

**Files:**
- Modify: `extensions/impact-extension/blocks/impact_widget.liquid`
- Modify: `extensions/impact-extension/blocks/impact_banner.liquid`
- Modify: `extensions/impact-extension/blocks/impact_footer.liquid`
- Modify: `extensions/impact-extension/blocks/impact_page_section.liquid`
- Modify: `extensions/impact-extension/blocks/banner_embed.liquid`
- Modify: `extensions/impact-extension/blocks/footer_embed.liquid`

**Step 1: Update default values in Liquid schema settings**

For each Liquid file, find the `{% schema %}` JSON block and update color defaults to match brand tokens. The exact hex values must be used (Liquid doesn't support CSS variables in schema defaults):

| Setting | Old Default | New Default (brand-aligned) |
|---------|------------|----------------------------|
| `background_color` | `#f0fdf4` | `#f0fdf4` (same — already matches `--brand-accent`) |
| `text_color` | `#14532d` | `#14532d` (same — already matches `--brand-text-dark`) |
| `border_color` | `#bbf7d0` | `#bbf7d0` (same — matches `--brand-accent-strong`) |
| `primary_color` | `#2d5a27` | `#2d5a27` (same — matches `--brand-primary`) |

These already match! The main change is to **rename the CSS variables inside the Liquid `<style>` blocks** to use the `--brand-` prefix convention for consistency:

In each file's `<style>` block, rename:
- `--widget-bg` → `--brand-widget-bg`
- `--widget-border` → `--brand-widget-border`
- `--widget-text` → `--brand-widget-text`
- `--widget-primary` → `--brand-widget-primary`
- `--banner-bg` → `--brand-banner-bg`
- `--banner-text` → `--brand-banner-text`
- `--footer-primary` → `--brand-footer-primary`
- `--footer-bg` → `--brand-footer-bg`
- `--footer-border` → `--brand-footer-border`
- `--primary-color` → `--brand-section-primary`
- `--secondary-color` → `--brand-section-secondary`

Update all references within each file to match.

**Step 2: Verify extensions still work in theme editor**

```bash
npm run dev
```

Open a development store theme editor and verify each block renders correctly with the renamed variables.

**Step 3: Commit**

```bash
git add extensions/
git commit -m "refactor: align theme extension CSS variable naming to --brand- convention"
```

---

### Task 12: Final Verification and Cleanup

**Files:**
- All modified files

**Step 1: Search for remaining hardcoded colors in admin pages**

Search all `.tsx` files in `app/routes/` for remaining hardcoded hex colors that should use tokens:

```bash
grep -rn '#[0-9a-fA-F]\{6\}' app/routes/app.*.tsx
```

Replace any remaining instances with the appropriate CSS variable.

**Step 2: Run the full app and verify each surface**

```bash
npm run dev
```

Check each page:
- [ ] Admin dashboard — stat cards hover, banner gradient, activity items, toggles
- [ ] Widgets page — preview components use token colors
- [ ] Additional page — preset cards render correctly
- [ ] Link account page — accent colors correct
- [ ] Landing page — Poppins headings, topo pattern, grain overlay
- [ ] Theme extensions — render in theme editor

**Step 3: Run existing tests**

```bash
npm test
```

Verify all tests pass.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — remove remaining hardcoded colors"
```
