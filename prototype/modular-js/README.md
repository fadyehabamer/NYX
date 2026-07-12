# Nyx modular runtime — prototype

A proof-of-concept **core + plugins** split of `nyx.js`, so a page can load only the
component behaviour it actually uses instead of the whole runtime.

> **Status: prototype.** It is not wired into the shipped build, `package.json`, or
> the published package. It ports **4 of ~40** components to prove the architecture
> and measure the payoff. See [Graduating to production](#graduating-to-production).

## Why

The shipped `nyx.js` is one file built on **global event delegation** — a few
document-level listeners dispatch to every component, and all components share the
same helpers. That is why it can't be sliced per-component the way `nyx.css` is.
This prototype refactors that into:

- **`nyx.core.js`** — the shared surface every component needs: DOM/storage helpers,
  theme + direction, a single **delegated-event bus** (`Nyx.on`), and the **plugin
  registry** (`Nyx.use` / `Nyx.init` / `Nyx.scan`). No component logic, so it stays ~1.2 KB gz.
- **`nyx.<component>.js`** — one file per component. Each registers itself onto core.

## Usage

Load core first, then only the plugins you want. Order between plugins doesn't
matter, and plugins may even load *before* core (they queue and drain):

```html
<link rel="stylesheet" href="nyx.css" />        <!-- pair with à-la-carte components/*.css -->
<script src="nyx.core.js"></script>
<script src="nyx.overlay.js"></script>          <!-- modal / drawer / sheet -->
<script src="nyx.toast.js"></script>
<!-- that's it — no tabs, countdown, datepicker, … code shipped -->
```

Markup and the `window.Nyx` API are identical to the monolith for the ported
components (`data-nyx-toggle="modal"`, `Nyx.toast(...)`, `Nyx.toggleTheme()`, …).

Open **`demo.html`** in a browser to see core + overlay + tabs + toast running.

## Build a custom bundle

`bundle.js` concatenates core + the plugins you name into one `nyx.custom.js` and
prints a size table:

```bash
node bundle.js                 # all demo plugins
node bundle.js overlay toast   # just these two → nyx.custom.js
```

## The three plugin shapes (why 4 components were chosen)

| Plugin           | Pattern it demonstrates                                              |
| ---------------- | ------------------------------------------------------------------- |
| `nyx.overlay.js` | Delegated events **+ shared infra** (backdrop, focus-trap, Esc)     |
| `nyx.tabs.js`    | Delegated events only (click + roving arrow keys)                   |
| `nyx.toast.js`   | Pure imperative API (`Nyx.toast`), no DOM scan                      |
| `nyx.countdown.js` | Scan-based widget (`scan(ctx)`, idempotent, owns a timer)         |

Everything else in Nyx is a variation on one of these.

## The size tradeoff (measured)

```
nyx.core.js         1.2 KB gz
  + overlay         1.2 KB gz
  + tabs            0.7 KB gz
  + toast           1.0 KB gz
  + countdown       1.0 KB gz
core + all 4        3.8 KB gz
core + overlay+toast 2.8 KB gz

Full monolith nyx.js  17.2 KB gz   (all ~40 components)
```

**Relative** win is large — a page using just modal + toast ships **2.8 KB vs
17.2 KB (~84% less)**. **Absolute** win is modest — the whole monolith is only
17 KB gz, so the most you can ever save is ~14 KB. Whether that matters depends on
your budget; for many sites, loading the one small monolith is simpler and fine
(unused component code never runs — `init()` only wires what's in the DOM).

## Graduating to production

To become real this would need:

1. **Port the remaining ~36 components** to plugins (mechanical — the sections
   already exist as comment blocks in `nyx.js`).
2. **Extract shared sub-infra** a few components co-use (command-palette/popover/
   dropdown reuse backdrop + focus) into a small internal `overlay-core` the way
   `tokens.css` underpins the CSS modules.
3. **Wire into `build.js`** to emit `components/js/*.js` from a single source, so
   there's no monolith-vs-modules drift (the same single-source discipline the CSS
   split and the generated `index.ar.html` already follow).
4. **Ship ESM per-plugin** (`import { overlay } from 'nyx-css/plugins'`) alongside
   the UMD files, for bundler users.

Recommended sequencing: (1)+(3) together (auto-generate plugins from `nyx.js` so
one source stays canonical), then (4).
