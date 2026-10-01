# Changelog

All notable changes to **Nyx** are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/). `package.json` is the single source
of truth for the version; `node build.js` stamps it into every artifact.

## [Unreleased]

### Fixed
- **`dist/nyx.min.css` lost every descendant combinator before a pseudo-class.** The
  minifier trimmed whitespace around `:` to compress `min-width: 640px`, but `:` also
  begins every pseudo-class — so `body.nyx :focus-visible` shipped as
  `body.nyx:focus-visible`, which matches `<body>` rather than its focused descendant.
  The CDN build had **no focus ring on any element** (WCAG 2.4.7) and no `.nyx-prose`
  typography. Nine selectors were affected; `src/nyx.css` and `dist/components/*.css`
  were always correct, which is why it went unnoticed.
- **The global focus rule no longer forces `border-radius`.** It outranks each component's
  own radius, so focusing a `.nyx-fab-btn`, `.nyx-to-top`, avatar or carousel dot squared
  off the circle. (Masked until the minifier fix, since the rule never matched.)
- **`require('nyx-css')` / `import 'nyx-css'` threw `document is not defined`.** The UMD
  factory ran eagerly and touched the DOM at module scope, so every SSR render (Next,
  Remix, Astro, SvelteKit) and any Node import crashed — including for the DOM-free
  helpers. The runtime now detects a missing DOM, keeps the import side-effect-free, and
  no-ops every DOM-driven method; `toHijri`, `fromHijri`, `formatHijri`, `qiblaBearing`,
  `zatcaQR` and `toArabicNumerals` work server-side.
- **One malformed widget could disable the rest of the page.** `init()` ran ~43 behaviours
  in a flat sequence with no error isolation, so an unguarded `querySelector` in the
  combobox, multiselect or datepicker threw straight out and every behaviour registered
  after it never ran. Each step is now isolated and reported; the three dereferences are
  guarded.
- **Five classes shipped in the bundle but in no à-la-carte module.** The splitter returned
  early on descriptive sub-banners, discarding their CSS — `.nyx-tilt`, `.nyx-tilt-layer`,
  `.nyx-typewriter`, `.nyx-typing-done` and `.nyx-glitch` were missing from every
  `dist/components/*.css` while the runtime still drove them. Sub-banners are now absorbed
  into the enclosing section (they land in `enhancements.css`).
- **`npm run build:check` could not see new build output.** `git diff` with no arguments
  compares index→worktree only, so a brand-new generated file passed the drift gate.
- **`Nyx.fromHijri()` returned the day before Islamic New Year.** The Umm al-Qura
  convergence correction rounds to exactly 0 across a Hijri year rollover, stalling the
  loop so it silently returned its tabular seed — 1 Muharram was a day early in 4 of 10
  consecutive years (1444, 1445, 1449, 1452 AH). Now uses the true mean year (354.367) and
  steps by one day whenever the correction degenerates. 0 mismatches over 24,837
  round-trips (was 33).
- **Dropdowns emitted no lifecycle events on any normal close.** Outside click, item click,
  Escape and the sibling auto-close all stripped the `.open` class directly, so
  `nyx:dropdown-before-hide` / `-hide` / `-hidden` never fired and `preventDefault()` was
  ignored. All close routes now go through `toggleDropdown`. Same fix for the popover
  sibling auto-close, which also left its trigger's `aria-expanded="true"` forever.
- **`applyInert()` could inert the open dialog itself.** It asked whether a body child *is*
  an overlay rather than whether it *contains* one — so a modal inside `<main>` or the root
  `<div>` an SPA renders into had its own ancestor inerted, and `inert` inherits. The dialog
  became unfocusable after `openModal()` had already moved focus into it and locked scroll:
  a keyboard trap in the most common integration pattern.
- **`javascript:` URLs in `data-embed` executed in the page origin** when the video facade
  framed them (appending `?autoplay=1` does not neuter a payload ending in `//`). The URL is
  now parsed and its scheme allowlisted to `http:`/`https:`, and the iframe gets a
  `referrerpolicy`.
