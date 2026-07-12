# Code Review — Roadmap-Fixes Diff

> High-effort multi-agent review (8 finder angles → verify pass) of the hand-authored
> source changes in the current working tree: `nyx.js`, `nyx.css`, `build.js`,
> `tools/migrate.js`, `nyx.d.ts`, `package.json`, `test/migrate.test.js`.
> Generated/pre-existing files (`nyx.mjs`, `nyx.min.*`, `index.*`, `llms*`, `locales/`,
> `prototype/`, `tokens.json`) were out of scope.
>
> **10 findings** — all verified against the actual code (most were directly
> constructible and checked, not just asserted). Ranked most-severe first.

---

## Resolution (2026-07-11)

**All 10 addressed.** Build fully idempotent · **213/213** tests (regression tests added
in `test/lifecycle.test.js` for the popover-float, animation-end timing, and instance
footgun/dispose fixes; `test/migrate.test.js` for the codemod skip-zones + cheat-sheet
escapes).

| # | Finding | Status |
|---|---------|--------|
| 1 | Floated popover mis-render | ✅ Fixed — `position()` neutralizes `bottom/right/margin-inline` under `position:fixed` |
| 2 | `-shown`/`-hidden` never track animation end | ✅ Fixed — `afterTransition` listens for `animationend` **and** accepts the node *or its direct animated child*; clears the fallback timer |
| 3 | `getOrCreateInstance` overlay footgun | ✅ Fixed — unrecognized elements → `null`; `.nyx-carousel` → carousel handle (no `openModal`) |
| 4 | Dropdown `dispose()` wrong WeakMap key | ✅ Fixed — `canonicalEl()` keys trigger and container to the same element |
| 5 | Codemod corrupts non-markup | ✅ Fixed — shields `<script>/<style>/<pre>/<code>`, anchors `class=`/`className=`, `data-bs-` only in attribute position |
| 6 | `MIGRATION.md` mangled regex | ✅ Fixed — cheat-sheet keeps escapes (`\d` stays `\d`) |
| 7 | Build depends on untracked files | ⚠️ **Action before commit** — `git add tools/ MIGRATION.md test/lifecycle.test.js notes/CODE-REVIEW.md` |
| 8 | `floatOpen` not rAF-batched | ✅ Fixed — scroll/resize coalesced into one `requestAnimationFrame`, cancelled on close |
| 9 | Accordion sibling skips cancelable `-before-hide` | ✅ Fixed — each sibling close emits (and honors) `nyx:collapse-before-hide` |
| 10 | `watchAutoTheme` uses `.onchange` | ✅ Fixed — `addEventListener('change')` with `addListener` fallback |

Also fixed in passing: `getOrCreateInstance` return type widened to
`Instance | CarouselInstance | null`; `afterTransition`'s uncleared 400ms fallback timer.

---

## Confirmed (7)

### 1. Floated popover mis-renders — `position()` leaves stale CSS offsets
**File:** `nyx.js` (`position` / `floatOpen`, ~line 244–296) · **also** `nyx.css:607`
`position()` only writes inline `position`/`top`/`left`. `.nyx-pop` still applies
`bottom:calc(100% + 12px)` and `inset-inline:0` from the stylesheet. Under
`position:fixed` the box is over-constrained (a positive `top` **and** a `bottom`
~12px above the viewport top, plus `left:0`+`right:0`) → it collapses to near-zero
height / renders off-screen.
**Why it slipped through:** the earlier float test only asserted `position:fixed`, not layout.
**Fix:** in `position()`, clear the cross-axis physical props before placing
(`f.style.bottom = ''; f.style.right = ''; f.style.insetInline = ''`), or reset all
positioning inline props up front. Dropdowns escape this (only `top`+`inset-inline-start`,
both overridden), so it's popover-specific.

