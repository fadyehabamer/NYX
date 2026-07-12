# NYX vs Bootstrap — Roadmap Reality-Check & Fixes

> A grounded audit of the *NYX vs Bootstrap Competitive Improvement Roadmap* against
> what the codebase (v1.0.3) **actually ships today**. Produced by inventorying the real
> CSS/JS with file-level evidence, then correcting the roadmap's assumptions and
> re-prioritizing the work that remains.
>
> **One-line verdict:** The roadmap is directionally right but **overstates the gap**.
> Component coverage and CSS depth are far more complete than the doc implies. The real,
> load-bearing gaps are narrower and mostly in **JS API *shape*** and **developer-experience
> tooling** (TypeScript, token export) — not in "table stakes people can't switch without."

---

## Progress log

**Shipped & verified** (build idempotent · 162/162 tests · behavioral + tsc + CSSOM checks):

- ✅ **TypeScript defs** — new `nyx.d.ts` (full UMD types for the public `Nyx` API); wired `types` field + `exports` condition + `files` in `package.json`. *(was #2)*
- ✅ **Programmatic tab/collapse control** — `Nyx.showTab(target)` and `Nyx.toggleCollapse(target)` exported (selector-or-element). *(closes the "programmatic control" JS gap partway)*
- ✅ **Dark-mode cheap wins** — `color-scheme` on both token blocks (native controls follow theme) + `setTheme('auto')` follows OS `prefers-color-scheme` and live-syncs.
- ✅ **Thmanyah font on the Arabic page** — `build.js` now links the self-hosted `fonts/thmanyah.css` in the Arabic pipeline (the `data-font="thmanyah"` attribute was set but the `@font-face` file was never loaded, so it silently fell back to IBM Plex Sans Arabic).
- ✅ **Forms gap-fill** — control sizing (`nyx-input-sm/lg`, `nyx-select-sm/lg`, `nyx-textarea-sm/lg`) + `:disabled` / `[readonly]` styling. *(part of #A3)*
- ✅ **Grid gap-fill** — `nyx-container-fluid` + breakpoint containers (`-sm/-md/-lg/-xl`) + column offsets (`nyx-offset-0..11`, line-based so RTL-correct). *(part of #4)*
- ✅ **z-index utilities** — `nyx-z-0..50` + `nyx-z-auto`. *(part of #A2)*
- ✅ **JS instance API (overlays)** — `Nyx.getInstance()` / `getOrCreateInstance()` returning `{ el, show(), hide(), toggle(), dispose() }`, auto-detecting modal/drawer/sheet vs popover. *(#1, part 1)*
- ✅ **Cancelable lifecycle events (additive, non-breaking)** — modal/drawer/sheet/popover now emit `nyx:<type>-before-show` / `-before-hide` (**cancelable** — `preventDefault()` aborts) and `-shown` / `-hidden` (after transition). Existing `-show` / `-hide` still fire after, unchanged. `preventDefault` is honored on instance calls, data-attribute triggers, `closeAll()`, backdrop click, and Esc. *(#1, part 1)*
- ✅ **Instance API + cancelable lifecycle extended to tabs / collapse / dropdown / carousel** *(#1, complete)*:
  - `getOrCreateInstance` now auto-detects collapse (trigger), dropdown (`.nyx-dropdown` or trigger), and tab (trigger) — all `{ show, hide, toggle, dispose }` (tabs support `show()` only).
  - New exports `Nyx.toggleDropdown()` (joins `showTab` / `toggleCollapse`); `toggleCollapse`/`toggleDropdown` gained a `force` arg internally.
  - New cancelable events: `nyx:collapse-before-show/-before-hide` (+ `-shown`/`-hidden`), `nyx:dropdown-before-show/-before-hide` (+ `-shown`/`-hidden`), `nyx:tab-before-show`, `nyx:before-slide` (carousel). All existing `-show`/`-hide`/`-slide` events unchanged.
- ✅ **Thmanyah preload** — the two above-the-fold faces (Sans 400, Serif Display 700) are `<link rel="preload">`ed in the Arabic build so the font swaps before first paint instead of flashing the fallback.
- ✅ **Responsive utilities + config-driven generator** *(#3, the Tailwind defense)*:
  - New `UTILITIES` config in `build.js` (+ `buildResponsiveUtilities`) generates **412 breakpoint-utility classes** — spacing (m/p + logical sides), `mx-auto`, `gap`, `display`, `text-align`, `flex-direction`, `justify-content`, `align-items` — across `sm`/`md`/`lg`/`xl`, into a marked auto-generated block in the UTILITIES section. Pattern: `nyx-<prop>-<bp>-<value>` (e.g. `nyx-m-md-4`, `nyx-d-lg-flex`, `nyx-justify-xl-between`). All logical-property/RTL-aware.
  - Base utilities stay hand-authored; only breakpoint variants are generated. Add a config row + rebuild → new utilities. Ships in every dist file (`nyx.css`, `nyx.min.css`, bundle, `components/utilities.css`). Generation is deterministic → CI drift check passes.

- ✅ **Forms #A3 finished** — styled native file input (`nyx-file-input` via `::file-selector-button`, distinct from the `.nyx-file` display card) + form layout helpers (`nyx-form-row` horizontal label|control at ≥md with `--nyx-label-w`, `nyx-form-inline`). *(#A3 complete)*
- ✅ **Zero-dependency floating engine** *(#5 — the "no Popper" win)* — `Nyx.position(anchor, floating, { placement, offset, padding })`: pins `floating` (position:fixed) by an anchor, **flips** to the opposite side on overflow, **shifts** along the cross axis to stay in view, sets `data-nyx-placement`, and returns `{ top, left, placement }`. Placement is `<side>[-<align>]` with `start`/`end` **logical (RTL-aware)**. Fully typed. 9/9 collision-math tests pass. *(Standalone primitive — existing CSS-positioned popovers/tooltips/dropdowns are unchanged; they can opt in next.)*

- ✅ **Floating engine wired into dropdowns & popovers (opt-in)** — add `data-nyx-float="[placement]"` to a `.nyx-dropdown` / `.nyx-popover` and its menu/panel is positioned by `position()` on open (flip + shift), repositioned on scroll/resize, and reset on close. **Opt-in ⇒ components without the attribute are byte-for-byte unchanged** (verified). Turns the primitive into a demonstrable, collision-aware feature.

- ✅ **Design-token JSON export** *(section B5 — unlocks the Figma-kit pitch)* — `build.js` parses the `:root` blocks from `nyx.css` and emits `tokens.json`: W3C-Design-Tokens-flavored (`$value`/`$type` + `cssVar`), grouped by category (color, radius, shadow, fontSize, spacing, fontFamily, easing), with `dark`/`light` themes and all 4 accents. **49 dark tokens** + light overrides. Consumable by Style Dictionary & Figma token plugins. Exported via `package.json` (`nyx-css/tokens.json`, `nyx-css/tokens`). Derived → stays in sync, drift-safe.
- ✅ **Figma token bridge** (`tokens.figma.json`) — same tokens in **Tokens Studio for Figma** format (sets: dark/light/violet/emerald/rose/amber, `$metadata.tokenSetOrder`, TS types color/borderRadius/spacing/fontSizes/fontFamilies). Import via the Tokens Studio plugin → Figma variables + color/text/radius styles. This is the actual "tokens → Figma" path (the Figma MCP is read-only and can't author a kit).

- ✅ **Carousel imperative API** — `Nyx.carousel(el)` → `{ el, next(), prev(), to(index), dispose() }` (wraps, clamps `to()`, chainable, honors cancelable `nyx:before-slide`, `dispose()` stops autoplay). Typed. 13/13 tests. *(completes JS imperative control for every component)*
- ✅ **Bootstrap→NYX migration codemod + cheat sheet** *(section D — the #1 adoption lever)* — `tools/migrate.js`: one source-of-truth map (exact + pattern rules) drives both a **codemod** (`node tools/migrate.js --write <files>`: rewrites `class="…"` tokens + `data-bs-*`→`data-nyx-*`, `offcanvas`→`drawer`, flags no-1:1 classes for review) and a **generated `MIGRATION.md`** cheat sheet (wired into `build.js`, drift-safe). Physical→logical spacing (`ml-*`→`ms-*`). `npm run migrate`. 8 dedicated tests (suite now **170**).

- ✅ **State-variant utilities** (`hover:` / `focus:`) — generator now also emits **36** state classes: `nyx-hover:<util>` / `nyx-focus:<util>` (colon escaped in the selector) for bg, text-color, shadow, border, rounded, opacity. `focus:` uses `:focus-visible`. Same config-driven, drift-safe pipeline; escaped-colon selectors verified via CSSOM.

**Still open** (all optional / nice-to-have): a small floating-engine demo on the landing page · framework wrappers (`@nyx/react`, `@nyx/vue`) · shadcn-style `npx nyx add` CLI · a Bootswatch-style prebuilt-theme gallery.

## Verdict

The roadmap's headline claim — *"the gap is grid/utilities depth and JS-API completeness"* — is **half right**:

- **Component coverage** and **a11y** are already done (and strong). Not gaps.
- **Grid** and **forms** have a solid core with a few real, additive holes.
- The genuinely load-bearing gaps are **JS API shape** (instance API + cancelable lifecycle + floating engine), **responsive utilities + a generator**, and **TypeScript defs**.

---

## Reality-check on the roadmap's Section A ("table stakes")

| Roadmap "gap" | Actual state | Reality |
|---|---|---|
| **A6. Component coverage vs Bootstrap** | **21/21 present** — offcanvas (as drawer/sheet), skeletons, scrollspy (IntersectionObserver), toasts, popovers, tooltips, list/button group, all of it | ✅ **Already done.** Not a gap. Plus ~10 components Bootstrap *doesn't* have (charts, backgrounds, hijri, commerce, command palette). |
| **A7. A11y hardening** | Focus trap + restore, `inert` backdrop, roving tabindex, Esc, rich `aria-*`, dialog semantics | ✅ **Already a strength**, not a gap. Genuinely strong. |
| **A3. Forms parity** | Validation styling, input groups, floating labels, custom check/radio/switch/slider/select all exist | 🟡 **Mostly there.** Real holes: no input sizing (sm/lg), no disabled/readonly control styling, file input is display-only, no JS validation wiring, no horizontal-form layout. |
| **A1. Grid** | Responsive col suffixes (4 tiers), order, col-auto, auto-fit grid, logical-property containers | 🟡 **Solid core, real holes:** no offsets, no `g-*` gutter API, no `container-fluid`/breakpoint containers, no `xxl` tier, CSS-grid only (no flexbox row-grid). |
| **A2. Utilities API** | Rich spacing/text/flex/display utilities, all RTL-aware via logical properties | 🔴 **Two hard gaps:** utilities are **not responsive** (zero breakpoint variants — no `m-md-*`), no z-index utilities, and **no generator/config** — every utility is hand-authored static CSS. |
| **A4. JS parity** | See "The crux" below | 🔴 **The real gap.** |
| **A5. TypeScript defs** | Zero `.d.ts`, no `types` field | 🔴 **Completely missing.** |

---

## The crux: JS API shape (Section A4)

This is where the roadmap is *most* correct. NYX ships a competent **data-attribute + flat-global-function** layer (public API is one flat object at `nyx.js:1822-1831`), but is missing the three things that actually keep people on Bootstrap:

1. **No cancelable lifecycle.** Events exist but only `*-show`/`*-hide`, fired *after* the state change, **never `cancelable`** — so you can't `preventDefault()` to abort an open. No `shown`/`hidden` post-transition pair.
2. **No instance API.** No `getOrCreateInstance()`, no `.show()` / `.hide()` / `.toggle()` / `.dispose()` on elements. Everything is `Nyx.openModal('#id')` globals + boolean guard flags on DOM nodes. No teardown path at all.
3. **No floating engine.** Dropdowns / popovers / tooltips are **CSS-positioned only** — zero flip / shift / collision detection. The roadmap's "kill Popper" pitch is real, but note: **NYX has no positioning engine to replace it with**, so this is greenfield, not a swap.

**Bonus silent gap:** tabs, collapse, dropdown, and carousel are **not programmatically controllable** — the internal functions (`activateTab` `nyx.js:311`, `toggleCollapse` `nyx.js:341`) aren't exported. "Show a tab from JS" currently requires a synthetic click.

---

## Corrected priority shortlist

The roadmap's five priorities, re-ranked against reality:

| Rank | Item | Why (grounded) | Effort |
|---|---|---|---|
| **1** | **JS instance API + cancelable lifecycle events** | The single most-cited reason people can't leave Bootstrap, and NYX's biggest true gap. Also unlocks exporting tab/collapse/dropdown control. | High |
| **2** | **TypeScript defs** (`.d.ts` + `types` field) | Completely missing, non-negotiable in 2026, and **cheap** — the public API is one flat object of ~25 functions. Days, not weeks. | Low |
| **3** | **Responsive utilities + utility generator** | The one real CSS "table stakes" gap. No breakpoint variants today. The generator doubles as the Tailwind defense. | Med-High |
| **4** | **Grid gap-fill** (offsets, `g-*` gutters, `container-fluid`) | Smaller than the roadmap implies — the grid core is done; these are additive. | Med |
| **5** | **Zero-dep floating engine** | Correct as a differentiator, but it's **greenfield** (no engine exists to swap), so higher-cost than the doc's "clean provable win" framing suggests. | High |

---

## Detailed inventory (evidence)

### Grid system

| Roadmap claim | Status | Evidence |
|---|---|---|
| Responsive column suffixes (`col-md-6`, `-lg-4`) | ✅ EXISTS | `layout.css:54-65` — full 1–12 sets at `sm`(640)/`md`(768)/`lg`(1024)/`xl`(1280). **No `xxl`** (5 tiers vs Bootstrap's 6). |
| Column offsets (`offset-*`) | 🔴 MISSING | No `.nyx-offset` classes anywhere. |
| Column order (`order-*`) | 🟡 PARTIAL | `layout.css:31` — `order-first/last/none/1..5`, but **non-responsive** (no `order-md-*`). |
| Auto-layout columns (equal-width bare `col`) | 🟡 PARTIAL | `nyx-col-auto` = natural width; `nyx-grid-auto` = auto-fit fill. No Bootstrap-style equal-width `.col`. |
| Gutters API (`g-*`, `gx-*`, `gy-*`) | 🔴 MISSING (as named) | Fixed `gap:var(--nyx-s4)`. Generic `gap-*`/`gap-x-*`/`gap-y-*` exist instead. |
| Breakpoint containers (`container-md`, `-fluid`) | 🔴 MISSING | Only `.nyx-container` (fixed `max-width:1280px`). |
| Flexbox grid **and** CSS-grid variant | 🟡 PARTIAL | CSS-grid only (`.nyx-grid`). No flexbox `.nyx-row` 12-col grid. |

### Utilities API

| Roadmap claim | Status | Evidence |
|---|---|---|
| Spacing (margin/padding) | ✅ EXISTS | `utilities.css:9-23` — `m/p` + `t/b/s/e` sides, scale `0..6`, `mx-auto`. |
| Spacing **responsive** | 🔴 MISSING | Zero breakpoint variants (`m-md-*` etc.) anywhere. Single-tier only. |
| Spacing **RTL-aware** | ✅ EXISTS | Logical props: `margin-inline-start/end`, `padding-inline-*`. Sides `s`/`e`, not `l`/`r`. |
| Display / flex / gap / text | ✅ EXISTS | Rich, but **non-responsive**. |
| Sizing / color / border | 🟡 PARTIAL | Token-bound subsets; no full scales. |
| z-index utilities | 🔴 MISSING | No `.nyx-z-*`. |
| State variants (`hover:` / `focus:`) | 🔴 MISSING | Only fixed-purpose classes (`hover-lift`, `focus-ring`), no prefix system. |
| Config/generator for custom utilities | 🔴 MISSING | No Sass map / generation loop. All utilities hand-authored; `build.js` only splits/concats. |

### Forms

| Feature | Status | Evidence |
|---|---|---|
| Validation states + feedback | ✅ EXISTS (CSS-only) | `forms.css:74-86` — `.is-valid`/`.is-invalid`/`.nyx-was-validated` + `.nyx-valid-feedback`/`.nyx-invalid-feedback`. **No JS validation engine** (only the KSA national-ID Luhn mask, `nyx.js:1337`). |
| Input groups | ✅ EXISTS | `forms.css:15-25` — `.nyx-input-group` + `.nyx-addon`. |
| Floating labels | ✅ EXISTS | `forms.css:68-72` — `.nyx-float` (fixed 52px height). |
| Custom checkbox / radio / switch | ✅ EXISTS | `.nyx-checkbox` / `.nyx-radio` / `.nyx-toggle` (`forms.css:46-64`). |
| Range slider | ✅ EXISTS | `.nyx-slider` + dual `.nyx-range` (`nyx.css:1311-1328`), JS fill driver. |
| Custom select arrow | ✅ EXISTS | `.nyx-select` `appearance:none` + SVG chevron (`forms.css:13`). |
| Custom file input | 🟡 PARTIAL | `.nyx-file` is a **display card**, not a styled native file input. No `::file-selector-button`. |
| Input sizing (sm/lg) | 🔴 MISSING | No `.nyx-input-sm/-lg`. Single size only. |
| Disabled / readonly control styling | 🔴 MISSING | Only buttons/pagination styled; inputs fall back to browser defaults. |
| Form layout (horizontal / grid rows) | 🔴 MISSING | No `.nyx-form-row` / horizontal-form helpers. |

### JS API

| Area | Status | Evidence |
|---|---|---|
| Lifecycle events | 🟡 PARTIAL | `*-show`/`*-hide` only, never cancelable, no `shown`/`hidden`; `nyx.js:98,131,161,322,342,549`. |
| Instance API (`getInstance`, `.dispose`, methods) | 🔴 MISSING | Flat global fns; boolean flags, not instances; `nyx.js:1822-1831`. |
| `data-nyx-*` triggers | ✅ EXISTS | `initTriggers` map `nyx.js:534-568`; ~32 attrs. |
| Programmatic control | 🟡 PARTIAL | Modals/toast/popover yes; **tabs/collapse/dropdown/carousel not exported**. |
| Floating/positioning engine | 🔴 MISSING | No flip/shift; CSS-only; only a context-menu clamp `nyx.js:1811-1815`. |
| Idempotent `init(root)` | ✅ EXISTS | `nyx.js:1754`, guard flags throughout; but **no `dispose`**. |

### Theming / RTL / a11y / build / CI

| # | Axis | Status | Notes |
|---|---|---|---|
| 1 | Runtime theming (CSS vars) | ✅ EXISTS | ~49 `--nyx-*` tokens (`tokens.css`); `setTheme()`/`setAccent()` flip `data-*` + persist; accent retone via `color-mix()`. |
| 2 | Dark mode | ✅ EXISTS* | Dark is default; light opt-in. **Missing: `prefers-color-scheme` auto and `color-scheme`** — both cheap wins. |
| 3 | RTL / Arabic (logical props) | ✅ EXISTS | **Zero** physical `margin-left/right`; 105 `margin-inline*`. Built-in, not a separate build. Arabic font self-hosted (opt-in). |
| 4 | Theme builder / gallery | 🟡 PARTIAL | Live landing-page customizer (4 accents) — a demo, not an exporter; no Bootswatch-style gallery. |
| 5 | Design token export (JSON/Figma) | 🔴 MISSING | Tokens live only as CSS; no machine-readable export. Prerequisite for the Figma-kit pitch. |
| 6 | TypeScript defs | 🔴 MISSING | No `.d.ts`, no `types` field. |
| 7 | A11y (focus trap/restore/roving/esc/aria) | ✅ EXISTS | Strong: `nyx.js:602-631` (trap+roving), `releaseFocus()`, `applyInert()`, `dialogSemantics()`. |
| 8 | Build / tree-shaking | 🟡 PARTIAL | Per-component **CSS** à-la-carte yes; **no per-component JS**, `nyx.mjs` is a single bundle; no purge/JIT. |
| 9 | CI | 🟡 PARTIAL | `.github/workflows/ci.yml` runs `npm test` + build + drift check. No axe/visual-regression/lint. |

\* strength-with-one-gap.

---

## What the roadmap got wrong (downgrade these)

- **Component coverage** — done (21/21). Not a gap.
- **A11y** — done and strong. Market it, don't "harden" it.
- **Section B (dark-native, RTL, motion, charts)** — already shipped and genuinely strong. RTL is exceptional (zero physical inline properties in the whole codebase).

## Cheap wins the roadmap missed

- **`color-scheme` + `prefers-color-scheme` auto** — a few lines each; Bootstrap ships both.
- **Token export to JSON** — small, and it's the prerequisite for the Figma-kit differentiator (B5).
- **Export `activateTab` / `toggleCollapse`** — internal functions already exist; exposing them is trivial and closes the "programmatic control" gap partway.

## Notes / caveats

- The paused `prototype/modular-js/` split overlaps the roadmap's per-component-JS goal (Section C), but the audit confirms it's just a **mirror of the monolith** — same events, no `getInstance`, no positioning. It adds no new API surface.
- Recommended first move: **start with #2 (TypeScript defs)** — highest value-to-effort ratio, and writing the `.d.ts` forces a precise spec of the current JS API, which is exactly the input needed before the #1 instance-API redesign.

---

*Generated as a planning artifact from a file-level codebase audit (NYX v1.0.3). Line references are as of the audit date; verify before acting.*
