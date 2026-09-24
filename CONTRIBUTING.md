# Contributing to Nyx

Thanks for taking the time to help. Bug reports, docs fixes, translations and
new components are all welcome. This guide covers how the repo is laid out,
how to run it locally and what a pull request needs before it can be merged.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
Security problems go through the private process in [SECURITY.md](SECURITY.md),
not public issues.

## How the repo works

```
nyx.css            source of truth for all styles (the all-in-one bundle)
nyx.js             source of truth for the runtime
build.js           splits nyx.css into components/ and writes the min files
components/*.css   generated, do not edit by hand
nyx.min.css/js     generated, do not edit by hand
fonts/             self-hosted Thmanyah faces (shipped to npm)
docs/              documentation site (docs.html + docs.js + locale packs)
examples/          full self-contained example pages
assets/            logos, favicons and the social card (not shipped to npm)
index.html         English landing page (index.ar.html is the Arabic one)
```

Nyx has no runtime dependencies and no dev dependencies. Two files are the
source of truth:

| File | What it is |
| --- | --- |
| `nyx.css` | Every token and component, split into numbered `/* ==== N. NAME ==== */` sections. |
| `nyx.js` | The runtime (`window.Nyx`, `data-nyx-*` wiring). |

Everything else is generated from them by `build.js`:

- `components/*.css` and `components/nyx.bundle.css` (the à-la-carte modules)
- `nyx.min.css` and `nyx.min.js`
- the version stamp inside `nyx.js`, taken from `package.json`

**Never edit the generated files by hand.** Change `nyx.css` / `nyx.js`, run
the build and commit the regenerated output in the same PR. CI rebuilds on
every push and pull request and fails if the committed files differ from a
fresh build.

A new top-level section in `nyx.css` also needs an entry in the `NAMES` map in
`build.js`, otherwise the build skips it with a warning.

## Setup

You need Node.js 20 or later (CI uses 20) and Git.

```sh
git clone https://github.com/<your-username>/NYX.git
cd NYX
```

There is nothing to install: `npm install` is not required.

## Build

```sh
npm run build          # same as: node build.js
npm run build:check    # build, then fail if anything changed (what CI runs)
```

The build prints the minified and gzip sizes of `nyx.min.css` and
`nyx.min.js`. If your change moves them noticeably, mention it in the PR.

There is no test suite or linter on `main` yet. Checking a change means
running the build and looking at it in the docs and examples, as described
below.

## Running the docs and examples locally

The docs are a small single-page app: `docs/docs.js` holds a `PAGES`
registry and a hash router renders one page per component
(`docs/docs.html#/buttons`). The Arabic docs load `docs/docs.ar.js` first,
which overrides titles, summaries and demos per page.

Serve the repository root with any static server, for example:

```sh
npx serve .                    # or: python3 -m http.server 8000
```

Then open:

- `/docs/docs.html` (English) and `/docs/docs.ar.html` (Arabic, RTL)
- `/index.html` and `/index.ar.html` (landing pages)
- `/examples/*.html` (full-page examples)

Opening the files straight from disk mostly works too, but a server avoids
browser restrictions on `file://` URLs. The published copy of the site lives at
<https://fadyehabamer.github.io/NYX/>.

When you check a visual change, look at it in:

- both themes (`data-theme="dark"` and `data-theme="light"`; the docs have a
  toggle),
- LTR and RTL (`dir="rtl"`, or the Arabic docs),
- a narrow viewport, and with `prefers-reduced-motion` turned on if the
  component animates.

## Adding or changing docs

- A new component page is an object in the `PAGES` array in `docs/docs.js`.
  Each section's `demo` markup is rendered both as the live example and as the
  code snippet, so they can't drift apart.
- Add a matching entry under `pages` in `docs/docs.ar.js` with at least an
  Arabic `title` and `summary`. Keep section titles in English there (they are
  used as anchors) and translate them through `_terms`.
- If the component needs a new class or `data-nyx-*` attribute, list it in the
  page's `classes` (and `js`, for events and methods).

## Code conventions

- Two-space indentation, UTF-8, LF line endings (see `.editorconfig`).
- Theme through the `--nyx-*` custom properties rather than hard-coded values,
  so the themes and `color-mix()` retinting keep working.
