You are a senior design systems engineer and UI architect. Your task is to build **NexUI** — a modern, open-source CSS/JS component framework that is a spiritual successor to Bootstrap, but designed for the SaaS era.

---

## 🎯 GOAL

Produce a single self-contained `nexui.html` file that serves as both the **framework stylesheet + JS runtime** and a **living documentation page** showcasing every component. Think Bootstrap's docs page, but the design system itself is modern, opinionated, and elegant.

---

## 🎨 DESIGN TOKENS — ENFORCE THESE STRICTLY

### Color Palette
--nu-bg:          #0a0b0f       /* near-black canvas /

--nu-surface:     #12141a       / card/panel surface /

--nu-surface-2:   #1c1f2a       / elevated surface /

--nu-border:      #2a2d3a       / subtle borders /

--nu-accent:      #6c63ff       / primary violet /

--nu-accent-2:    #00d4aa       / teal green for success/secondary */

--nu-danger:      #ff4d6a

--nu-warning:     #ffb020

--nu-text:        #e8eaf0

--nu-text-muted:  #6b7280

--nu-glass:       rgba(255,255,255,0.04)

### Typography
- Display: `'Plus Jakarta Sans'` — weights 600, 700, 800
- Body: `'Inter'` — weights 400, 500
- Mono: `'JetBrains Mono'` — for code, badges, labels
- Scale: `xs: 11px / sm: 13px / base: 15px / lg: 17px / xl: 22px / 2xl: 30px / 3xl: 42px`

