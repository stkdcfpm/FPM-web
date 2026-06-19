# REQ-001 — FPM AI Chat Assistant (Presales Qualification)

**Status:** Requirements-gate PASS  
**Version:** 1.1  
**Date:** 2026-06-19  
**Author:** FPM International / Claude Code  
**Gate status:** requirements-gate PASS (v1.1 — 2026-06-19)

---

## 1. Business Context

FPM International is a UK-registered trade intermediary (sole operator) operating fpmsg.co.uk. The site currently has a static contact form as its only lead capture mechanism. This requirement replaces it with an embedded AI chat assistant that qualifies leads conversationally and escalates structured transcripts to the operator by email.

The assistant is the primary revenue-generating touchpoint for the business. Getting this wrong — either by under-delivering (fails to convert visitors) or over-engineering (never ships) — has direct commercial impact.

---

## 2. Stakeholders

| Role | Party | Need |
|---|---|---|
| Operator | FPM International (sole trader) | Receive structured, pre-qualified leads by email within minutes of enquiry |
| Prospect | Business buyers sourcing goods | Fast, credible, knowledgeable engagement that justifies handing over contact details |
| Developer | Claude Code | Clear, testable, shippable requirements with no ambiguity |

---

## 3. Scope

### In scope (v1)
- Embedded chat widget replacing the static contact form on `index.html`
- Six-question lead qualification flow
- Product/trade context injected via system prompt (category familiarity, no hard logistics claims)
- In-conversation contact capture (name + email) before transcript fires
- Structured transcript email via Cloudflare Worker → Web3Forms to `info@fpmsg.co.uk`
- Strong closing/handoff message with specific response window commitment
- Graceful handling of ambiguous and out-of-scope input
- Mobile-optimised conversation flow (≤6 turns before escalation prompt)

### Out of scope (Phase 2)
- CRM / task creation integration
- Returning visitor recognition (requires persistent storage)
- Multi-language support
- Proactive follow-up / scheduler
- Document generation (quote PDF)
- SMS alerting to operator
- Specificity scoring / lead routing tiers

---

## 4. Functional Requirements

### FR-001 — Chat Widget Replaces Contact Form (Layout: Chat Left, Contact Info Right)

**Description:** The static contact form in the `#contact` section of `index.html` is replaced by an embedded chat interface in the left column. The contact info panel (`info@fpmsg.co.uk`, response time, operating regions) is retained in the right column as a permanent fallback. Both are visible at all times.

**Rationale:** B2B buyers may want to email directly before trusting a chat assistant. Retaining the contact info panel ensures the operator is reachable if the Worker is unavailable, and signals FPM is a real business.

**Acceptance Criteria:**
- AC-001.1: On page load, the `#contact` section left column displays a chat interface, not a form
- AC-001.2: The contact info panel (right column) is unchanged and always visible
- AC-001.3: The chat interface renders correctly at viewport widths 320px, 375px, 768px, and 1280px
- AC-001.4: On mobile (≤768px), the chat widget stacks above the contact info panel
- AC-001.5: No legacy form inputs remain in the DOM
- AC-001.6: Chat is keyboard-navigable (tab focus reaches input, enter submits)

---

### FR-002 — Opening Message (Earn the Conversation)

**Description:** The assistant opens with a message that signals trade domain expertise before asking any questions. It does not open with a bare question like "What product are you looking to source?"

**Acceptance Criteria:**
- AC-002.1: The opening message references at least one trade concept (e.g. sourcing, freight, landed cost, customs) to signal domain credibility
- AC-002.2: The opening message is no longer than 3 sentences
- AC-002.3: The opening message does not ask a question — it creates space for the prospect to describe their need
- AC-002.4: The assistant identifies itself as "FPM's digital trade assistant" or similar — never as Claude or an AI model name

---

### FR-003 — Six-Question Qualification Flow

**Description:** The assistant collects six data points across the conversation, one question at a time. It does not batch multiple questions in a single message.

**The six data points (in logical order):**
1. Product / category
2. Quantity / volume
3. Destination
4. Timeline / target delivery date
5. Budget anchor / target landed cost
6. Urgency signal ("Is this time-sensitive?")

**Acceptance Criteria:**
- AC-003.1: The assistant asks one question per message — never two in a single turn
- AC-003.2: All six data points are collected before the escalation prompt is shown
- AC-003.3: If a prospect's answer covers multiple data points unprompted, the assistant acknowledges and skips the already-answered fields
- AC-003.4: The assistant does not repeat a question already answered
- AC-003.5: The full qualification flow is completable in ≤8 conversational turns (opening + 6 questions + escalation prompt)