### 2. `-shown` / `-hidden` fire at the wrong time — `afterTransition` watches the wrong event
**File:** `nyx.js` (`afterTransition`, line 115)
Every overlay/popover/dropdown animates via CSS `@keyframes` (`nyx.css:589,608,454,586`),
which emits **`animationend`** — but `afterTransition` only listens for **`transitionend`**.
So the listener never fires, and `nyx:*-shown` / `-hidden` **always** dispatch on the fixed
400ms fallback regardless of the real 0.18–0.4s animation. The `transitionend`
add/remove is dead code.
**Fix:** listen for `animationend` as well (`node.addEventListener('animationend', onEnd)`),
and clear the fallback `setTimeout` inside `fin()` so it doesn't linger.

### 3. `getOrCreateInstance` footgun — non-overlay elements get a broken modal handle
**File:** `nyx.js` (`instanceFor` fallthrough, ~line 214)
`instanceFor()` branches only on popover / collapse / dropdown / tab. Anything else —
**`.nyx-carousel`**, toast, tooltip, arbitrary element — falls through to
`makeInstance(node, s => s ? openModal(node) : close(node), …)`. So
`Nyx.getOrCreateInstance('#carousel').show()` runs `openModal()` on the carousel:
backdrop, body scroll-lock, `inert` on siblings, focus trap — over an element that never
closes cleanly. `MIGRATION.md` even invites Bootstrap-style `getOrCreateInstance` usage.
**Fix:** add a `.nyx-carousel` branch (delegate to the `carousel()` handle) and make the
final fallthrough return `null` for elements it doesn't recognize, instead of assuming overlay.

### 4. Dropdown instance `dispose()` deletes the wrong WeakMap key
**File:** `nyx.js` (`makeInstance` / `instanceFor` / `getOrCreateInstance`, ~line 194–219)
`getOrCreateInstance(n)` caches keyed by the **passed** element `n` (e.g. the trigger
button), but the dropdown branch builds `makeInstance(dd, …)` where `dd =
n.closest('.nyx-dropdown')` (the container), so `dispose()` runs
`_instances.delete(container)` — a key that was never inserted. After `dispose()`,
`getInstance(trigger)` still returns the stale handle; `getOrCreateInstance(container)`
vs `(trigger)` yield two independent instances for the same dropdown.
**Fix:** key the cache and `dispose()` on the **same** resolved element (resolve the
container in `getOrCreateInstance` before the `_instances.set`, or have `dispose` delete
the key actually used).

### 5. Codemod corrupts non-markup — no skip-zones
**File:** `tools/migrate.js` (`migrateHtml`, line 94)
`/\bclass=("|')(.*?)\1/gs` matches `:class=` (Vue), `ng-class=`, and `class=` inside
`<script>`/`<style>`/`<pre>`/`<code>`; the `/\bdata-bs-…/g` pass runs over the whole
document (text + attribute values). **Verified**:
- `:class="btn"` → `:class="nyx-btn"` (breaks the Vue binding)
- `<code>class="btn btn-primary"</code>` → rewritten (mangled sample)
- prose `Use data-bs-toggle` → `data-nyx-toggle`
- `<script>… class="card" …</script>` → `nyx-card`

On the tool's advertised use (arbitrary Bootstrap projects/docs) this silently corrupts
non-markup and inflates the reported change counts.
**Fix:** skip `<script>`/`<style>`/`<pre>`/`<code>` regions, anchor the class match to
real `class=`/`className=` (not `[-\w]class=`), and scope the `data-bs-` rewrite to
attribute-name position.

### 6. `MIGRATION.md` ships invalid regex patterns
**File:** `tools/migrate.js` (`generateCheatsheet`, line 119)
`String(p.re).replace(/^\/\^?|\$?\/$/g,'').replace(/\\/g,'')` strips **every** backslash,
so escaped metacharacters render as literals. **Verified**: `MIGRATION.md:96` shows
`col-(d{1,2})` — the `\d` collapsed to a literal `d` — a wrong pattern shipped to users.
**Fix:** store a human-readable `doc:` string on each pattern object instead of
reverse-engineering the compiled `RegExp`.

### 7. Build depends on an untracked file
**Files:** `build.js:215` (`require('./tools/migrate')`) · git working tree
`build.js` hard-requires `tools/migrate.js`, but `tools/` is **untracked** (`?? tools/`),
and generated `MIGRATION.md` is untracked too. On a clean checkout / CI,
`node build.js` throws `Cannot find module` and the drift check
(`CONTRIBUTING.md:46-48`) fails.
**Fix (do before committing):** `git add tools/ MIGRATION.md test/migrate.test.js`.

