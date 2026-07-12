# Changelog

All notable changes to **Nyx** are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/). `package.json` is the single source
of truth for the version; `node build.js` stamps it into every artifact.

## [Unreleased]

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
