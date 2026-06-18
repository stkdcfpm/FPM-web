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
**Detail:** The site collects personal data via the contact form (name, email, company) and transmits it to Web3Forms via the Cloudflare Worker. Under GDPR, a privacy notice is required. No privacy policy page exists.  
**Risk level:** Medium — not a live compliance breach while the site is pre-launch, but must be resolved before going live with external clients.  
**Decision:** Deferred until launch-readiness review.

### LEGAL-GAP-002 — No cookie notice
**Area:** GDPR — cookie consent  
**Logged:** v1.0.0  
**Detail:** Google Fonts loads from `fonts.googleapis.com` and `fonts.gstatic.com`, which may transmit IP addresses to Google. If analytics or tracking is added in future, a cookie consent mechanism is required.  
**Decision:** Low risk while no analytics or tracking is present. Review if any tracking scripts are added.

---

## Content

### COPY-GAP-001 — Stat figures are aspirational, not verified
**Area:** Hero section — stat bar  
**Logged:** v1.0.0  
**Detail:** Hero stats display "9+ Verified Suppliers", "2 Active Corridors", "30+ Product Categories". These should be reviewed against actual operational data before the site goes live and updated as the business grows.  
**Decision:** Update at launch-readiness review.
