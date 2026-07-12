# Migrate from Bootstrap → NYX

> The #1 way to adopt NYX in an existing project: run the codemod, review a short list, done.
>
> ```bash
> node tools/migrate.js path/to/**/*.html          # preview
> node tools/migrate.js --write path/to/**/*.html   # apply
> ```
>
> This file is **generated** from `tools/migrate.js` (`node tools/migrate.js --cheatsheet`) — edit the map there, not here.

## What the codemod does
1. Rewrites Bootstrap class tokens inside `class="…"` (exact + pattern rules below).
2. Rewrites the `data-bs-*` attribute prefix to `data-nyx-*` (and `data-bs-toggle="offcanvas"` → `…="drawer"`).
3. Leaves classes with no 1:1 NYX equivalent untouched and prints them as **review** items.

## Exact class map

| Bootstrap | NYX |
|---|---|
| `btn` | `nyx-btn` |
| `btn-primary` | `nyx-btn-primary` |
| `btn-secondary` | `nyx-btn-secondary` |
| `btn-danger` | `nyx-btn-danger` |
| `btn-outline-primary` | `nyx-btn-outline-primary` |
| `btn-outline-danger` | `nyx-btn-outline-danger` |
| `btn-outline-success` | `nyx-btn-outline-success` |
| `btn-outline-warning` | `nyx-btn-outline-warning` |
| `btn-lg` | `nyx-btn-lg` |
| `btn-sm` | `nyx-btn-sm` |
| `btn-group` | `nyx-btn-group` |
| `btn-link` | `nyx-btn-ghost` |
| `btn-close` | `nyx-close` |
| `container` | `nyx-container` |
| `container-fluid` | `nyx-container-fluid` |
| `row` | `nyx-grid` |
| `card` | `nyx-card` |
| `navbar` | `nyx-navbar` |
| `nav` | `nyx-nav` |
| `nav-pills` | `nyx-nav-pills` |
| `alert` | `nyx-alert` |
| `alert-success` | `nyx-alert-success` |
| `alert-danger` | `nyx-alert-danger` |
| `alert-warning` | `nyx-alert-warning` |
| `alert-info` | `nyx-alert-info` |
| `badge` | `nyx-badge` |
| `modal` | `nyx-modal` |
| `modal-content` | `nyx-modal-box` |
| `modal-title` | `nyx-modal-title` |
| `offcanvas` | `nyx-drawer` |
| `accordion` | `nyx-accordion` |
| `collapse` | `nyx-collapse` |
| `carousel` | `nyx-carousel` |
| `carousel-item` | `nyx-slide` |
| `tooltip` | `nyx-tooltip` |
| `popover` | `nyx-popover` |
| `spinner-border` | `nyx-spinner` |
| `spinner-grow` | `nyx-spinner` |
| `progress` | `nyx-progress` |
| `pagination` | `nyx-pagination` |
| `breadcrumb` | `nyx-breadcrumb` |
| `list-group` | `nyx-list-group` |
| `form-control` | `nyx-input` |
| `form-select` | `nyx-select` |
| `form-label` | `nyx-label` |
| `input-group` | `nyx-input-group` |
| `w-25` | `nyx-w-25` |
| `w-50` | `nyx-w-50` |
| `w-75` | `nyx-w-75` |
| `w-100` | `nyx-w-100` |
| `mw-100` | `nyx-mw-100` |
| `h-100` | `nyx-h-100` |
| `mx-auto` | `nyx-mx-auto` |
| `border` | `nyx-border` |
| `border-0` | `nyx-border-0` |
| `rounded` | `nyx-rounded` |
| `rounded-circle` | `nyx-rounded-full` |
| `rounded-pill` | `nyx-rounded-full` |
| `shadow` | `nyx-shadow` |
| `shadow-sm` | `nyx-shadow-sm` |
| `shadow-lg` | `nyx-shadow-lg` |
| `position-relative` | `nyx-position-relative` |
| `position-absolute` | `nyx-position-absolute` |
| `position-fixed` | `nyx-position-fixed` |
| `position-sticky` | `nyx-position-sticky` |
| `text-truncate` | `nyx-text-truncate` |
| `text-nowrap` | `nyx-text-nowrap` |
| `visually-hidden` | `nyx-visually-hidden` |
| `sr-only` | `nyx-visually-hidden` |

