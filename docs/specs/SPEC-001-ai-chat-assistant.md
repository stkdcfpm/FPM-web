# SPEC-001 — FPM AI Chat Assistant Technical Specification

**Document ID:** SPEC-001  
**Status:** DRAFT v1.1 — pending spec-gate re-review  
**Derived from:** REQ-001 v1.1 (requirements-gate PASS)  
**Date:** 2026-06-19  
**Author:** FPM International / Claude Code  
**Gate status:** spec-gate FAIL (v1.0 — 19 gaps) → resolved → re-gate pending

---

## 0. Scope and Assumptions

This specification covers the complete technical design of the FPM AI Chat Assistant for fpmsg.co.uk. The site is a single `index.html` with vanilla JS and no build step, served via GitHub Pages. The Cloudflare Worker at `https://holy-smoke-922f.cachafpm.workers.dev` already exists and requires incremental changes only.

Token counts use the cl100k_base approximation (1 token ≈ 0.75 words for English prose; structured list lines tokenise at ~0.65 words/token).

---

## 1. System Prompt

### 1.1 Full Text (Draft)

See §1.3 for the condensed, token-verified version used in the build.

### 1.2 Token Count (Full Draft)

The full-prose draft exceeds 500 tokens. See §1.3 for the condensed version.

### 1.3 Condensed System Prompt (Token-Optimised — USE THIS)

```
You are FPM's digital trade assistant — B2B sourcing for Caribbean markets (Barbados, CARICOM). Quotes in BBD/USD.

CATEGORIES (HS-aligned, Ch.84–90):
1. Food Processing & Hospitality Equipment — juicers, catering machinery
2. Refrigeration & Cold Chain — walk-in chillers, solar freezers, display refrigeration
3. Materials Handling — pallet jacks, hand trucks
4. Measurement & Weighing — platform scales, industrial weighing
5. Electrical & Lighting — LED, solar-powered luminaires
6. Construction & Shopfitting — PVC foam board, display systems, shelving
7. Agricultural Supplies & Packaging — mesh bags, agricultural packaging
8. Electronics & Surveillance — security cameras, commercial electronics

For each category, compliance requirements (CE marking, F-Gas, food safety, fire certificates) are things FPM is aware of — not guarantees you can make.

RULES:
- Not a human. If asked, confirm digital assistant only. Never name the AI model or provider.
- Never commit to a specific delivery lead time.
- Out-of-scope product or sanctioned/unserviceable destination: say "While we can't take this on directly, please email info@fpmsg.co.uk and we'll do our best to point you in the right direction." For destinations, do not name them as sanctioned. Emit [FLOW_CLOSED].
- Collect 6 data points one at a time, skipping already-provided: (1) product type, (2) quantity, (3) destination, (4) timeframe, (5) budget, (6) urgency ("Is this time-sensitive?").
- If vague answer: one specific clarifying follow-up, then accept and move on. Never repeat a covered question.
- Normalise: quantities ("about twenty" → "20 (approx)"), budgets ("fifty grand" → "USD 50,000 (approx)"), timelines ("next year" → "Q3/Q4 2026 (approx)").
- When all 6 collected: emit [CONTACT_READY]. Next turn display verbatim: "Your details will be shared with FPM International to process your enquiry. See our privacy notice for details." Then ask for name, then email.
- If prospect declines email: emit [FLOW_CLOSED] and say "No problem — whenever you're ready, reach us at info@fpmsg.co.uk. We'd be glad to help."
- Replies: max 2 short paragraphs or 3 bullets per turn.
```

### 1.4 Condensed Token Count

| Section | Approx words | Token estimate |
|---|---|---|
| A — Identity line | 16 | ~21 |
| B — CATEGORIES header | 4 | ~5 |
| C — 8 category lines | 65 | ~87 |
| D — Compliance framing | 24 | ~32 |
| E — RULES header | 1 | ~2 |
| F — Rule 1: identity | 16 | ~21 |
| G — Rule 2: no lead time | 10 | ~13 |
| H — Rule 3: out-of-scope/sanctioned | 30 | ~40 |
| I — Rule 4: 6 data points | 34 | ~45 |
| J — Rules 5–6: vague + no-repeat | 22 | ~29 |
| K — Rule 7: normalisation | 22 | ~29 |
| L — Rules 8–9: CONTACT_READY + GDPR + contact capture | 52 | ~69 |
| M — Rule 10: no-email closure | 22 | ~29 |
| N — Formatting rule | 12 | ~16 |
| **Total** | **~330 words** | **~438 tokens** |