- **`Nyx.zatcaQR()` threw an opaque `DOMException`** for any field over 255 UTF-8 bytes — a
  ~128-character Arabic seller name — because the single-byte TLV length was never bounded.
  It now throws a `RangeError` naming the field and its byte count. (The byte-length
  encoding itself was already correct.)
- **`data-nyx-dismiss` closed every open overlay** rather than its own, so a close button in
  a stacked drawer tore down the modal beneath it — contradicting its documented behaviour.

### Changed
- CI builds **before** testing, and now asserts all three entry points import without a DOM.
- `manifest.json` `sections` are the banners that map to a module file (36); descriptive
  sub-banners are folded into their enclosing section, so every class has a real `module`.

### Added
- **`dist/manifest.json`** — a machine-readable index of the whole framework,
  generated by `build.js` from `src/nyx.css`, `src/nyx.js` and `src/nyx.d.ts`.
  Every class carries its section, à-la-carte module, source line, the pseudo-states
  it defines, the design tokens it reads, the caller-set custom properties it expects,
  and the behaviour that drives it. Every behaviour carries its `init*` function,
  the selectors it claims, the `data-nyx-*` attributes it reads, and the events it
  fires; every event carries its `cancelable` flag, `detail` keys and source function.
  Also exported as `nyx-css/manifest.json`.
- **`reference.html`** — the same surface as one searchable page, rendered from the
  manifest (inlined, so it works offline). Instant filtering across classes,
  behaviours, attributes, events, the JS API, tokens and sections, with `/` to focus
  search, shareable `?q=`/`?kind=` URLs, and a source link on every entry.

## [1.1.0] - 2026-07-12

### Added
- **Descriptions** (`.nyx-descriptions`) — Ant-style label→value detail grid on a
  `<dl>`, with `data-cols`, `.bordered`, and `.vertical` variants.
- **Result / status screen** (`.nyx-result`) — success / error / warning / info /
  403 / 404 / 500 screens driven by `data-status`, with `.nyx-result-actions`.
- **Corner ribbon** (`.nyx-ribbon`) — "NEW" / "-50%" corner banner for cards,
  with `.nyx-ribbon-start`, `.success` / `.danger` tones, and RTL angle mirroring.
- **Watermark** (`.nyx-watermark`) — repeating diagonal text layer painted by the
  runtime from `data-text` (+ optional `data-angle`).
- **Masonry** (`.nyx-masonry`) — CSS-column masonry with a responsive column count.
- **Area chart** (`.nyx-chart-area`) — filled-area variant of the line chart,
  reusing the same author-supplied `<svg>` markup.
- **Color picker** (`.nyx-colorpicker`) — a restyled native swatch synced to a hex
  field, with optional preset dots via `data-swatches` and a `nyx:color-change`
  event.
- **Radar chart** (`.nyx-chart-radar`) — spider/radar chart that styles an
  author-supplied `<svg>` (grid rings, spokes, `.nyx-radar-area` + `.alt` series).
- **Product tour** (`Nyx.tour()` / `data-nyx-tour`) — spotlight onboarding
  coachmarks; mark targets with `data-nyx-tour-step`/`data-title`/`data-text`,
  with Back/Next, keyboard + Esc control, and `nyx:tour-start/-step/-end` events.
- **Split panes** (`.nyx-split`) — draggable, keyboard-resizable panes
  (`.nyx-split-v` for vertical), RTL-aware, emitting `nyx:split-resize`.
- **Affix** (`.nyx-affix`) — `position:sticky` helper with an `.is-pinned` state
  the runtime toggles once it sticks (offset via `data-affix-top`).

### Changed
- **Repo restructured into `src/` (authored) + `dist/` (generated).** The minified
  build and à-la-carte modules now live under `dist/` — CDN/download paths become
  `dist/nyx.min.css`, `dist/nyx.min.js`, `dist/components/*.css`. npm consumers using
  the package `exports` map are unaffected; only unversioned CDN hotlinks need the
  new path.