---

### FR-004 — Product / Trade Context in System Prompt

**Description:** The assistant's system prompt includes a 200–300 word trade context block covering FPM's commodity categories, operating geographies, and trade process knowledge. This enables credible, specific responses without hard logistics claims.

**Source of truth:** Stackd Ops portal (`stkdcfpm/stackd-ops`) — supplier list and line items are the canonical record of what FPM actively trades. The system prompt context block must reflect verified Stackd Ops categories only. Any new product category added to Stackd Ops must be reviewed for inclusion here before the assistant can claim familiarity with it.

**Recognised trade categories (HS-aligned, derived from Stackd Ops supplier and line item data):**

| Category | HS Chapter(s) | Stackd Ops evidence | Examples |
|---|---|---|---|
| Food Processing & Hospitality Equipment | Ch. 84 | Bokni (juicers), Rongchang (sugar cane juicers) | Centrifugal juicers, sugar cane presses, commercial catering machinery |
| Refrigeration & Cold Chain | Ch. 84 | Cinsamlex/Fuzhou Bote (freezers, chillers, cold storage) | Walk-in chillers, solar freezer units, commercial display refrigeration, cold storage units |
| Materials Handling & Logistics Equipment | Ch. 84 | Xingtai Xingcha (pallet jacks) | Pallet jacks, hand trucks, warehouse handling equipment |
| Measurement & Weighing Equipment | Ch. 90 | Changzhou Intelligent Weighing (platform scales) | Platform scales, industrial scales, commercial weighing equipment |
| Electrical & Lighting | Ch. 85 | Zhongshan Chuhui (solar LED floodlights) | LED lighting, solar-powered lighting, commercial luminaires |
| Construction & Shopfitting Materials | Ch. 39 / 94 | Shandong Jinbao (PVC foam board) | PVC foam board, acrylic sheets, display systems, commercial shelving and fitout materials |
| Agricultural Supplies & Packaging | Ch. 63 / 39 | Anhui HYY (onion mesh bags) | Mesh bags, agricultural packaging, storage and handling materials |
| Electronics & Surveillance | Ch. 85 | Amazon Business / Reolink (security cameras) | Security cameras, commercial electronics |

**System prompt authoring rules:**
- The context block covers category-level familiarity and trade process knowledge only — not specific supplier names, SKUs, MOQs, or pricing
- Compliance knowledge per category (e.g. CE marking, F-Gas refrigerant regulations, food safety certifications, fire certificates) may be referenced as things FPM is aware of — not as guarantees
- Caribbean destination knowledge (Barbados import requirements, CARICOM duty rates, BBD/USD FX) may be referenced as operational context
- The context block must be ≤350 tokens to stay within the NFR-006 system prompt budget

**Acceptance Criteria:**
- AC-004.1: When a prospect names any of the eight recognised categories above, the assistant demonstrates category familiarity (not a generic "we can help with that")
- AC-004.2: When a prospect names a product outside the eight categories, the assistant does not claim familiarity — it asks clarifying questions and escalates to the operator
- AC-004.3: The assistant never states a specific delivery lead time as a commitment
- AC-004.4: The assistant never states a specific MOQ, price, or supplier name
- AC-004.5: The assistant correctly references relevant compliance considerations (CE, F-Gas, food safety) as things the operator is aware of — not as guaranteed certifications
- AC-004.6: The system prompt context block does not exceed 350 tokens
- AC-004.7: If Stackd Ops adds a new supplier or product category, the system prompt must be updated in the same version delivery — not deferred

---

### FR-005 — Contact Capture Before Transcript Fires

**Description:** The assistant collects the prospect's name and email address in-conversation before attempting to send the transcript. This ensures lead data is not lost if the Web3Forms call fails.

**Acceptance Criteria:**
- AC-005.1: The assistant requests name and email before triggering the transcript send
- AC-005.2: If the prospect has already provided their name during the conversation, the assistant does not ask again
- AC-005.3: Email address is validated as a correctly formatted email before the transcript is sent
- AC-005.4: If the prospect declines to provide an email, the assistant offers the direct email `info@fpmsg.co.uk` as an alternative and gracefully closes

---

### FR-006 — Escalation Prompt

**Description:** Once all six data points and contact details are collected, the assistant presents an escalation prompt summarising what has been gathered and offering a "Send to Team" action.

**Acceptance Criteria:**
- AC-006.1: The escalation prompt summarises: product, quantity, destination, timeline, budget, urgency, and contact name
- AC-006.2: The escalation prompt includes a clearly labelled send action (button or instruction)
- AC-006.3: The prospect can review and confirm before the transcript is sent
- AC-006.4: The assistant does not send the transcript without the prospect triggering the action