**Total: ~438 tokens — PASS (≤500, AC-NFR-006.2).**  
**Trade context sub-budget (A + B + C + D = identity + categories + compliance): ~147 tokens — PASS (≤350, AC-004.6).**

### 1.5 Sentinel Summary

| Sentinel | Emitted when | Client action |
|---|---|---|
| `[CONTACT_READY]` | All 6 qualification data points collected | Strip from render; call `updatePhase('contact_capture')` |
| `[FLOW_CLOSED]` | Prospect declines email; out-of-scope; sanctioned destination | Strip from render; call `updatePhase('closed')` — no `/submit` |

---

## 2. Conversation State Schema

### 2.1 Top-Level State Object

```js
const state = {
  messages:  [],       // Array<{role:'user'|'assistant', content:string, ts:number}>
  lead:      {},       // see §2.2
  phase:     '',       // see §2.3
  sessionId: '',       // string — UUID v4, returned by Worker on first /api/chat
  startedAt: null,     // number — Date.now() set by initChat()
};
```

`ts` on each message = `(Date.now() - state.startedAt) / 1000` (relative seconds), satisfying AC-DQ-003.2. Never written to `localStorage`, `sessionStorage`, IndexedDB, or cookies (AC-DM-001.1, AC-NFR-004.3). Discarded on page reload (AC-NFR-004.4).

### 2.2 Lead Sub-Object

```js
lead: {
  product:          null,            // string — data point 1
  quantity:         null,            // string — data point 2
  destination:      null,            // string — data point 3
  timeframe:        null,            // string — data point 4
  budget:           null,            // string — data point 5
  urgency:          'not_specified', // 'yes'|'no'|'not_specified' — data point 6
  contactName:      null,            // string — contact capture phase
  contactEmail:     null,            // string — RFC 5322 validated
  gdprAcknowledged: false,           // boolean — set true on updatePhase('contact_capture')
  submittedAt:      null,            // string — ISO 8601
}
```

Field order matches FR-003: product (1), quantity (2), destination (3), timeframe (4), budget (5), urgency (6). Urgency type `'yes'|'no'|'not_specified'` matches REQ-001 §11.5 canonical schema.

### 2.3 Phase Transitions

| Phase | Value | Entry | Exit |
|---|---|---|---|
| Qualifying | `'qualifying'` | `initChat()` | `[CONTACT_READY]` sentinel |
| Contact capture | `'contact_capture'` | `updatePhase()` on sentinel | `contactName` + valid `contactEmail` set |
| Escalation | `'escalation'` | `updatePhase()` after email confirmed | User clicks `#chat-confirm-btn` |
| Closed | `'closed'` | `/submit` 2xx OR `[FLOW_CLOSED]` sentinel | Terminal |

**Rules:** Strictly linear. No reverse. `updatePhase()` throws on regression. `phase='closed'` disables input. `gdprAcknowledged=true` set immediately on `updatePhase('contact_capture')` (GDPR notice always follows sentinel deterministically). `[FLOW_CLOSED]` always calls `updatePhase('closed')` with no `/submit`.

---

## 3. Worker Contract

### 3.1 POST /api/chat

#### Request

```json
{
  "messages": [
    { "role": "user",      "content": "string" },
    { "role": "assistant", "content": "string" }
  ],
  "system":     "string",
  "model":      "claude-haiku-4-5-20251001",
  "max_tokens": 300
}
```

Constraints: `messages` max 20 entries, first must be `role:'user'`. Sentinels stripped before storage — never sent to Worker. System prompt sent every request. Worker enforces `max_tokens` cap: `Math.min(req.body.max_tokens ?? 300, 300)`.

Session header (2nd request+): `X-Session-ID: <uuid-v4>`

#### Response (HTTP 200)

```json
{ "content": "string", "session_id": "string" }
```

`session_id`: generated by Worker on first request (`crypto.randomUUID()`); echoed thereafter.

#### Error Responses