## Pattern rules

| Bootstrap (pattern) | NYX |
|---|---|
| `col` | `nyx-col-auto` |
| `col-(\d{1,2})` | `nyx-col-{1}` |
| `col-(sm|md|lg|xl)-(\d{1,2})` | `nyx-col-{1}-{2}` |
| `offset-(\d{1,2})` | `nyx-offset-{1}` |
| `offset-(?:sm|md|lg|xl)-(\d{1,2})` | `nyx-offset-{1}` — NYX offsets are not responsive — breakpoint dropped |
| `(m|mt|mb|ms|me|p|pt|pb|ps|pe|gap)-([0-6])` | `nyx-{1}-{2}` |
| `(m|mt|mb|ms|me|p|pt|pb|ps|pe|gap)-(sm|md|lg|xl)-([0-6])` | `nyx-{1}-{2}-{3}` |
| `(m|p)l-([0-6])` | `nyx-{1}s-{2}` — physical→logical (LTR: left→start) |
| `(m|p)r-([0-6])` | `nyx-{1}e-{2}` — physical→logical (LTR: right→end) |
| `d-(none|block|inline|inline-block|flex|inline-flex|grid)` | `nyx-d-{1}` |
| `d-(sm|md|lg|xl)-(none|block|inline|inline-block|flex|inline-flex|grid)` | `nyx-d-{1}-{2}` |
| `text-(start|center|end)` | `nyx-text-{1}` |
| `text-(sm|md|lg|xl)-(start|center|end)` | `nyx-text-{1}-{2}` |
| `text-(uppercase|lowercase|capitalize)` | `nyx-text-{1}` |
| `justify-content-(start|end|center|between|around|evenly)` | `nyx-justify-{1}` |
| `align-items-(start|end|center|baseline|stretch)` | `nyx-items-{1}` |
| `flex-row` | `nyx-flex-row` |
| `flex-row-reverse` | `nyx-flex-row-reverse` |
| `flex-column` | `nyx-flex-col` |
| `flex-column-reverse` | `nyx-flex-col-reverse` |
| `gap-([0-6])` | `nyx-gap-{1}` |
| `fw-(light|normal|medium|semibold|bold|black)` | `nyx-fw-{1}` |

## Manual review (no 1:1 mapping — decide per case)
- `btn-success` / `btn-warning` / `btn-info` / `btn-light` / `btn-dark` — NYX solid buttons are `primary` / `secondary` / `danger` (+ `glass` / `ghost` / `glow`); pick the closest or theme via `--nyx-accent`.
- `bg-*` / `text-bg-*` badge & background colors — use `nyx-badge-success` etc. or the token utilities.
- Component **sub-parts** (`card-body`, `modal-dialog`/`modal-header`/`modal-body`, `accordion-item`, `list-group-item`, `page-item`/`page-link`, `nav-link`, `form-check`) — NYX composition differs; see the component docs.
- `fs-1`…`fs-6` — NYX uses a named scale (`nyx-text-xs`…`nyx-text-3xl`); map by eye.

## Data-attribute & JS notes
- `data-bs-toggle`/`-target`/`-dismiss` → `data-nyx-toggle`/`-target`/`-dismiss` (done automatically).
- Toggle **values**: `modal`, `collapse`, `dropdown`, `popover` match; `offcanvas`→`drawer` (auto-fixed); **tabs** use `data-nyx-tab`/`data-nyx-panel`, not `data-nyx-toggle="tab"`.
- JS API: Bootstrap's `new bootstrap.Modal(el).show()` → `Nyx.getOrCreateInstance(el).show()`; `bootstrap.Carousel` → `Nyx.carousel(el)`.