---

### FR-007 — Structured Transcript Email

**Description:** The email sent to `info@fpmsg.co.uk` via Cloudflare Worker → Web3Forms contains a structured summary header followed by the full conversation log.

**Email structure:**
```
Subject: [FPM Lead] {Product} — {Destination} — {Urgency flag if applicable}

LEAD SUMMARY
------------
Name:        {name}
Email:       {email}
Product:     {product/category}
Quantity:    {quantity}
Destination: {destination}
Timeline:    {timeline}
Budget:      {budget anchor}
Urgency:     {urgency signal}
Received:    {ISO timestamp}

FULL TRANSCRIPT
---------------
{full message log}
```

**Acceptance Criteria:**
- AC-007.1: Email is sent to `info@fpmsg.co.uk`
- AC-007.2: Email subject line includes product and destination
- AC-007.3: Email subject line includes an urgency flag (e.g. `[URGENT]`) if the prospect indicated time sensitivity
- AC-007.4: The structured summary appears before the full transcript in the email body
- AC-007.5: All six qualification data points appear in the summary, even if a field was left blank (marked as "Not provided")
- AC-007.6: The prospect's email address appears in the summary so the operator can reply directly
- AC-007.7: The timestamp is in ISO 8601 format (e.g. `2026-06-19T14:32:00Z`)

---

### FR-008 — Closing Handoff Message

**Description:** After the transcript is sent, the assistant delivers a closing message that sets clear expectations for the prospect.

**Acceptance Criteria:**
- AC-008.1: The closing message confirms the enquiry has been received
- AC-008.2: The closing message states a specific response window ("within one business day, Mon–Fri")
- AC-008.3: The closing message summarises the next step: "We'll review your requirements and come back with confirmation of how we can help and the next steps for your enquiry"
- AC-008.4: The closing message tells the prospect to check the email address they provided for a response from FPM
- AC-008.5: The closing message provides the direct email `info@fpmsg.co.uk` as a fallback contact
- AC-008.6: The closing message does not promise a quote, price, or lead time
- AC-008.7: When the prospect declined to provide an email (TC-008 / AC-005.4), the closing message variant omits AC-008.4 (no "check your email" instruction) and instead reads: "No problem — whenever you're ready, you can reach the FPM team directly at info@fpmsg.co.uk. We'd be glad to help." No transcript email is sent.

---

### FR-009 — Graceful Handling of Ambiguous Input

**Description:** When a prospect provides under-specified answers ("electronics", "some containers", "not sure"), the assistant does not produce a thin transcript. It gently pushes for specificity.

**Acceptance Criteria:**
- AC-009.1: When a prospect gives a vague product answer, the assistant asks one clarifying follow-up before moving to the next question
- AC-009.2: The clarifying question is specific (e.g. "Could you tell me more — are we talking industrial equipment, consumer goods, or something else?")
- AC-009.3: If the prospect provides a second vague answer, the assistant accepts it and records "prospect unable to specify" rather than looping
- AC-009.4: The assistant does not ask more than one clarifying follow-up per data point

---

### FR-010 — Out-of-Scope Handling

**Description:** When a prospect's enquiry is clearly outside FPM's scope (wrong geography, consumer goods, services, non-trade requests), the assistant closes gracefully with a positive brand impression.

**Out-of-scope categories:**
- All OFAC/UN sanctioned countries (assistant must not engage with trade enquiries from these geographies)
- Pure consumer retail goods (B2C)
- Digital/software services
- Enquiries where the destination or origin geography is a sanctioned territory

**Referral handling:** If FPM cannot take on the business due to sanctions or geography, the assistant does not simply decline — it acknowledges the enquiry, explains FPM's current operational scope, and offers to refer the prospect to `info@fpmsg.co.uk` where the operator can assess whether a referral partner is appropriate.

**Acceptance Criteria:**
- AC-010.1: The assistant recognises and declines trade enquiries involving sanctioned countries (OFAC/UN list) without engaging in the qualification flow
- AC-010.2: The assistant declines requests for consumer retail goods or digital services with a brief explanation of what FPM handles
- AC-010.3: Out-of-scope messages for sanctioned geographies do not name the specific country as sanctioned — they state "this destination is outside our current operating scope"
- AC-010.4: All out-of-scope responses offer `info@fpmsg.co.uk` as the contact for referral or further discussion
- AC-010.5: No transcript email is sent for out-of-scope conversations
- AC-010.6: The referral offer is framed positively: "While we can't take this on directly, please email us at info@fpmsg.co.uk and we'll do our best to point you in the right direction"

