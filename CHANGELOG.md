# Changelog

All notable changes to **Nyx** are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/). `package.json` is the single source
of truth for the version; `node build.js` stamps it into every artifact.

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

## [1.7.0] — 2026-06-20

### Added
- **Backgrounds module** (`components/backgrounds.css`) — eight ambient backdrop
  layers: `.nyx-bg-grid`, `.nyx-bg-dots`, `.nyx-bg-mesh`, `.nyx-bg-gradient`
  (`.animated`), `.nyx-bg-beams` (`.animated`), `.nyx-bg-noise` (stackable),
  the interactive `.nyx-bg-squares`, and `.nyx-bg-stars`. Accent-driven and
  neutralised under `prefers-reduced-motion`. Size patterns with `--nyx-bg-cell`.
- **Charts module** (`components/charts.css`) — zero-dep CSS + SVG data viz:
  pure-CSS bar charts (`.nyx-chart-bars` / `.nyx-bar`, `--nyx-bar:0–100`),
  line/area charts (`.nyx-chart-line`), conic donut & pie (`.nyx-chart-donut`
  / `.nyx-chart-pie`, `.nyx-donut`), and `.nyx-chart-legend`.
- **Code block** (`components/code.css`) — `.nyx-code-block` window with title
  bar, syntax tokens (`.nyx-tok-*`, tag/attr/str/comment follow the accent),
  and a one-tap copy button via the new `data-nyx-copy` runtime handler.
- **Thmanyah typeface** self-hosted (`fonts/thmanyah.css` + `fonts/thmanyah/`):
  Sans, Serif Display, Serif Text in five weights. The Arabic homepage uses it
  by re-pointing `--nyx-font-ar` / `--nyx-font-ar-display`.
- Docs pages for Backgrounds, Charts, and Code block.

### Changed
- The landing hero grid and code window now reuse framework classes
  (`.nyx-bg-grid`, `.nyx-code-block`) instead of bespoke page CSS.
- `build.js` now reads the version from `package.json` (single source of truth)
  and keeps `nyx.js` in sync on build. Version badges aligned to 1.7.0.

### Fixed
- **Horizontal overflow on the homepages** — the hero grid `::before` bled
  `-50vw` per side with nothing clipping it, widening the document. It is now
  the clipped `.nyx-bg-grid`, fixed in `index.html` and `index.ar.html`.

### Project
- Added `LICENSE` (MIT) and this `CHANGELOG.md`.

## [1.6.0]
- Framework-agnostic guidance (React / Vue / Angular), Templates section, docs polish.

## [1.5.0]
- Forms+ (combobox, multi-select, phone, date picker), Overlays+ (sheet, FAB,
  back-to-top, top progress, context menu), Commerce, Regional+ (countdown,
  zakat, qibla, delivery tracking).

## [1.4.0]
- Hierarchy (file/org trees), Regional (MENA) module, responsive grid breakpoints.

## [1.3.0]
- Big type & motion, utilities & helpers.

## [1.2.0]
- "More components" wave; downloadable à-la-carte component files.

## [1.1.0]
- RTL support.

## [1.0.0]
- Initial release: tokens, layout, typography, buttons, cards, forms,
  navigation, feedback, data display, overlays, signature elements.

[1.0.3]: #103--2026-06-28
[1.0.2]: #102--2026-06-23
[1.7.0]: #170--2026-06-20
