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


<claude-mem-context>
# Memory Context

# [vykelongthuong.github.io] recent context, 2026-05-15 3:17am GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 32 obs (10,151t read) | 841,796t work | 99% savings

### May 15, 2026
270 1:20a 🔵 vykelongthuong.github.io document hub structure explored
272 " 🟣 Automatic breadcrumb and TOC injection implemented in shared.js
273 " 🔴 OPEN-SPEC.html patched with missing shared.js and favicon includes
271 " 🔵 Repository identified as GitHub Pages static site with zero build step
274 1:31a ✅ Breadcrumb and auto-TOC feature completed across all 6 doc pages
275 1:41a 🔵 Git commands unavailable in Windows sandbox environment
276 " 🟣 Auto breadcrumb and TOC enhancement implemented in shared.js
277 " 🔵 Project structure: Vietnamese static documentation hub with 6 documents
278 1:48a ✅ Code review plan initiated for vykelongthuong.github.io
280 " 🔵 Security scan reveals innerHTML usage and third-party CDN dependencies
281 " 🔵 Primary session user request: security and code quality review
279 " 🔵 Repository structure mapped for vykelongthuong.github.io
296 " 🟣 GPT-5.5 Capability Probe tool added to doc repository
297 " ✅ New doc entry registered in docs-data.js for GPT-5.5 Probe
298 " 🔄 GPT-5.5 Probe header standardized to match project conventions
299 1:51a 🔵 Dark mode theme broken for Kho Tài Liệu and GPT-5.5 Capability Probe
282 1:52a 🚨 XSS vulnerability via marked.parse() in LOCAL-CHAT.html
283 " 🚨 API key stored in plaintext localStorage in LOCAL-CHAT.html
284 " 🚨 Template injection in LOC-TAI-KHOAN-OUTLOOK.html inline onclick handlers
285 " 🔐 CDN dependencies loaded without Subresource Integrity (SRI)
286 " 🔄 Orphan utility scripts left in project root after cleanup
290 2:32a 🟣 GPT-5.5 Capability Probe HTML app requested for creation
292 " 🟣 GPT-5.5 Capability Probe HTML file created at docs/gpt55_capability_probe.html
293 " 🔵 Duplicate observation indicates repeated verification cycle
294 " ✅ GPT-5.5 Capability Probe guide updated with major specification changes
291 " 🔵 PowerShell inline string parsing failure blocked HTML file creation
295 2:50a 🔵 HTML file write via Python inline string failed with OS filename length limit
300 3:09a 🔴 Dark mode theme fixed for GPT-5.5 Capability Probe page
301 " 🔴 Vietnamese diacritics restored in docs-data.js and probe page header
302 " 🔵 DocHub auto-enhancement breadcrumb/TOC causes grid layout breakage without explicit positioning
303 3:14a 🔵 Vietnamese UTF-8 verification in Node.js returns false negative due to encoding mismatch
304 3:15a ✅ Stale debug/temp files removed from project root

Access 842k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>