---

### FR-011 — AI Identity Handling

**Description:** The assistant identifies as "FPM's digital trade assistant." If a prospect asks directly whether they are speaking to a human or AI, the assistant answers honestly without volunteering the underlying model or provider.

**Acceptance Criteria:**
- AC-011.1: The assistant never claims to be a human
- AC-011.2: If asked "Are you a bot/AI?", the assistant confirms it is a digital assistant and not a human
- AC-011.3: The assistant never names Claude, Anthropic, Haiku, or any model/provider
- AC-011.4: After disclosing it is a digital assistant, the conversation continues normally without disruption

---

### FR-012 — Demo / Fallback Mode

**Description:** If the Cloudflare Worker is unreachable, the assistant degrades gracefully rather than showing a blank error.

**Acceptance Criteria:**
- AC-012.1: If the Worker returns a non-200 response, the assistant displays an error message directing the prospect to `info@fpmsg.co.uk`
- AC-012.2: The error message does not expose technical details (no stack traces, no endpoint URLs)
- AC-012.3: If the Worker is unreachable entirely (network error), the same fallback message is displayed

---

## 5. Non-Functional Requirements

### NFR-001 — Performance

**Acceptance Criteria:**
- AC-NFR-001.1: The chat widget renders within 1 second of page load on a standard 4G mobile connection (no blocking requests)
- AC-NFR-001.2: The assistant's first response appears within 3 seconds of the prospect's first message under normal conditions
- AC-NFR-001.3: Subsequent assistant responses appear within 5 seconds

---

### NFR-002 — Mobile Usability

**Acceptance Criteria:**
- AC-NFR-002.1: The chat interface is fully functional at 320px viewport width with no horizontal scroll
- AC-NFR-002.2: The text input is not obscured by the mobile keyboard when focused
- AC-NFR-002.3: All interactive elements have a minimum touch target of 44×44px
- AC-NFR-002.4: The full qualification flow is completable on a mobile device without zooming

---

### NFR-003 — Security

**Acceptance Criteria:**
- AC-NFR-003.1: The Anthropic API key is never present in `index.html` or any client-side code
- AC-NFR-003.2: The API key is only accessible as a Cloudflare Worker environment variable
- AC-NFR-003.3: No user input is inserted into the DOM via `innerHTML` without sanitisation
- AC-NFR-003.4: The Web3Forms access key may appear in client-side code (it is a public form identifier, not a secret)

---

### NFR-004 — GDPR Compliance

**Acceptance Criteria:**
- AC-NFR-004.1: The data notice is displayed immediately before the assistant asks for name and email (FR-005 trigger point) — not at page load and not after personal data has been requested. The notice text is: "Your details will be shared with FPM International to process your enquiry. See our privacy notice for details." The prospect must see this message in the chat before their name or email is requested.
- AC-NFR-004.2: Personal data (name, email) is transmitted only to the Cloudflare Worker and onward to Web3Forms — no other third-party receives it
- AC-NFR-004.3: No personal data is stored in `localStorage`, `sessionStorage`, or cookies
- AC-NFR-004.4: The conversation history is held in-memory only and is lost on page refresh (no persistence)

---

### NFR-005 — Architecture Compliance

**Acceptance Criteria:**
- AC-NFR-005.1: All code remains in `index.html` — no new files, no build step, no framework introduced
- AC-NFR-005.2: No new external script dependencies beyond Google Fonts and the existing Cloudflare Worker
- AC-NFR-005.3: The chat widget uses vanilla JS only
- AC-NFR-005.4: The existing page sections (hero, services, products, corridors, about) are unaffected by this change

---

### NFR-006-A — Rate Limiting and Abuse Prevention

**Scope decision:** Worker rate limiting is explicitly out of scope at v1. Rationale: Haiku pricing at low lead volumes (< 50 leads/month) makes abuse cost negligible; Cloudflare's default DDoS protection provides baseline protection; the `/api/chat` endpoint requires a round-trip to Anthropic on every call which self-limits sustained abuse. If lead volume exceeds 50/month (Phase 2 trigger — see §11.2) or abuse is observed in production, Cloudflare's built-in rate limiting must be enabled as the first mitigation.

**Acceptance Criteria:**
- AC-NFR-006A.1: This out-of-scope decision is documented. No rate limiting implementation is required at v1.
- AC-NFR-006A.2: If Cloudflare Worker analytics show > 500 API calls/day from any single IP, the operator must investigate and enable rate limiting before the next version release.

---

