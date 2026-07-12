# Roadmap Build Plan — new components, charts, wrappers

Plan for the requested roadmap. **Written for approval before coding** (per "plan first, then build").
Every item lists: class/API surface · data-attrs · JS behavior · a11y · files touched · tests.

---

## 0 · Audit — what already ships (don't rebuild)

| Requested | Status | Notes |
|---|---|---|
| Number / quantity stepper | **Exists** (`.nyx-stepper` + `stepperAdjust`, nyx.js:658) | Works; **a11y gap** — no `role="spinbutton"`/`aria-valuenow/min/max`. Upgrade, don't rebuild. |
| Back-to-top | **Exists** (§17, `syncBackTop` nyx.js:1421) | Complete. |
| Charts: bars/line/donut/pie/sparkline/heatmap/gauge | **Exists** (§21, §24) | Line already renders an `.nyx-area` gradient fill. |
| Speed-dial | Partial — `.nyx-fab` exists (§17) | Speed-dial is the expanding-actions variant of the existing FAB. |

**Net genuinely-missing: 6 components + 2 chart modes + wrappers + deepening.**

---

## 1 · Conventions every new component must follow

- **CSS** authored in `nyx.css` under a `/* === N. TITLE === */` banner. `build.js` splits banners into
  `components/<file>.css` via `SECTION_FILES[N]`. **A new numbered section needs a `SECTION_FILES` entry**
  or `build.js` logs "Skipped unmapped section" and drops it from the à-la-carte build.
- **JS** in `nyx.js` (IIFE). Pattern: an `initX(root)` called from `init()`, event-delegated handlers on
  `doc`, and (for stateful widgets) a cancelable lifecycle event pair `nyx:x-before-*` → `nyx:x-*` → settle via
  `afterTransition`. Public verbs added to the returned `Nyx` object.
- **Types** hand-maintained in `nyx.d.ts` (the one sanctioned 3rd framework file).
- **Tests** in `test/*.test.js` (`node --test` + jsdom). JS widgets → behavioral; CSS-only → assert the built
  class exists in `nyx.min.css`.
- **Docs**: add a demo block to `index.html` (feeds `llms.txt` + the Arabic `index.ar.html` generator).
- **RTL**: use logical props (`inset-inline`, `margin-inline`, `start/end`) — physical L/R only for pixel math.
- After each component: `node build.js` (idempotent) + `node --test` must stay green; `npm run build:check`
  (build + `git diff --exit-code`) is the CI gate.

---

## 2 · New components

### Phase A — CSS-only (low risk, fast)

**A1. Descriptions (key→value grid)** — `.nyx-descriptions` (Ant-style detail pages)
- Markup: `<dl class="nyx-descriptions">` with `.nyx-desc-item` → `.nyx-desc-label` / `.nyx-desc-value`.
  Modifiers `.bordered`, `.vertical`, `data-cols="1|2|3"` (responsive collapse to 1 col).
- CSS-only (CSS grid). No JS. New section **29. DATA+** → `SECTION_FILES[29]='data-plus'`.
- Tests: class-exists smoke in built CSS.

**A2. Result / status screen** — `.nyx-result`
- Markup: `.nyx-result` > `.nyx-result-icon` (success/error/info/warning/403/404/500 via `data-status`) +
  `.nyx-result-title` + `.nyx-result-text` + `.nyx-result-actions`. Status drives icon glyph + accent color.
- CSS-only (icon glyphs via `::before` content map). Section **30. FEEDBACK+** → `'feedback-plus'`.
- Tests: class-exists smoke.

**A3. Ribbon / corner badge** — `.nyx-ribbon` on a `position:relative` card
- `.nyx-ribbon[data-ribbon="NEW"]` corner banner; `.nyx-ribbon-start|-end`, tone via `.success/.danger`.
- CSS-only. Lives in **30. FEEDBACK+** with Result.
- Tests: class-exists smoke.

**A4. Watermark** — `.nyx-watermark`
- Repeating diagonal text via layered `background` from `data-text`; a tiny `initWatermark` paints a tiled
  SVG data-URI so text/opacity/angle are configurable. Section **29. DATA+**.
- Tests: `initWatermark` sets `background-image` from `data-text`.

**A5. Masonry** — `.nyx-masonry`
- CSS `columns`-based (`column-count` responsive, `break-inside:avoid` on children). CSS-only, no JS reflow.
  Section **29. DATA+** (layout utility) — or fold into `layout-plus` (see A/affix).
- Tests: class-exists smoke.

**A6. Area chart** — promote the existing line `.nyx-area` into a documented `.nyx-chart-area` variant
- Same SVG line-chart markup; area variant fills under the path (gradient already defined). Add stacked-area
  legend example. Extends **§21 CHARTS** (no new file). CSS + documented SVG markup only.
- Tests: class-exists smoke + doc example renders in jsdom without error.

### Phase B — small JS

**B1. Stepper a11y upgrade** (existing component) — add `role="spinbutton"`, `aria-valuenow/min/max`,
  keyboard ↑/↓, and a cancelable `nyx:stepper-change`. Touches nyx.js:658 + nyx.d.ts + tests.

**B2. Affix** — `data-nyx-affix` pins an element to top/offset after a scroll threshold
- `initAffix` adds `.is-affixed` past `data-nyx-affix-top`, using one shared rAF-batched scroll listener
  (reuse the `syncBackTop` pattern). New section **31. UTILITIES+** → `'utilities-plus'` (or fold to `overlays-plus`).
- Tests: toggles `.is-affixed` when a stubbed `scrollY` crosses the threshold.