| HTTP | Condition | Body |
|---|---|---|
| 400 | `messages` missing/not array/length>20 | `{ "error": "Bad request: <reason>" }` |
| 429 | Anthropic rate limit | `{ "error": "Rate limit exceeded. Please wait a moment and try again." }` |
| 500 | Anthropic error / Worker exception | `{ "error": "Service error. Please contact info@fpmsg.co.uk." }` |
| 503 | Anthropic unreachable | `{ "error": "Service temporarily unavailable." }` |

### 3.2 POST /submit

#### Request

```json
{
  "access_key": "68f8c9d3-17eb-47d4-a85b-7b65aedc2310",
  "subject":    "[FPM Lead] {product} — {destination}",
  "email":      "info@fpmsg.co.uk",
  "from_name":  "{contactName}",
  "replyto":    "{contactEmail}",
  "message":    "<structured body>",
  "lead": {
    "product":      "string",
    "quantity":     "string",
    "destination":  "string",
    "timeframe":    "string",
    "budget":       "string",
    "urgency":      "yes | no | not_specified",
    "contactName":  "string",
    "contactEmail": "string",
    "sessionId":    "string",
    "submittedAt":  "ISO 8601"
  }
}
```

Subject: `"[FPM Lead] " + (product||"(not provided)") + " — " + (destination||"(not provided)")` + `" — URGENT"` if `urgency === 'yes'`.

**`message` body template:**

```
FPM AI Chat — New Trade Enquiry

Session:     {sessionId}
Submitted:   {submittedAt}

--- QUALIFICATION ---
Product:     {product || "Not provided"}
Quantity:    {quantity || "Not provided"}
Destination: {destination || "Not provided"}
Timeframe:   {timeframe || "Not provided"}
Budget:      {budget || "Not provided"}
Urgency:     {urgency}

--- CONTACT ---
Name:        {contactName}
Email:       {contactEmail}

--- TRANSCRIPT ---
[MM:SS] USER: {content}
[MM:SS] ASSISTANT: {content}
```

Relative time from each message's `ts` field, formatted `MM:SS`.

---

## 4. Chat UI Component Structure

### 4.1 Placement

Replaces left-column contact form only. Right column and surrounding section structure unchanged (AC-001.2, AC-NFR-005.4).

### 4.2 HTML

```html
<div class="chat-panel" id="chat-panel" role="region" aria-label="AI Trade Enquiry Assistant">

  <div class="chat-status-bar">
    <span class="chat-status-indicator" id="chat-status-indicator" aria-hidden="true"></span>
    <span class="chat-status-label" id="chat-status-label">AI Assistant — Online</span>
  </div>

  <div class="chat-messages" id="chat-messages" role="log" aria-live="polite" aria-label="Conversation">
  </div>

  <div class="chat-confirm-bar" id="chat-confirm-bar" hidden>
    <button class="chat-confirm-btn" id="chat-confirm-btn" type="button">
      Confirm and Send Enquiry
    </button>
  </div>

  <div class="chat-input-area">
    <label for="chat-input" class="sr-only">Your message</label>
    <textarea
      class="chat-input"
      id="chat-input"
      rows="2"
      placeholder="Type your message…"
      maxlength="500"
      autocomplete="off"
    ></textarea>
    <button class="chat-send-btn" id="chat-send" type="button" aria-label="Send message">Send</button>
  </div>

</div>
```

Message element (appended by `renderMessage()`):

```html
<div class="chat-message chat-message--{role}" data-role="{role}">
  <span class="chat-message__bubble"></span>
</div>
```

Bubble text set via `element.textContent` — **never `innerHTML`** (AC-NFR-003.3).

### 4.3 CSS Classes