### NFR-006 — Cost Control

**Acceptance Criteria:**
- AC-NFR-006.1: The model used is `claude-haiku-4-5-20251001` — verified as the current Haiku 4.5 model ID per Anthropic's API. No other model may be substituted without a spec change.
- AC-NFR-006.2: The system prompt total is ≤500 tokens. The trade context block (FR-004) is allocated ≤350 tokens as a sub-budget within the 500-token total. The remaining ≤150 tokens cover qualification instructions, identity framing, out-of-scope handling, and the GDPR notice trigger. Spec must verify the assembled prompt fits within 500 tokens before build begins.
- AC-NFR-006.3: Conversation history sent on each turn is capped at the last 20 messages to prevent unbounded token growth

---

## 6. Test Cases

### TC-001 — Happy Path: Full Qualification to Transcript
**Precondition:** Worker is deployed and reachable. Web3Forms key is valid.  
**Steps:**
1. Load `fpmsg.co.uk`, scroll to contact section
2. Read opening message — verify it does not start with a question
3. Type: "I need to source refrigeration units"
4. Answer each qualification question: quantity (20 units), destination (Barbados), timeline (Q3 2026), budget (USD 50,000), urgency (yes, contract deadline)
5. Provide name and email when requested
6. Review escalation summary and confirm send
7. Check `info@fpmsg.co.uk` inbox

**Expected result:** Email received at `info@fpmsg.co.uk` within 60 seconds with structured summary header. Subject line includes `[URGENT]`. All six fields populated in summary. Full transcript below. Closing message displayed in chat with 1-business-day response commitment.

---

### TC-002 — Ambiguous Product Input
**Steps:**
1. Open chat
2. When asked about product, type: "electronics"
3. Observe assistant response

**Expected result:** Assistant asks one specific clarifying question (e.g. "Could you be more specific — are these consumer electronics, industrial equipment, or something else?"). Does not move to next qualification question yet.

---

### TC-003 — Out-of-Scope Request
**Steps:**
1. Open chat
2. Describe need: "I'm looking for a web developer to build my website"

**Expected result:** Assistant politely declines, explains FPM handles physical goods sourcing and freight, provides `info@fpmsg.co.uk`, does not ask qualification questions, does not send transcript email.

---

### TC-004 — AI Identity Disclosure
**Steps:**
1. Open chat
2. Type: "Am I speaking to a real person or a bot?"

**Expected result:** Assistant confirms it is a digital assistant, not a human. Does not name Claude, Anthropic, or any model. Conversation continues naturally after disclosure.

---

### TC-005 — Worker Unreachable (Fallback Mode)
**Precondition:** Worker URL is temporarily unreachable (simulate by setting an invalid URL).  
**Steps:**
1. Load page and open chat
2. Send any message

**Expected result:** Assistant displays a fallback message directing the prospect to `info@fpmsg.co.uk`. No technical error details shown. No blank/broken state.

---

### TC-006 — Mobile Flow Completion
**Precondition:** Test on iPhone SE viewport (375×667px) or equivalent.  
**Steps:**
1. Load page on mobile
2. Scroll to contact section
3. Complete the full qualification flow through to transcript send

**Expected result:** All interactions work without zoom. Input not obscured by keyboard. Flow completes in ≤8 turns. No horizontal scroll.

---

### TC-007 — Contact Capture Before Transcript
**Precondition:** Worker is reachable.  
**Steps:**
1. Complete all six qualification questions
2. Do NOT provide name/email
3. Observe whether transcript send is triggered

**Expected result:** Assistant requests name and email before showing the escalation prompt. Transcript is not sent without contact details.

---

### TC-008 — Prospect Declines to Provide Email
**Steps:**
1. Complete qualification flow
2. When asked for email, respond: "I'd rather not"

**Expected result:** Assistant does not pressure. Provides `info@fpmsg.co.uk` as an alternative. Closes gracefully. No transcript sent.

---

### TC-009 — Transcript Email Structure Validation
**Steps:**
1. Complete TC-001 (happy path)
2. Open received email

**Expected result:** Email contains structured summary block above the transcript. All fields present (including any marked "Not provided"). Timestamp in ISO 8601. Subject line matches format `[FPM Lead] {Product} — {Destination}`.

---

### TC-010 — Multiple Data Points in Single Message
**Steps:**
1. Open chat
2. In first message, type: "I need 500 refrigeration units shipped to Barbados by September"

**Expected result:** Assistant acknowledges all four data points (product, quantity, destination, timeline) and does not re-ask them. Moves to remaining unanswered questions (budget, urgency).

---