- **Stepper is now an accessible spinbutton.** `.nyx-stepper` inputs gain
  `role="spinbutton"` + `aria-valuemin/max/now`, ArrowUp/ArrowDown keyboard
  support, `step`-aware increments, input clamping, labelled buttons, and a new
  `nyx:stepper-change` event.

### Fixed
- **Floated popover mis-rendered.** `position()` now neutralizes `.nyx-pop`'s
  resting `bottom` / `inset-inline` / `margin-inline` so the fixed box isn't
  over-constrained.
- **`-shown` / `-hidden` fired on the fallback timer, not the real animation.**
  `afterTransition` now also listens for `animationend` and clears its fallback.
- **`getOrCreateInstance` no longer forces modal behavior on non-overlays.** It
  gains a `.nyx-carousel` branch and returns `null` for unrecognized elements.
- **Dropdown instance `dispose()` deleted the wrong cache key.** The instance
  cache now canonicalizes a dropdown trigger to its container.
- **Bootstrap→NYX codemod corrupted non-markup.** It shields
  `<script>/<style>/<pre>/<code>`, anchors real `class=` / `className=`, and only
  rewrites `data-bs-*` in attribute position — framework bindings and prose are
  left intact.
- **`MIGRATION.md` shipped mangled regexes.** The cheat-sheet generator no longer
  strips backslashes, so `col-(\d{1,2})` renders correctly.
- **Floating reposition is rAF-batched** on scroll/resize (no layout thrash).
- **Accordion sibling auto-close** now honors the cancelable
  `nyx:collapse-before-hide`.
- **`setTheme('auto')` follows OS light↔dark on older Safari** via
  `addEventListener('change')` with an `addListener` fallback.

## [1.0.3] — 2026-06-28

### Fixed
- **Hijri calendar rendered as an empty box.** Two runtime functions shared the
  name `initHijri` — one drawing the standalone month grid
  (`data-nyx-calendar="hijri"`), one wiring the Hijri converter widgets
  (`data-nyx-hijri`). Function hoisting let the converter definition silently
  overwrite the grid renderer, so `data-nyx-calendar="hijri"` invoked the wrong
  code and painted nothing. The grid renderer is now `initHijriCalendar`, so the
  two no longer collide.
- **`nyx:date` never fired from the Hijri calendar.** Selecting a day only
  toggled the `.selected` class; the documented `nyx:date` event was never
  dispatched. Each cell now carries its Gregorian date (`data-greg`) and a click
  emits `nyx:date` with the `YYYY-MM-DD` string in `event.detail`.

## [1.0.2] — 2026-06-23

### Added
- **Thmanyah fonts ship on npm.** `fonts/` is now in the package `files` list,
  so the bundled self-hosted Arabic faces resolve for npm consumers.
- **Continuous integration** (`.github/workflows/ci.yml`) — rebuilds on every
  push / PR and runs `git diff --exit-code`, so `components/` and the minified
  artifacts can never drift from `nyx.css` / `nyx.js`. Also exposed as the
  `npm run build:check` script.

### Fixed
- **npm package `exports` map.** The `"."` entry listed the `style` condition
  before `default`, so CSS-aware resolvers (e.g. bundlephobia) resolved the
  main entry to `nyx.css` and tried to parse it as JavaScript — failing the
  build. `"."` now resolves unconditionally to `./nyx.js`; CSS stays reachable
  via the top-level `style` field and the `./css` subpath. Also exposed
  `./package.json` so tooling can read it without `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- **Stale gzip sizes.** The README badges and the docs Download page advertised
  ~11kb CSS / ~4kb JS; the real minified-gzip footprint is **~24kb CSS / ~22kb
  JS**. Corrected in both.

### Docs
- README component overview now lists the Charts, Backgrounds, Motion, Code,
  Commerce and Regional/MENA modules, and corrects the Arabic-font names and the
  Thmanyah-license path.

## [1.0.0]
- Initial release: tokens, layout, typography, buttons, cards, forms,
  navigation, feedback, data display, overlays, signature elements.

[1.0.3]: #103--2026-06-28
[1.0.2]: #102--2026-06-23