---

## Plausible (3)

### 8. `floatOpen` repositioning not rAF-batched
**File:** `nyx.js` (`floatOpen`, ~line 285)
While a `data-nyx-float` dropdown/popover is open, the capture-phase `scroll` listener
calls `position()` (2× `getBoundingClientRect` + viewport reads) **synchronously on every
scroll frame**, including scrolls bubbling from any ancestor scroller → layout thrashing
on fast/momentum scroll.
**Fix:** coalesce into one `requestAnimationFrame` (pending-frame flag), cancel it in `_nyxUnfloat`.

### 9. Accordion sibling auto-close bypasses the cancelable `-before-hide`
**File:** `nyx.js` (`toggleCollapse` sibling loop, line 517)
When opening one accordion item auto-closes its siblings, the siblings emit
`nyx:collapse-hide`/`-hidden` but **never** the cancelable `nyx:collapse-before-hide`, so
a `preventDefault()` on before-hide can't stop a sibling close, and consumers pairing each
`-hidden` with a preceding `-before-hide` see an orphaned event.
**Fix:** route the sibling close through the same before-check (or document the exception).

### 10. `watchAutoTheme` uses `.onchange`
**File:** `nyx.js` (`watchAutoTheme`, line 54)
`_mqlDark.onchange = …` is the only registration path. Older Safari (<14) exposes
`addListener` but not the `onchange` setter, so `setTheme('auto')` never follows an OS
light↔dark flip there (the assignment silently no-ops — no throw to hit the `try/catch`).
`onchange =` also monopolizes the single handler slot.
**Fix:** `addEventListener('change', …)` with an `addListener` fallback.

---

## Not reported (lower-value cleanups the angles also raised)

- **Altitude:** the before/show/shown (+ hide) lifecycle triple is hand-copied across ~6
  components; a single `emitLifecycle(node, type, phase)` helper would own the naming +
  settle wiring. `instanceFor` is an `if (matches…)` chain — table-driving it would avoid a
  special case per new component.
- **Dedup:** the bespoke tab instance re-implements `makeInstance`'s contract; the three
  public arrow wrappers (`showTab`/`toggleCollapse`/`toggleDropdown`) repeat the same
  `el()`-resolve guard.
- **Minor:** `afterTransition`'s 400ms fallback timer is never cleared (churn); popover
  force-show on an already-open popover early-returns past the aria/sibling-close resync;
  the dropdown close path no longer closes sibling dropdowns (low reachability); `parseVars`
  vs `tokenNames` use different `--nyx-*` charsets (latent — no `_`/uppercase token today);
  `generateArabic`/`cssBlock` rely on exact source strings and degrade silently on reformat.
- **Process/convention (`CONTRIBUTING.md`):** `nyx.d.ts` is a third hand-maintained
  framework file (rule says only `nyx.css`/`nyx.js`) that can drift from the runtime; new
  APIs (`Nyx.position`, `data-nyx-float`, popover/carousel) landed without `docs/` updates.

---

## Cleared (checked, NOT issues)

`closeAll` backdrop/scroll cleanup on a cancel-veto (correct — `currentOverlay()` stays
truthy) · `carouselSet` early-return (only returns on an actual veto; initial render still
paints) · `activateTab` veto (clean abort, aria stays consistent) · `build.js` in-memory vs
on-disk CSS consistency after `injectResponsiveUtilities` · token-category regex
(`shimmer`/`success` are colors, `s[1-9]` covers `s1..s9`) · no physical `left`/`right`
added to CSS (the `left`/`right` in `position()` are pixel coordinates, direction-neutral).
`nyx.mjs` throwing `document is not defined` on Node `import` is a **pre-existing** SSR
limitation, not introduced by this diff.

---

*Verification: build idempotent · 170/170 tests green at review time. These findings are
about behavior the tests don't exercise (float rendering, animation-end timing, instance
disposal, codemod edge inputs).*
