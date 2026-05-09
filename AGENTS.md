# Repository Guidelines

This repository hosts `vykelongthuong.github.io`, a static documentation hub published via GitHub Pages. It is plain HTML/CSS/JS with no build step.

## Project Structure & Module Organization
- `index.html` — landing page and document index for the hub.
- `docs/` — individual guide pages (e.g., `docs/HUONG-DAN-SU-DUNG-ECC.html`, `docs/LOCAL-CHAT.html`). Add new guides here using `KEBAB-UPPER` filenames.
- `assets/css/shared.css` — design tokens (CSS variables), light/dark themes, and shared components.
- `assets/js/shared.js` — `window.DocHub` helpers: theme toggle, storage, copy buttons, date utils.
- `assets/js/docs-data.js` — metadata that drives the index cards (title, tags, updated date, path).
- `.claude/` — local tool settings; do not rely on it for runtime.

## Build, Test, and Development Commands
- Local preview: `python -m http.server 8000` then open `http://localhost:8000/`. Serves the site so `fetch`/relative paths work.
- Alternative preview: `npx serve .` for a zero-config static server.
- Deploy: push to `main`; GitHub Pages publishes the repo root. No build pipeline runs.

## Coding Style & Naming Conventions
- Indentation: 2 spaces for HTML, CSS, and JS; UTF-8; LF line endings preferred.
- JavaScript: wrap modules in IIFEs (`(function () { 'use strict'; ... })();`), single quotes, semicolons, `camelCase` functions, `UPPER_SNAKE` constants. Expose shared APIs on `window.DocHub`.
- CSS: use existing variables in `:root` and `[data-theme="dark"]`; class names in `kebab-case`; keep selectors shallow.
- HTML: semantic tags, link `assets/css/shared.css` and `assets/js/shared.js` first; keep page titles in Vietnamese where existing pages do.
- File naming: docs `UPPER-KEBAB.html`; assets `lower-kebab`.

## Testing Guidelines
There is no automated test suite. Before opening a PR, manually verify:
- Both themes render correctly (toggle persists in `localStorage`).
- New/changed pages load without console errors in Chrome and Firefox.
- The card on `index.html` opens the new doc and `docs-data.js` metadata is accurate.
- Validate HTML via `npx html-validate <file>` if structural changes are significant.

## Commit & Pull Request Guidelines
- Commit subjects follow Conventional Commits seen in history: `feat:`, `fix:`, or short imperative sentences (e.g., `Lock chat when session limit is reached`). Keep ≤ 72 chars; group related changes.
- PRs should include: a concise summary, linked issue (if any), screenshots or short clips for UI changes (light + dark), and manual test notes. Keep diffs focused; update `assets/js/docs-data.js` whenever adding or renaming a doc.