### TC-011 — Sanctioned Geography Handling
**Steps:**
1. Open chat
2. Describe need: "I need to import goods into Iran / North Korea / Russia" (any sanctioned territory)

**Expected result:** Assistant does not engage in qualification. States "this destination is outside our current operating scope." Offers referral via `info@fpmsg.co.uk`. Does not name the country as "sanctioned." No transcript email sent.

---

### TC-012 — In-Scope Category Recognition (Hospitality / Retail Equipment)
**Steps:**
1. Open chat
2. Type: "I need walk-in chiller units for a supermarket"

**Expected result:** Assistant response demonstrates familiarity with commercial refrigeration (not a generic "we can help with that"). Moves to qualification flow. Does not quote specific lead times, prices, or MOQs.

---

### TC-013 — Contact Info Panel Remains Visible
**Steps:**
1. Load `fpmsg.co.uk` on desktop and mobile
2. Scroll to `#contact` section

**Expected result (desktop):** Chat widget in left column, contact info panel (`info@fpmsg.co.uk`, response time, operating regions) visible in right column simultaneously.  
**Expected result (mobile):** Chat widget above, contact info panel below. Both visible without scrolling past the section.

---

## 7. Definition of Done

A requirement is **DONE** when all of the following are true:

- [ ] All functional requirements (FR-001 through FR-012) are implemented in `index.html`
- [ ] All non-functional requirements (NFR-001 through NFR-006) are verified
- [ ] All thirteen test cases (TC-001 through TC-013) pass manually in Chrome and Safari on desktop and mobile
- [ ] `build-gate` agent has reviewed the implementation and returned PASS with no unresolved CRITICALs
- [ ] `security-gate` agent has reviewed the implementation and returned PASS with no unresolved CRITICALs
- [ ] GDPR data flow is documented: visitor → chat → Worker → Web3Forms → operator inbox (no other routing)
- [ ] `CLAUDE.md` updated to reflect new chat assistant
- [ ] `docs/version-history.md` updated with version bump
- [ ] `docs/known-gaps.md` updated with any identified gaps
- [ ] PR raised and reviewed before merge to `main`
- [ ] Transcript email received and verified end-to-end in production environment
- [ ] Cloudflare Worker redeployed with any required route or environment changes

---

## 8. Open Questions

| # | Question | Status | Answer |
|---|---|---|---|
| OQ-001 | What is FPM's committed response SLA? | **RESOLVED** | 1 business day minimum — initial response must include lead context summary and confirmed next steps |
| OQ-002 | Which commodity categories go in the system prompt? | **RESOLVED** | 8 HS-aligned categories derived from Stackd Ops — see FR-004 table |
| OQ-003 | Lead email destination? | **RESOLVED** | `info@fpmsg.co.uk` |
| OQ-004 | Chat replaces form or sits alongside contact info? | **RESOLVED** | Chat widget in left column (replacing form); contact info panel retained in right column as permanent fallback. Both visible at all times. |
| OQ-005 | Geographies out of scope? | **RESOLVED** | All OFAC/UN sanctioned countries. Out-of-scope enquiries from these geographies receive a graceful decline with a referral offer (see FR-010). |

---

## 9. Data Quality Requirements

### DQ-001 — Lead Data Completeness

Every transcript email must contain a complete, machine-readable summary block. Partial data must be explicitly flagged, not silently omitted.

| Field | Required? | Validation rule | Fallback if missing |
|---|---|---|---|
| Name | Yes | Non-empty string | Block transcript send — re-prompt |
| Email | Yes | RFC 5322 format | Block transcript send — re-prompt |
| Product/category | Yes | Non-empty string | Mark "Not provided" |
| Quantity | No | Numeric or descriptive string | Mark "Not provided" |
| Destination | Yes | Non-empty string | Mark "Not provided" |
| Timeline | No | Date, quarter, or descriptive string | Mark "Not provided" |
| Budget anchor | No | Currency + value, or "Not provided" | Mark "Not provided" |
| Urgency signal | No | Boolean-like: Yes / No / Not specified | Default "Not specified" |
| Timestamp | Auto | ISO 8601, UTC | Generated server-side in Worker |

**Acceptance Criteria:**
- AC-DQ-001.1: No transcript email is sent with a missing name or email field
- AC-DQ-001.2: All optional fields that were not collected appear in the summary as "Not provided" — never blank or absent
- AC-DQ-001.3: The urgency flag in the email subject line is only applied when the prospect explicitly indicated time sensitivity

---

### DQ-002 — Input Normalisation

The assistant normalises free-text answers into structured values before including them in the transcript summary. Raw conversational text appears in the full log only.

