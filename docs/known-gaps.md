# Known Gaps — FPM International Website

Items identified but deferred. Review before each release.

---

## Forms & Integration

### FORM-GAP-001 — Formspree form ID is a placeholder
**Area:** Contact form — `action` attribute  
**Logged:** v1.0.0  
**Detail:** The contact form `action` is set to `https://formspree.io/f/YOUR_FORM_ID`. In the current state, the JS detects this placeholder and simulates a success response rather than submitting. A real Formspree form must be created and the ID substituted before the site is live.  
**Decision:** Deferred until Formspree account is set up.

---

## Legal & Compliance

### LEGAL-GAP-001 — No privacy policy page
**Area:** GDPR — visitor data handling disclosure  
**Logged:** v1.0.0  
**Detail:** The site collects personal data via the contact form (name, email, company) and transmits it to Formspree. Under GDPR, a privacy notice is required. No privacy policy page exists. The footer form notice says "Your details are never shared with third parties" — this is inaccurate (Formspree is a third-party processor) and must be corrected.  
**Risk level:** Medium — not a live compliance breach while the site is pre-launch, but must be resolved before going live.  
**Decision:** Deferred until launch-readiness review.

### LEGAL-GAP-002 — No cookie notice
**Area:** GDPR — cookie consent  
**Logged:** v1.0.0  
**Detail:** Google Fonts loads from `fonts.googleapis.com` and `fonts.gstatic.com`, which may set cookies or transmit IP addresses to Google. If analytics or tracking is added in future, a cookie consent mechanism is required.  
**Decision:** Low risk while no analytics or tracking is present. Review if any tracking scripts are added.

---

## Content

### COPY-GAP-001 — Stat figures are aspirational, not verified
**Area:** Hero section — stat bar  
**Logged:** v1.0.0  
**Detail:** Hero stats display "9+ Verified Suppliers", "2 Active Corridors", "30+ Product Categories". These should be reviewed against actual operational data before the site goes live and updated as the business grows.  
**Decision:** Update at launch-readiness review.
