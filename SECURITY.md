# Security Policy

## Supported versions

Security fixes go into the latest minor release of Nyx 1.x. `package.json` on
`main` is the version being prepared; npm has the latest published one.

| Version | Supported | Notes |
| ------- | --------- | ----- |
| 1.1.x   | Yes       | Current release line (`main`). |
| 1.0.x   | Yes, until 1.1.0 is on npm | 1.0.3 is the latest version on npm. After 1.1.0 is published, fixes land in 1.1.x only. |
| < 1.0   | No        | No versions before 1.0.0 were published. |

## Reporting a vulnerability

Please do not report security problems in public issues, pull requests or
discussions.

Report privately in one of these ways:

1. **GitHub private vulnerability reporting (preferred).** Go to the
   [Security tab](https://github.com/fadyehabamer/NYX/security) and choose
   **Report a vulnerability**. This opens a private advisory that only you and
   the maintainer can see.
2. **Email.** If that button isn't available, write to
   [fadyamer45@gmail.com](mailto:fadyamer45@gmail.com) with "Nyx security" in
   the subject.

Please include:

- the affected version (npm version, or the commit on `main`),
- the component or `Nyx.*` function involved,
- a minimal page or snippet that shows the problem, and what an attacker can
  do with it,
- the browser(s) you tested in.

## What to expect

- An acknowledgement within 3 working days.
- An assessment within 7 working days, with a plan and a rough timeline if the
  report is confirmed.
- A fix released as a patch version, noted in `CHANGELOG.md`, and credit in the
  advisory unless you would rather stay anonymous.

Please give us a reasonable amount of time to release a fix before you
disclose the issue publicly.

## Scope

Nyx is a CSS file plus a small browser runtime (`nyx.js`). Reports we are most
interested in:

- `nyx.js` inserting page or user-supplied content as HTML where it should be
  text (for example through toasts, dialogs, tag inputs or other widgets that
  build markup), leading to script injection.
- Runtime behaviour that can be triggered by crafted `data-nyx-*` attributes in
  a way a page author would not expect.
- Problems with the published npm package itself (unexpected files, install
  scripts, tampered artifacts).

Out of scope: pages that pass untrusted HTML to Nyx components themselves
(for example `innerHTML` in your own code), issues in the demo or docs pages
that don't affect the library, and missing security headers on the GitHub
Pages site.