| Raw input | Normalised form |
|---|---|
| "about 20 units", "twenty" | "20 units (approx)" |
| "next year", "before Christmas" | "Q4 2026 (approx)" |
| "around fifty grand", "$50k" | "USD 50,000 (approx)" |
| "ASAP", "really urgent" | Urgency: Yes |
| "no rush", "whenever" | Urgency: No |

**Acceptance Criteria:**
- AC-DQ-002.1: The structured summary uses normalised values, not raw conversational text
- AC-DQ-002.2: Approximate values are marked with "(approx)" to signal operator that clarification may be needed
- AC-DQ-002.3: Normalisation never changes the meaning of what the prospect said — when uncertain, the assistant re-confirms before normalising

---

### DQ-003 — Conversation Integrity

The full transcript must be an accurate, unedited record of the conversation.

**Acceptance Criteria:**
- AC-DQ-003.1: Every message sent by the prospect and the assistant is included in the full transcript log
- AC-DQ-003.2: Messages are timestamped with relative time (e.g. "00:00", "00:42") or absolute UTC time
- AC-DQ-003.3: The transcript log is append-only — no message is edited or removed before sending
- AC-DQ-003.4: System messages and prompts are not included in the transcript (only user/assistant turns)

---

## 10. Data Management

### DM-001 — Data Residency and Retention

| Data type | Where it lives | Retention |
|---|---|---|
| Conversation history | Browser memory only (JS array) | Lost on page refresh — no persistence |
| Lead transcript | Operator inbox (`info@fpmsg.co.uk`) | Governed by operator's email retention policy |
| API calls | Cloudflare Worker (stateless) | No logging at Worker level unless explicitly enabled |
| Web3Forms submissions | Web3Forms dashboard | Per Web3Forms data retention policy (GDPR-compliant processor) |
| Anthropic API calls | Anthropic (per their data policy) | Not stored by default under zero-retention API agreement |

**Acceptance Criteria:**
- AC-DM-001.1: No personal data is written to `localStorage`, `sessionStorage`, IndexedDB, or cookies at any point
- AC-DM-001.2: Conversation history lives only in a JS array in memory for the duration of the browser session
- AC-DM-001.3: The Worker does not log request bodies or personal data to Cloudflare's logging infrastructure
- AC-DM-001.4: The implementation withholds the prospect's name and email from all `/api/chat` turns until the escalation step — name and email are only included in the final `/submit` payload to Web3Forms
- AC-DM-001.5: Before go-live, the operator must confirm that the Anthropic account in use has zero data retention enabled (via Anthropic Console or API agreement). This is a go-live gate, not a build gate. If zero retention cannot be confirmed, a known-gap entry must be added.
- AC-DM-001.6: Before go-live, the operator must confirm that a Data Processing Agreement is in place with Web3Forms (required under UK GDPR Article 28). Web3Forms provides a standard DPA. This is a go-live gate. If the DPA is not confirmed, a known-gap entry must be added.

---

### DM-002 — Data Flow Map

```
Prospect (browser)
    │
    ├─► [index.html JS] — holds conversation array in memory
    │         │
    │         ▼
    │   fetch POST /api/chat
    │         │
    │         ▼
    │   Cloudflare Worker (stateless)
    │         │
    │         ├─► Anthropic API /v1/messages
    │         │       └── returns assistant message
    │         │
    │         └─► (on escalation) fetch POST /submit
    │                   │
    │                   ▼
    │             Web3Forms API
    │                   │
    │                   ▼
    │          Email → info@fpmsg.co.uk
    │
    └─► [Prospect sees closing message in chat]
```

**Data boundaries:**
- Personal data (name, email) enters the data flow only at the escalation step — not before
- The Anthropic API receives the conversation history including product/trade details, but name and email are only included in the final escalation turn
- The Worker is stateless — it holds no data between requests

---

### DM-003 — GDPR Data Subject Rights

At v1 scale (pre-launch, no external clients), the operator handles data subject requests manually.

| Right | How fulfilled at v1 |
|---|---|
| Right to access | Operator searches email inbox for prospect's name/email |
| Right to erasure | Operator deletes the transcript email; Web3Forms submission deleted via Web3Forms dashboard |
| Right to portability | Transcript email forwarded to prospect on request |
| Right to object | Operator confirms no further processing; prospect not added to any list at v1 |

**Acceptance Criteria:**
- AC-DM-003.1: The chat interface displays a data notice before personal data is requested (FR-005): "Your details will be shared with FPM International to process your enquiry. See our privacy notice for details."
- AC-DM-003.2: No automated marketing, list subscription, or CRM entry is created from the transcript at v1