### Spacing System
4px base unit: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`

### Border Radius
`--nu-radius-sm: 6px / --nu-radius: 10px / --nu-radius-lg: 16px / --nu-radius-xl: 24px / --nu-radius-full: 9999px`

### Elevation / Shadow
--nu-shadow-sm:  0 1px 3px rgba(0,0,0,0.4)

--nu-shadow:     0 4px 16px rgba(0,0,0,0.5)

--nu-shadow-lg:  0 12px 40px rgba(0,0,0,0.6)

--nu-glow:       0 0 24px rgba(108,99,255,0.35)

---

## 🧩 COMPONENTS TO BUILD

### 1. Layout System
- **12-column CSS Grid** with `.nu-grid`, `.nu-col-{n}`, responsive breakpoints (sm/md/lg/xl)
- **Flexbox utilities**: `.nu-flex`, `.nu-items-center`, `.nu-justify-between`, `.nu-gap-{n}`
- **Container**: `.nu-container` with max-width 1280px, auto margins
- **Stack**: `.nu-stack` vertical flex with gap
- **Divider**: `.nu-divider` — subtle horizontal rule with optional label in center

### 2. Typography
- `.nu-display`, `.nu-h1`–`.nu-h6`, `.nu-body`, `.nu-caption`, `.nu-overline`
- `.nu-gradient-text` — accent-to-teal gradient on text
- `.nu-code` — inline code style with monospace
- `.nu-muted` — muted text color
- `.nu-lead` — larger intro paragraph style

### 3. Buttons (ALL MUST LOOK PREMIUM)
- `.nu-btn` base class + modifiers:
  - `.nu-btn-primary` — violet with subtle glow on hover
  - `.nu-btn-secondary` — teal outline
  - `.nu-btn-ghost` — transparent, border on hover
  - `.nu-btn-danger` — red
  - `.nu-btn-glass` — glassmorphism surface button
  - `.nu-btn-icon` — square icon-only button
- Sizes: `.nu-btn-sm / .nu-btn-lg`
- States: loading spinner (`.nu-btn-loading`), disabled
- **NEW ELEMENT**: `.nu-btn-glow` — button with pulsing ambient glow animation

### 4. Cards
- `.nu-card` — base dark surface card
- `.nu-card-glass` — frosted glass with backdrop-filter blur
- `.nu-card-gradient` — top border accent gradient
- `.nu-card-interactive` — hover lift + glow effect
- **NEW ELEMENT**: `.nu-card-stat` — metric card with large number, label, and trend badge
- **NEW ELEMENT**: `.nu-card-feature` — icon + title + description layout for feature grids

### 5. Forms
- `.nu-input`, `.nu-textarea`, `.nu-select` — styled dark inputs with focus glow
- `.nu-input-group` — input with prefix icon or suffix button
- `.nu-label` — field labels
- `.nu-form-hint` — helper text below input
- **NEW ELEMENT**: `.nu-search` — full search bar with icon + keyboard shortcut badge (⌘K)
- `.nu-toggle` — custom toggle switch (CSS only, no JS needed)
- `.nu-checkbox`, `.nu-radio` — custom styled

### 6. Navigation
- `.nu-navbar` — sticky top nav with glass blur background
- `.nu-sidebar` — vertical nav with active states
- `.nu-breadcrumb` — with separator
- `.nu-tabs` — underline tab style (JS-powered tab switching)
- **NEW ELEMENT**: `.nu-command-palette` — fullscreen overlay search (⌘K trigger)
- `.nu-pagination`

### 7. Feedback & Status
- `.nu-badge` — pill badge, variants: default/success/danger/warning/info
- **NEW ELEMENT**: `.nu-badge-dot` — small colored dot with label (live indicator style)
- `.nu-alert` — info/success/warning/danger banners
- `.nu-toast` — bottom-right notification (JS-powered, auto-dismiss)
- `.nu-progress` — progress bar with gradient fill
- `.nu-skeleton` — animated shimmer loading placeholder
- **NEW ELEMENT**: `.nu-status-bar` — multi-step progress indicator (like Stripe's onboarding)

### 8. Data Display
- `.nu-table` — styled dark table with hover rows
- `.nu-table-sortable` — with sort icons
- **NEW ELEMENT**: `.nu-data-grid` — dense, spreadsheet-like grid
- **NEW ELEMENT**: `.nu-kpi-row` — horizontal row of 4 KPI cards (SaaS dashboard staple)

### 9. Overlays
- `.nu-modal` — centered modal with backdrop (JS-powered)
- `.nu-drawer` — right-side slide-in panel (JS-powered)
- `.nu-tooltip` — CSS-only hover tooltips (top/bottom/left/right)
- `.nu-popover` — JS-powered popover with arrow

### 10. NEW CUSTOM ELEMENTS (no Bootstrap equivalent)

These are your signature additions — design them carefully:

#### `.nu-spotlight`
A hero section device: dark background with a radial gradient "spotlight" emanating from behind the heading. Perfect for SaaS landing heroes.

#### `.nu-orbit`
A decorative element: concentric rings with floating icon nodes orbiting a center element. CSS animation only.

#### `.nu-command`
A Mac-style command key `<kbd>` element styled beautifully: `⌘K`, `Ctrl+S`, etc.

#### `.nu-chip`
Removable tag/filter chip with an ×. Variants: default, accent, outline.

#### `.nu-timeline`
Vertical event timeline with dot markers, dates, and content cards.

#### `.nu-meter`
Circular progress ring (SVG-based) showing a percentage. Used for scores, usage stats.

#### `.nu-gradient-border`
A wrapper that applies an animated gradient border using `border-image` or pseudo-element trick.

#### `.nu-avatar` & `.nu-avatar-group`
User avatars with fallback initials, online indicator dot, and overlapping group variant.

#### `.nu-notification-dot`
Absolutely positioned notification indicator (number or plain dot) for overlaying on icons.

#### `.nu-marquee`
Horizontal scrolling logo/content strip (CSS animation, no JS). For "trusted by" sections.

---

## 📄 DOCUMENTATION PAGE STRUCTURE

The HTML page must render as a full documentation site:
HEADER

NexUI logo (nu- prefix, violet accent)
Tagline: "The Design System for Modern SaaS"
GitHub star button mock + version badge

SIDEBAR NAV (sticky, scrollspy-linked)

Getting Started
Design Tokens
Layout
Typography
Buttons
Cards
Forms
Navigation
Feedback
Data Display
Overlays
New Elements

MAIN CONTENT

Each section:

- Section heading (h2) + description

- Live rendered example in a .nu-demo-box (dark surface)

- Code snippet below in <pre><code> with syntax-highlight styling
FOOTER

"Built with NexUI" + MIT license note


---

## ⚙️ JAVASCRIPT REQUIREMENTS

Include a small vanilla JS block at the bottom that powers:
- **Tabs**: clicking `.nu-tab` activates its panel
- **Modal**: `.nu-modal-trigger` opens `.nu-modal`, close on backdrop click or ✕
- **Drawer**: same pattern
- **Toast**: `NexUI.toast(message, type)` global function
- **Scrollspy**: highlights active sidebar link based on scroll position
- **Theme tokens**: all in `:root` CSS vars so theming is one `data-theme` attribute swap

---

## ✅ QUALITY CONSTRAINTS

- **Zero external dependencies** except Google Fonts CDN
- **Dark mode only** — this is the primary theme (SaaS tools live in dark mode)
- **Fully responsive** — must work at 375px mobile width
- **Accessible** — focus rings, aria labels on interactive elements, sufficient contrast
- **Performance** — no unused CSS bloat; keep the whole thing under 1500 lines of CSS
- **Single file** — everything in one `.html` file: `<style>` + HTML + `<script>`

---

## 🚀 SIGNATURE AESTHETIC

The one thing NexUI must be remembered for: **Luminous Depth**.

Every interactive element should feel like it's lit from within — buttons glow on hover, cards have a subtle inner light on focus, the background has depth through layered surfaces. Achieve this through:
- `box-shadow` with colored (violet/teal) glow variants
- Subtle `background: radial-gradient(...)` on hero sections
- `backdrop-filter: blur()` on glass surfaces
- `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)` on all interactive states

No flat, lifeless UI. Every hover state must feel intentional and alive.

---

Build the complete file now. Start with the `<style>` block containing all tokens and component styles, then the full HTML documentation page, then the `<script>` block.