# Agent Architecture & Delivery Framework

## Overview

This project uses a Claude Code subagent system to enforce quality gates across the delivery pipeline. Agents are independent reviewers — they do not write code or make decisions. They verify exit criteria and log evidence.

**Agent files live in:** `.claude/agents/`  
**Scope:** Project-level (scoped to fpm-web only)  
**Audit trail:** Git PR comments (phase 1)

---

## Delivery pipeline

Every feature or change must pass through these stages in order:

```
Requirement → Spec → Build → Security → QA → Release
```

No stage is skipped. No gate is bypassed. A CRITICAL issue from any gate is a hard block.

---

## Active agents (Phase 1)

| Agent | Role | Tools |
|---|---|---|
| `requirements-gate` | Verifies requirements are complete, unambiguous, testable. Flags GDPR implications. | Read only |
| `spec-gate` | Reviews technical spec against requirement. Checks copy, design tokens, GDPR data flows. | Read only |
| `build-gate` | Code review against spec. Flags deviations as defects. Severity: CRITICAL / MAJOR / MINOR. | Read, Grep |
| `security-gate` | GDPR data transmission, external scripts, secrets, CSP. Hard block on release if critical issues found. | Read, Grep |

---

## Planned agents (Phase 2)

| Agent | Role |
|---|---|
| `qa-gate` | Manual test checklist verification — cross-browser, mobile, form submission, accessibility |
| `release-gate` | Final independent check before merge to main. Produces release evidence document. |
| `copy-reviewer` | Reviews marketing copy against FPM brand voice — tone, clarity, accuracy |
| `seo-gate` | Reviews meta tags, headings, alt text, structured data for SEO compliance |

---

## Gate exit criteria

| Stage | Gate agent | Exit criteria | Evidence output |
|---|---|---|---|
| Requirement | `requirements-gate` | Complete, unambiguous, testable. GDPR implications flagged. | Signed-off requirement |
| Specification | `spec-gate` | Design tokens, copy, edge cases, GDPR data flows defined. | Spec approval / gaps listed |
| Build | `build-gate` | Code matches spec. No unresolved CRITICALs. | Code review report → Git PR |
| Security | `security-gate` | GDPR data flows verified. No new uncleared third parties. No secrets in source. | Security clearance report |
| QA | `qa-gate` | Cross-browser, mobile, form, accessibility checks pass. | Manual test evidence |
| Release | `release-gate` | All prior gates passed. Version bumped. Changelog updated. | Release artefact → Git tag |

---

## FPM-web specific agent behaviour

- **`build-gate`** must reference `index.html` as the single source file. Flag any suggestion to split files as out of scope.
- **`security-gate`** must check: no new third-party scripts without review, Worker URL and Web3Forms key are present (not placeholder), no credentials in source, GDPR data flows unchanged.
- **`requirements-gate`** — flag any requirement that introduces personal data collection, cookies, or analytics for extra GDPR scrutiny.
- **`spec-gate`** — must verify FPM design tokens are used (`--cream`, `--ink`, `--red`, Rajdhani, JetBrains Mono). Reject specs with vague visual descriptions.

---

## Agent operating rules

1. **Agents are read-only by default.** Only grant Write or Bash access where explicitly justified.
2. **CRITICAL = hard block.** Nothing proceeds until resolved and gate re-run.
3. **Agents do not write code.** If an agent starts writing implementation, the system prompt is wrong.
4. **Do not build Phase 2 agents speculatively.** Build when a specific recurring pain justifies it.

---

## Git convention

Use conventional commits tied to requirement IDs:

```
feat(REQ-001): add testimonials section
fix(REQ-007): correct Worker endpoint
chore: bump version to v1.1.0
```

---

## GDPR surface (fpm-web specific)

- Contact form collects: name, company, email, service interest, message — transmitted via Cloudflare Worker to Web3Forms
- Google Fonts loads from Google CDN — IP address transmitted; standard industry practice
- No cookies, no analytics, no tracking currently implemented
- Any new data collection or third-party script must be flagged at `requirements-gate` before spec work begins
- Privacy policy page is not yet implemented — required before external client onboarding