---

## 11. Architecture Model

### 11.1 Current State (v1)

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  index.html                                      │
│  ├── Chat UI (vanilla JS)                        │
│  ├── Conversation array [ ] (in-memory)          │
│  └── Hidden: workerUrl, Web3Forms access_key     │
│                                                  │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS POST
                   ▼
┌─────────────────────────────────────────────────┐
│           Cloudflare Worker (stateless)          │
│                                                  │
│  /api/chat  ──► Anthropic API (Haiku)            │
│  /submit    ──► Web3Forms API                    │
│                                                  │
│  Env vars: ANTHROPIC_API_KEY                     │
│  CORS: fpmsg.co.uk, www.fpmsg.co.uk only         │
└─────────────────────────────────────────────────┘
```

**Constraints:**
- Single `index.html` — no build step, no framework
- No persistent storage at any layer
- No auth, no session management
- All state lives in the browser for the duration of the session

---

### 11.2 Scalability Envelope

| Metric | v1 adequate | Phase 2 trigger |
|---|---|---|
| Lead volume | < 50 leads/month | > 50 leads/month |
| Operator headcount | 1 | 2+ (routing needed) |
| Response SLA | Manual, email-based | < 4 hours (automation needed) |
| Lead qualification accuracy | Manual review each lead | Pattern emerges — automate scoring |
| Conversation length | ≤ 8 turns | > 12 turns (conversation memory needed) |
| Model cost | < £20/month at Haiku rates | Cost becomes material |

---

### 11.3 Phase 2 Architecture (Planned, Not Built)

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  index.html (unchanged single file)              │
│  Chat UI + session ID (localStorage — Phase 2)   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Cloudflare Worker (enhanced)             │
│                                                  │
│  /api/chat  ──► Anthropic API                    │
│  /submit    ──► Web3Forms + CRM webhook          │
│  /session   ──► Cloudflare KV (returning         │
│                 visitor context store)           │
└──────────┬────────────────────┬─────────────────┘
           │                    │
           ▼                    ▼
    Anthropic API         CRM / Task system
    (claude-sonnet        (Stackd Ops API,
     for complex leads)    Notion, or similar)
```

**Phase 2 additions (in priority order):**
1. **Cloudflare KV** — lightweight key/value store for returning visitor session context
2. **CRM webhook** — on lead qualification, Worker POSTs structured lead JSON to Stackd Ops or a chosen CRM
3. **Lead scoring** — Worker assigns a score (1–3) based on completeness and urgency
4. **Model upgrade path** — high-score leads escalate to `claude-sonnet-4-6` for deeper engagement

---

### 11.4 Extension Points (Design Constraints for v1)

| Extension point | v1 implementation | Phase 2 hook |
|---|---|---|
| Conversation storage | In-memory JS array | Array structure must be JSON-serialisable — ready for KV persistence |
| Lead data structure | Sent as flat JSON to Web3Forms | JSON schema must match future CRM webhook payload (define schema now) |
| Model selection | Hardcoded to Haiku in Worker | Worker reads model from env var `CHAT_MODEL` — default Haiku, overridable |
| Session identity | None | Worker generates and returns a `sessionId` on first request — browser holds in memory only (not in localStorage at v1, to comply with AC-NFR-004.3). Phase 2 may store in localStorage under a separate privacy review. |
| Worker routes | `/api/chat`, `/submit` | Route structure supports adding `/session`, `/score`, `/crm` without breaking existing routes |

---

### 11.5 Lead JSON Schema (Canonical — v1 and Phase 2)

```json
{
  "schema_version": "1.0",
  "session_id": "uuid-v4",
  "received_at": "2026-06-19T14:32:00Z",
  "contact": {
    "name": "string",
    "email": "string (RFC 5322)"
  },
  "qualification": {
    "product": "string",
    "quantity": "string",
    "destination": "string",
    "timeline": "string",
    "budget": "string | null",
    "urgency": "yes | no | not_specified"
  },
  "meta": {
    "lead_score": null,
    "model_used": "claude-haiku-4-5-20251001",
    "turn_count": "integer",
    "transcript_length_tokens": "integer | null"
  },
  "transcript": [
    { "role": "assistant | user", "content": "string", "ts": "relative_seconds" }
  ]
}
```

**Notes:**
- `lead_score` is `null` at v1 — populated by Worker in Phase 2
- `session_id` is generated by the Worker at v1 even though it is not stored anywhere — ready for KV in Phase 2
- The `meta` block is extensible — new fields can be added without breaking existing consumers
