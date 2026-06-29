# Known Gaps — FPM International Website

Items identified but deferred. Review before each release.

---

## Forms & Integration

### FORM-GAP-001 — Formspree replaced by Cloudflare Worker + Web3Forms
**Area:** Contact form  
**Logged:** v1.0.0  
**Status:** Resolved — form now submits via Cloudflare Worker to Web3Forms. Worker URL and Web3Forms access key are in hidden inputs in the form. No placeholder remains.

---

## Legal & Compliance

### LEGAL-GAP-001 — No privacy policy page
**Area:** GDPR — visitor data handling disclosure  
**Logged:** v1.0.0  
**Status:** Resolved v1.1.0 — `privacy.html` added covering contact form and AI chat data flows.

### LEGAL-GAP-002 — No cookie notice
**Area:** GDPR — cookie consent  
**Logged:** v1.0.0  
**Detail:** Google Fonts loads from `fonts.googleapis.com` and `fonts.gstatic.com`, which may transmit IP addresses to Google. If analytics or tracking is added in future, a cookie consent mechanism is required.  
**Decision:** Low risk while no analytics or tracking is present. Review if any tracking scripts are added.

---

## AI Chat

### AI-GAP-001 — No rate limiting on `/api/chat` endpoint
**Area:** Cloudflare Worker — AI chat  
**Logged:** v1.1.0  
**Status:** Partially resolved v1.1.1 — in-Worker per-IP rate limiter added (10 req / 60s). Resets per-isolate, not globally. Sufficient to deter casual abuse. Upgrade to Cloudflare native rate limiting rule before high-traffic promotion for global enforcement.

### AI-GAP-002 — Conversation history held client-side only
**Area:** AI chat — session continuity  
**Logged:** v1.1.0  
**Detail:** Chat history lives in a JS array in the page. Refreshing the page clears history. No server-side session store.  
**Decision:** Accepted — stateless design is intentional for a marketing chat widget. Not a gap to fix.

---

## Content

### COPY-GAP-001 — Stat figures are aspirational, not verified
**Area:** Hero section — stat bar  
**Logged:** v1.0.0  
**Detail:** Hero stats display "9+ Verified Suppliers", "2 Active Corridors", "30+ Product Categories". These should be reviewed against actual operational data before the site goes live and updated as the business grows.  
**Decision:** Update at launch-readiness review.
