# Changelog

All notable changes to **Nyx** are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/). `package.json` is the single source
of truth for the version; `node build.js` stamps it into every artifact.

## [1.0.2] — 2026-06-21

### Fixed
- **npm package `exports` map.** The `"."` entry listed the `style` condition
  before `default`, so CSS-aware resolvers (e.g. bundlephobia) resolved the
  main entry to `nyx.css` and tried to parse it as JavaScript — failing the
  build. `"."` now resolves unconditionally to `./nyx.js`; CSS stays reachable
  via the top-level `style` field and the `./css` subpath. Also exposed
  `./package.json` so tooling can read it without `ERR_PACKAGE_PATH_NOT_EXPORTED`.

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

[1.7.0]: #170--2026-06-20