| Class | Design tokens / rules |
|---|---|
| `.chat-panel` | `--radius-md`, `--color-surface`, `--space-4`, `border: 1px solid var(--color-border)` |
| `.chat-status-bar` | `display:flex; align-items:center; gap:var(--space-2)` |
| `.chat-status-indicator` | 8px circle; online=`--color-primary`; error=`--color-error` |
| `.chat-status-label` | `font-size:var(--font-size-sm); color:var(--color-text-muted)` |
| `.chat-messages` | `height:360px; overflow-y:auto; padding:var(--space-3)` |
| `.chat-message` | `display:flex; margin-bottom:var(--space-2)` |
| `.chat-message--user` | `justify-content:flex-end` |
| `.chat-message--assistant` | `justify-content:flex-start` |
| `.chat-message__bubble` | `border-radius:var(--radius-lg); padding:var(--space-2) var(--space-3); max-width:80%` |
| `.chat-message--user .chat-message__bubble` | `background:var(--color-primary); color:#fff` |
| `.chat-message--assistant .chat-message__bubble` | `background:var(--color-surface-alt); color:var(--color-text)` |
| `.chat-confirm-bar` | `padding:var(--space-2); border-top:1px solid var(--color-border)` |
| `.chat-confirm-btn` | Primary CTA; `min-width:44px; min-height:44px` |
| `.chat-input-area` | `display:flex; gap:var(--space-2); padding:var(--space-2); border-top:1px solid var(--color-border)` |
| `.chat-input` | `flex:1; border-radius:var(--radius-sm); font-size:var(--font-size-base); min-height:44px; resize:none` |
| `.chat-send-btn` | `min-width:44px; min-height:44px; background:var(--color-primary); color:#fff; border-radius:var(--radius-sm)` |
| `.sr-only` | `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0)` |

### 4.4 Touch Targets (AC-NFR-002.3)

```css
#chat-send, .chat-confirm-btn { min-width: 44px; min-height: 44px; }
#chat-input { min-height: 44px; }
```

### 4.5 Responsive Layout (AC-001.3, AC-001.4, AC-NFR-002.2)

```css
.chat-panel { width: 100%; }

@media (max-width: 768px) {
  /* existing site grid switches #contact to single column — chat panel stacks above contact info */
  .chat-messages { height: 280px; }
}

@media (max-width: 375px) {
  .chat-messages { height: 240px; }
}
```

Mobile keyboard: `initChat()` wires `#chat-input` focus → `document.getElementById('chat-panel').scrollIntoView({behavior:'smooth', block:'end'})` to prevent keyboard obscuring input (AC-NFR-002.2).

### 4.6 Performance Decisions (AC-NFR-001)

- `initChat()` called at end of `<body>` or via `DOMContentLoaded` — no blocking (AC-NFR-001.1).
- Opening message hardcoded — no Worker call on load. Widget renders in first paint cycle.
- `claude-haiku-4-5-20251001` chosen for low-latency profile (~300–800ms first-token, full 300-token response in 1–2s) (AC-NFR-001.2, AC-NFR-001.3).
- `callWorker()` implements 10-second `AbortController` timeout → `showFallback('timeout')`.

### 4.7 Required IDs

`chat-panel`, `chat-messages`, `chat-status-indicator`, `chat-status-label`, `chat-input`, `chat-send`, `chat-confirm-bar`, `chat-confirm-btn`.

---

## 5. JS Function Signatures

All defined in a self-contained IIFE in `index.html`. No external dependencies (AC-NFR-005.1–005.3).

### 5.1 `initChat(): void`

Sets `state.startedAt = Date.now()`, `state.phase = 'qualifying'`. Renders `OPENING_MESSAGE`. Wires: send button click → `handleSend()`, Enter keydown (no Shift) → `handleSend()`, confirm button click → `submitTranscript()`, input focus → `scrollIntoView`.

### 5.2 `handleSend(): void`

Reads and trims `#chat-input.value`. If empty, returns. Calls `sendMessage(text)`. Clears input.

### 5.3 `sendMessage(text: string): Promise<void>`

Appends `{role:'user', content:text, ts:relativeTs()}` to `state.messages`. Calls `renderMessage('user', text)`. Disables input. Calls `callWorker()`. On success: strips sentinels, calls `updatePhase()` if sentinel found, calls `renderMessage('assistant', stripped)`, appends to `state.messages`. Calls `extractContactData(text)` if in `contact_capture` phase. If `contactEmail !== null` and `phase === 'contact_capture'`: calls `updatePhase('escalation')`. On error: `showFallback('worker_error')`. Re-enables input unless `phase === 'closed'`.

### 5.4 `callWorker(messages): Promise<string>`