**B3. Speed-dial** — `.nyx-speed-dial` extending `.nyx-fab`
- Click toggles `.open`, revealing stacked `.nyx-speed-action`s; `Esc`/outside-click closes. Reuses dropdown
  close-on-outside plumbing. Extends **§17 OVERLAYS+**. Cancelable `nyx:speeddial-before-show`.
- Tests: toggle open/close + outside-click close.

### Phase C — real JS widgets

**C1. Split / resizable panels** — `.nyx-split` with `.nyx-split-panel` + `.nyx-split-bar`
- `initSplit` wires pointer drag on the bar; horizontal/vertical via `data-nyx-split="x|y"`; `min`/`max` via
  `data-min`. Persists ratio to the panel's inline `flex-basis`. Pointer Events (works touch+mouse), `aria`
  separator role with keyboard arrows. Emits `nyx:split-resize`. New section **32. LAYOUT+** → `'layout-plus'`
  (co-locate Masonry/Affix here instead of DATA+/UTILITIES+ — cleaner grouping; final numbering fixed at build).
- Tests: synthetic pointerdown→move→up changes panel basis; respects min/max; keyboard arrows nudge.

**C2. Color picker** — `.nyx-colorpicker`
- Popover-anchored (reuses the floating engine): saturation/value square + hue slider + hex/RGB/HSL input +
  swatch row. `initColorPicker`; two-way sync input↔canvas. Emits cancelable `nyx:color-before-change` +
  `nyx:color-change` with `{hex,rgb,hsl}`. Anchored via `data-nyx-float`. Section **33. FORMS++/PICKERS** →
  `'forms-pro'` (or extend `forms-plus`).
- Tests: setting hex updates swatch + emits change; hue drag updates value; keyboard-accessible inputs.

**C3. Product tour / coachmarks** — `data-nyx-tour` driven
- `Nyx.tour([{el, title, text, placement}])` (+ declarative `data-nyx-tour-step`): spotlight overlay (SVG mask
  cutout around the target), positioned callout via the floating engine, next/prev/skip, focus-trap per step,
  `Esc` to end. Emits `nyx:tour-start`/`-step`/`-end`. Section **34. OVERLAYS++** → `'overlays-pro'`.
- Tests: `Nyx.tour(steps)` advances index on next(), positions callout, ends on skip, restores focus.

**C4. Radar chart** — `.nyx-chart-radar` (SVG)
- CSS + a small `radarPoints(values, max)` helper exported for authoring the polygon; grid rings + axis spokes
  via CSS. Extends **§21 CHARTS**.
- Tests: `radarPoints` returns N points on the correct radii; class-exists smoke.

---

## 3 · Deepening existing components (parity gaps)

Not new files — enhancements to shipping components. Each is independently shippable:
- **Dropdown**: submenus (`.nyx-dropdown-submenu`, hover/focus open) + checkable items (`role="menuitemcheckbox"`, `aria-checked`).
- **Table / data-grid**: row selection (checkbox col + `nyx:row-select`), expandable rows, sticky header (`.nyx-table-sticky`), optional windowing hook.
- **Tabs**: closable (`data-nyx-closable` + `nyx:tab-close`), vertical (`.nyx-tabs-vertical`), draggable reorder.
- **Forms**: async validation API — `Nyx.validate(field, asyncFn)` with pending/valid/invalid states + `aria-busy`.

## 4 · Framework wrappers — `@nyx/react`, `@nyx/vue`

Separate publishable packages (monorepo). Biggest effort; **recommend a dedicated phase**.
- Repo layout: add `packages/react/` + `packages/vue/`; root becomes a lightweight workspace (`"workspaces"`
  in package.json) — the core `nyx-css` package stays exactly as-is (no CDN/exports change).
- `@nyx/react`: thin typed components (`<NyxModal>`, `<NyxDropdown>`, `<NyxColorPicker>` …) that render NYX
  markup + a `useNyx()` hook (runs `Nyx.init` on mount, wires refs to the instance API + lifecycle events).
- `@nyx/vue`: a Vue plugin (`app.use(Nyx)`) + `v-nyx` directives + SFC components mirroring the React set.
- Each wrapper: peerDeps on `nyx-css`, its own build (tsup/vite), its own tests. Ship as `@nyx/react@0.1`.
- **Rich-text editor** stays out of core → separate `@nyx/editor` package, same monorepo, later.

## 5 · Section-number / file plan (build.js)

New `SECTION_FILES` entries to add (numbers are provisional — fixed when banners land):
`29:'data-plus'` (Descriptions, Watermark) · `30:'feedback-plus'` (Result, Ribbon) ·
`31:'layout-plus'` (Split, Masonry, Affix) · `32:'forms-pro'` (Color picker) ·
`33:'overlays-pro'` (Tour; Speed-dial extends existing overlays-plus). Charts (Area/Radar) extend §21 — no new file.

## 6 · Proposed sequencing

1. **Phase A** (6 CSS-only wins) + **B1 stepper a11y** — one build, one test pass. Fast, low-risk, visible.
2. **Phase B** (Affix, Speed-dial).
3. **Phase C** (Split, Color picker, Tour, Radar) — the real widgets, one at a time with tests.
4. **Phase D** — deepening (dropdown/table/tabs/forms).
5. **Phase E** — `@nyx/react` + `@nyx/vue` (monorepo), then `@nyx/editor`.

Each phase ends green (`node build.js` idempotent · `node --test` · `npm run build:check`) and updates
`nyx.d.ts` + `index.html` demos + `CHANGELOG.md`.
</content>
</invoke>