- Use logical properties (`margin-inline`, `inset-inline-start`, ...), never
  physical `left` / `right`, so RTL works without overrides.
- Keep English and Arabic in step: a change to `index.html` or
  `docs/docs.html` needs the same change in its `.ar` counterpart, and new docs
  strings go into `docs/docs.ar.js` too.
- No runtime dependencies. Google Fonts is the only external load allowed.

## Branches and commits

Work on a branch in your fork, named after the change:

```
feat/<short-topic>     new component or feature
fix/<short-topic>      bug fix
docs/<short-topic>     documentation or translation only
chore/<short-topic>    tooling, CI, repo housekeeping
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
with a scope, matching the existing history:

```
feat(forms): add swatch picker (.nyx-swatches)
fix(a11y): mirror tab arrow-key navigation in RTL
docs(i18n): translate the charts page
fix(build): keep tilt and counter rules in enhancements.css
```

Common scopes are `components`, `forms`, `layout`, `a11y`, `rtl`, `build`,
`docs`, `i18n` and `readme`. Keep each commit focused on one change, and put
the regenerated build output in the same commit as the source change (or in a
`build:` commit right after it).

## Pull requests

Open the PR against `main` and fill in the template. A good PR:

- does one thing. Split unrelated fixes into separate PRs.
- edits `nyx.css` / `nyx.js` only, with the regenerated files committed
  (`npm run build:check` passes locally).
- uses the `--nyx-*` tokens instead of hard-coded colours and sizes, and
  logical properties (`margin-inline-start`, `inset-inline-end`) so it mirrors
  in RTL without extra rules.
- keeps keyboard and screen-reader behaviour working: real buttons and
  inputs, visible focus, correct ARIA roles and states, arrow keys mirrored in
  RTL.
- respects `prefers-reduced-motion` and `forced-colors` for anything new.
- updates the English and Arabic docs when a class, attribute or API changes.
- adds a line under `## [Unreleased]` in `CHANGELOG.md` for user-facing
  changes.
- includes before/after screenshots for visual changes, ideally in both
  themes.

Version bumps and releases are done by the maintainer, so please don't change
the version in `package.json`.

## Releasing

Releases are published to npm by GitHub Actions, not from a local machine.

1. Bump `version` in `package.json`, run `node build.js` so the new version
   is stamped into every artifact, move the `## [Unreleased]` entries in
   `CHANGELOG.md` under the new version, and merge that to `main`.
2. Create a GitHub release from `main` whose tag is `v` followed by the
   version, for example `v1.2.0` for `1.2.0`:
   `gh release create v1.2.0 --target main --title v1.2.0 --notes-file notes.md`.
3. Publishing the release starts the [Publish
   workflow](.github/workflows/publish.yml). It first checks that the tag
   equals `v` + the `package.json` version and stops without publishing if
   they differ. Then it rebuilds, fails if the committed build output is out
   of date, and lists the packed files, and finally runs `npm publish
   --provenance`. Versions with a pre-release suffix (`1.2.0-beta.1`) go to
   the `next` dist-tag.

To try the workflow without publishing, open **Actions → Publish → Run
workflow** and leave **dry run** ticked.

## Reporting bugs and asking for features

Use the issue forms: pick **Bug report** or **Feature request** and fill in the
fields. For a bug, a minimal HTML snippet (or a CodePen) that shows the problem
is the most useful thing you can include, together with the component, the
direction (LTR/RTL), the theme and your browser.

Issues labelled
[`good first issue`](https://github.com/fadyehabamer/NYX/labels/good%20first%20issue)
are a good place to start. Comment on one before you start so two people don't
work on the same thing.

By contributing you agree that your work is licensed under the project's
[MIT License](LICENSE).

## ملاحظة بالعربية

نرحّب بالمساهمات باللغة العربية، وخاصةً ترجمة صفحات التوثيق. الترجمة موجودة في
الملف `docs/docs.ar.js`: أضف لكل صفحة `title` و`summary` بالعربية، واترك عناوين
الأقسام بالإنجليزية وترجمها عبر `_terms`. اعرض النتيجة في `docs/docs.ar.html`
وتأكّد من سلامة الاتجاه من اليمين إلى اليسار قبل فتح طلب الدمج. يمكنك كتابة وصف
طلب الدمج أو البلاغ بالعربية أو بالإنجليزية.
