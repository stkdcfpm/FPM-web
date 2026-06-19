# FPM International — Claude Code Context

For business context including trade corridors, product categories, and company background, see the site copy in `index.html`.

## What this project is

Public marketing website for FPM International Ltd — a Brighton-based trade intermediary. Single-file static site — all code lives in `index.html`. No build step, no framework, no dependencies beyond Google Fonts. Deployed via GitHub Pages.

**Current version: v1.0.0**

---

## Architecture

| Concern | Detail |
|---|---|
| All code | `index.html` — HTML + `<style>` + `<script>` in one file |
| Form handling | Cloudflare Worker → Web3Forms (Worker URL in hidden input, key in hidden input) |
| Fonts | Google Fonts CDN (Rajdhani, JetBrains Mono) |
| Deployment | GitHub Pages — `main` branch |
| Agents | `.claude/agents/` — quality gate subagents |
| Commands | `.claude/commands/` — slash commands |
| Councils | `docs/councils/` — LLM Council decision logs |
| Known gaps | `docs/known-gaps.md` |
| Version history | `docs/version-history.md` |

---

## Brand tokens

```css
--cream:  #FAF8F2   /* page background */
--ink:    #0B0B0D   /* primary text */
--red:    #C8312E   /* brand accent */
--red2:   #e03c39   /* hover state */
--muted:  rgba(11,11,13,.55)
--border: rgba(11,11,13,.12)
--shadow: 0 2px 16px rgba(11,11,13,.07)
```

Fonts: **Rajdhani 700** (headings/wordmark) · **JetBrains Mono 600** (labels/tags)

---

## Key sections (in order)

| Section | ID | Background |
|---|---|---|
| Hero | — | `--cream` |
| Services | `#services` | `#f0ede4` |
| How It Works | `#how` | `--cream` |
| Products | `#products` | `--ink` (dark) |
| Corridors | `#corridors` | `#f0ede4` |
| About | `#about` | `--cream` |
| Contact | `#contact` | `--ink` (dark) |

---

## Coding conventions

- **Single file** — all HTML, CSS, and JS stays in `index.html`. No splitting.
- **No framework** — vanilla JS only. No React, Vue, jQuery, etc.
- **No build step** — what's committed is what's deployed.
- **XSS** — no user content is inserted into the DOM; the JS is display-only. If dynamic content is ever added, sanitise before innerHTML.
- **External scripts** — Google Fonts only. Any new third-party script requires a security review.
- **Form handling** — contact form submits as JSON to the Cloudflare Worker `/submit` endpoint, which proxies to Web3Forms. Worker URL is in a hidden `#workerUrl` input. Web3Forms access key is in a hidden `name="access_key"` input (public identifier, not a secret).
- **Fade-in** — `.fade-in` elements animate via IntersectionObserver. New content sections should use this class.

---

## On version delivery

At the end of each change delivery:

- **This file** — bump Current version
- **`docs/version-history.md`** — prepend new version row
- **`docs/known-gaps.md`** — add new gap entries as identified
- **Raise a PR** — push the branch and raise a PR for review before merging to main
