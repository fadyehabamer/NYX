# Changelog

All notable changes to **Nyx** are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/). `package.json` is the single source
of truth for the version; `node build.js` stamps it into every artifact.

## [Unreleased]

## [1.1.0] — 2026-09-24

### Added
- **Swatch picker** (`.nyx-swatches`, `.nyx-swatch`) — colour / variant
  choice on a native radio group: arrow keys, forms and screen readers work
  without JS. Selection is a ring plus a tick (never colour alone); disabled
  options are struck through; `.nyx-swatch-text` covers sizes.
- **Native date & time inputs** — `.nyx-input` now themes
  `type="date|time|datetime-local|month|week"`: the OS picker follows
  `data-theme` via `color-scheme`, the field segments and picker icon use the
  tokens, and `.nyx-date-range` pairs a start/end field with an arrow that
  mirrors in RTL.
- **Splitter** (`.nyx-splitter` + `data-nyx-splitter`) — resizable panes wired
  as a WAI-ARIA window splitter: `role="separator"` with `aria-valuenow`, arrow
  keys (mirrored in RTL), Home / End, Enter to collapse / restore, pointer
  dragging, and a `nyx:split` event. Stacked via `.nyx-splitter-vertical`.
- **Toggle group** (`.nyx-toggle-group` + `data-nyx-toggle-group`) — buttons
  with `aria-pressed` in single or multiple mode, `data-required`, arrow-key
  focus (mirrored in RTL) and a `nyx:toggle` event.
- New à-la-carte modules `components/forms-pro.css` and
  `components/controls.css`. Every new piece uses logical properties and honours
  `prefers-reduced-motion` and `forced-colors`.
- Each new component has an English and an Arabic docs page with examples; the
  docs engine now lets a locale pack override a page's `sections`, `classes`
  and `js`, so Arabic pages can show Arabic demos.
- **Social card.** `assets/og-image.png` (1200×630, rendered from
  `assets/og-image.svg` with the Nyx tokens, mark and Thmanyah type) is declared
  as `og:image` / `twitter:image` on the landing and docs pages, with a
  `summary_large_image` card.

### Fixed
- **The landing page's decorative dashboard preview** used `tabindex="-1"` on
  its segment-control radios, which still let a pointer change them inside an
  `aria-hidden` subtree. The control — and the Forms card's preview switch,
  which sat inside a link — is now `inert`.
- Version badges on the landing and docs pages were stale (v1.0.2 / v1.0.0).
- **`import 'nyx-css/nyx.css'` / `'nyx-css/nyx.js'` failed** with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`. The exports map now includes `nyx.css`,
  `nyx.min.css`, `nyx.js`, `nyx.min.js` and `fonts/*`, alongside the existing
  `./css` / `./js` aliases.
- **`components/enhancements.css` was missing the tilt, counter, typewriter and
  glitch rules.** `build.js` dropped descriptive sub-banners; they are now kept
  with their parent section.
- **Copy buttons could stay stuck on "✓ Copied"** after a quick double click.
- **Stepper +/− buttons fired no `input`/`change` events.**
- **Tab arrow-key navigation was not mirrored in RTL.**
- **`Nyx.confirm()` had no dialog semantics** and did not restore focus. It is
  now an `alertdialog` labelled by its title/message.
- English example pages gained a meta description and favicon. The landing and
  docs pages gained canonical, hreflang and Open Graph tags.

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

[1.1.0]: #110--2026-09-24
[1.0.3]: #103--2026-06-28
[1.0.2]: #102--2026-06-23