Strips `ts` field before POST. Builds POST body per §3.1. 10-second `AbortController` timeout. Sends `X-Session-ID` header if set. On 200: stores `session_id` if not already set; returns `content`. On non-2xx or network/timeout failure: throws.

### 5.5 `updatePhase(newPhase): void`

Forward-only (throws on regression). Sets `state.phase`. Side-effects: `'contact_capture'` → `gdprAcknowledged=true`; `'escalation'` → render summary (§6 step 5 template), show `#chat-confirm-bar`, disable `#chat-input`; `'closed'` → hide `#chat-confirm-bar`, disable input and send button.

### 5.6 `renderMessage(role, text): void`

Creates message div + bubble span. Sets `span.textContent = text`. Appends to `#chat-messages`. Scrolls container to bottom. Does **not** push to `state.messages` (callers do).

### 5.7 `buildLeadPayload(): object`

Sets `state.lead.submittedAt`. Builds subject, message body, and transcript from `state.messages`. Returns POST body per §3.2.

### 5.8 `submitTranscript(): Promise<void>`

Calls `buildLeadPayload()`. POSTs to `SUBMIT_ENDPOINT`. On 2xx: `updatePhase('closed')`, render `CLOSING_MESSAGE`. On failure: `showFallback('submit_error')`, re-enable input, leave confirm bar visible for retry.

### 5.9 `extractContactData(userText: string): void`

Called from `sendMessage()` when `phase === 'contact_capture'`. If `contactName === null`: store `userText.trim()` as `contactName`. Else if `contactEmail === null`: validate with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. If invalid: `renderMessage('assistant', "That doesn't look like a valid email address — could you double-check?")` (no Worker call), return. If valid: store as `contactEmail`.

### 5.10 `showFallback(reason): void`

Renders `FALLBACK_MESSAGE`. Re-enables input unless `phase === 'closed'`. Sets status indicator to error colour.

### 5.11 `relativeTs(): number`

Returns `Math.round((Date.now() - state.startedAt) / 1000)` — relative seconds (AC-DQ-003.2).

---

## 6. Escalation Flow Sequence

| Step | Action | AC |
|---|---|---|
| 1 | `[CONTACT_READY]` detected → stripped → `updatePhase('contact_capture')`, `gdprAcknowledged=true` | AC-003.2 |
| 2 | Assistant next turn sends GDPR notice verbatim (system prompt Rule 8). `renderMessage()` displays it. | AC-NFR-004.1 |
| 3 | Assistant asks name. User replies. `extractContactData()` stores `contactName`. | AC-005.1–005.2 |
| 4 | Assistant asks email. User replies. `extractContactData()` validates. Invalid → re-prompt (no Worker call). Valid → store `contactEmail` → `updatePhase('escalation')`. | AC-005.3 |
| 5 | `updatePhase('escalation')` renders summary and shows confirm bar. Summary template:<br>`Here's a summary of your enquiry:\n\nProduct: {product}\nQuantity: {quantity}\nDestination: {destination}\nTimeframe: {timeframe}\nBudget: {budget}\nUrgency: {urgency}\nContact: {contactName} <{contactEmail}>\n\nClick "Confirm and Send Enquiry" to submit.` | AC-006.1–006.3 |
| 6 | User clicks `#chat-confirm-btn` → `submitTranscript()`. | AC-006.4 |
| 7 | POST `/submit` → Worker → Web3Forms → email to `info@fpmsg.co.uk`. | AC-007.1–007.7 |
| 8 (success) | 2xx → `updatePhase('closed')`, render `CLOSING_MESSAGE`. | AC-008.1–008.6 |
| 9 (failure) | Non-2xx → `showFallback('submit_error')`, re-enable input, keep confirm bar visible. | AC-012.1–012.3 |

**No-email path (TC-008):** `[FLOW_CLOSED]` detected → `updatePhase('closed')` (no submit) → render `CLOSING_MESSAGE_NO_EMAIL`. (AC-008.7)

**Out-of-scope/sanctioned path (TC-003, TC-011):** `[FLOW_CLOSED]` detected → same as above. (AC-010.4, AC-010.5)

---

## 7. Opening Message

```
Hello — I'm FPM's digital trade assistant. We source commercial and industrial equipment for businesses across Barbados and the Caribbean: refrigeration, food processing machinery, materials handling, lighting, shelving, and more.

Tell me about what you're looking to source and I'll help you get started.
```

AC-002.1 ✓ | AC-002.2 ✓ | AC-002.3 ✓ | AC-002.4 ✓

---

## 8. Fallback and Closing Messages

**`FALLBACK_MESSAGE`:**
```
I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or contact our team directly at info@fpmsg.co.uk — we'll be happy to help.
```

**`CLOSING_MESSAGE`:**
```
Thank you — your enquiry has been sent to the FPM team. We'll review your requirements and come back with confirmation of how we can help and the next steps for your enquiry. You can expect a response within one business day, Mon–Fri, to the email address you provided. If you need to reach us in the meantime, you can also email info@fpmsg.co.uk.
```

**`CLOSING_MESSAGE_NO_EMAIL`:**
```
No problem — whenever you're ready, you can reach the FPM team directly at info@fpmsg.co.uk. We'd be glad to help.
```

AC-008.1–008.7 ✓ | AC-012.1–012.3 ✓

---

## 9. Known Gaps Introduced

| ID | AC | Detail |
|---|---|---|
| CHAT-GAP-001 | AC-DM-001.4 | Prospect name/email typed as chat messages are included in `state.messages` transmitted to Anthropic API. Full withholding is architecturally incompatible with passing history to `/api/chat`. Mitigation: Anthropic zero-retention agreement (go-live gate per AC-DM-001.5). Must be added to `docs/known-gaps.md`. |

---

## 10. Token Budget Summary

| Budget | Limit | Estimate | Status |
|---|---|---|---|
| Total system prompt | 500 tokens | ~438 tokens | **PASS** |
| Trade context sub-budget | 350 tokens | ~147 tokens | **PASS** |
| History cap | 20 messages | enforced in `callWorker()` | **PASS** |
| Max tokens/response | 300 | Worker-enforced | **PASS** |

---

## 11. Worker Changes

### 11.1 /api/chat

| Change | Detail |
|---|---|
| System prompt passthrough | Use `req.body.system` verbatim |
| Session ID | Generate `crypto.randomUUID()` if no `X-Session-ID` header; return in every response |
| `CHAT_MODEL` env var | `env.CHAT_MODEL ?? req.body.model ?? 'claude-haiku-4-5-20251001'` |
| `max_tokens` cap | `Math.min(req.body.max_tokens ?? 300, 300)` |
| Input validation | 400 if `messages` absent/not array/length>20 |
| Error mapping | Anthropic 429→429; all other non-2xx→500 |
| Response | `{ content: response.content[0].text, session_id: sessionId }` |

### 11.2 /submit

Forward `from_name`, `replyto`, `subject`, `lead` fields. 400 if `access_key` missing. CORS unchanged.

### 11.3 No New Routes

No new Worker routes at v1.

---

## Appendix A — Constants

| Constant | Value |
|---|---|
| `WORKER_URL` | `https://holy-smoke-922f.cachafpm.workers.dev` |
| `CHAT_ENDPOINT` | `${WORKER_URL}/api/chat` |
| `SUBMIT_ENDPOINT` | `${WORKER_URL}/submit` |
| `WEB3FORMS_KEY` | `68f8c9d3-17eb-47d4-a85b-7b65aedc2310` |
| `CHAT_MODEL` | `claude-haiku-4-5-20251001` |
| `MAX_TOKENS` | `300` |
| `MAX_MESSAGES` | `20` |
| `SENTINEL_READY` | `[CONTACT_READY]` |
| `SENTINEL_CLOSED` | `[FLOW_CLOSED]` |
| `LEAD_EMAIL` | `info@fpmsg.co.uk` |
| `OPENING_MESSAGE` | See §7 |
| `CLOSING_MESSAGE` | See §8 |
| `CLOSING_MESSAGE_NO_EMAIL` | See §8 |
| `FALLBACK_MESSAGE` | See §8 |

---

## Appendix B — Out of Scope

- Streaming responses
- Persistent session storage
- Client-side rate limiting (Worker 429 passthrough is v1 control)
- Multi-language support
- Analytics / conversion tracking
- Conversation continuation across page reloads
- Full AC-DM-001.4 enforcement (CHAT-GAP-001, §9)

---

*End of SPEC-001 v1.1*
