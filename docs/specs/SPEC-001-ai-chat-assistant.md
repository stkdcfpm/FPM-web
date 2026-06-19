# SPEC-001 — FPM AI Chat Assistant Technical Specification

**Document ID:** SPEC-001  
**Status:** DRAFT v1.2 — pending spec-gate re-review  
**Derived from:** REQ-001 v1.1 (requirements-gate PASS)  
**Date:** 2026-06-19  
**Author:** FPM International / Claude Code  
**Gate status:** spec-gate FAIL (v1.0 — 19 gaps) → resolved → spec-gate FAIL (v1.1 — 3 gaps) → resolved → re-gate pending (v1.2)

---

## 0. Scope and Assumptions

This specification covers the complete technical design of the FPM AI Chat Assistant for fpmsg.co.uk. The site is a single `index.html` with vanilla JS and no build step, served via GitHub Pages. The Cloudflare Worker at `https://holy-smoke-922f.cachafpm.workers.dev` already exists and requires incremental changes only.

Token counts use the cl100k_base approximation (1 token ≈ 0.75 words for English prose; structured list lines tokenise at ~0.65 words/token).

---

## 1. System Prompt

### 1.1 Full Text (Reference Draft)

The condensed, token-verified version in §1.3 is the authoritative system prompt for the build. §1.1 is retained for readability only.

```
You are FPM's digital trade assistant — a B2B enquiry assistant for FPM Sourcing Group, a UK-based import/export company sourcing commercial and industrial equipment for Caribbean markets, primarily Barbados and the wider CARICOM region. Transactions are quoted in BBD or USD.

FPM PRODUCT CATEGORIES (HS-aligned):
1. Food Processing & Hospitality Equipment (Ch.84) — commercial juicers, catering machinery
2. Refrigeration & Cold Chain (Ch.84) — walk-in chillers, solar freezers, display refrigeration
3. Materials Handling & Logistics Equipment (Ch.84) — pallet jacks, hand trucks, dollies
4. Measurement & Weighing Equipment (Ch.90) — platform scales, industrial weighing systems
5. Electrical & Lighting (Ch.85) — LED lighting, solar-powered luminaires
6. Construction & Shopfitting Materials (Ch.39/94) — PVC foam board, display systems, shelving
7. Agricultural Supplies & Packaging (Ch.63/39) — mesh bags, agricultural packaging
8. Electronics & Surveillance (Ch.85) — security cameras, commercial electronics

For each category, compliance requirements (CE marking, F-Gas regulations, food safety certifications, fire certificates) are things FPM is aware of and considers — not guarantees you can make on their behalf.

QUALIFICATION RULES:
- You are not a human. If asked, confirm you are a digital assistant. Never disclose the AI model or provider.
- Never state a specific delivery lead time as a commitment.
- If an enquiry is outside the categories above, say: "While we can't take this on directly, please email us at info@fpmsg.co.uk and we'll do our best to point you in the right direction." Then emit [FLOW_CLOSED].
- If a destination appears outside FPM's serviceable regions, respond: "Unfortunately this destination is outside our current operating scope. While we can't take this on directly, please email us at info@fpmsg.co.uk and we'll do our best to point you in the right direction." Do not name the destination as sanctioned. Emit [FLOW_CLOSED].
- Collect exactly these 6 data points, one at a time, skipping any already provided: (1) product or equipment type, (2) estimated quantity or volume, (3) destination country or territory, (4) desired delivery timeframe, (5) budget range or price sensitivity, (6) urgency — ask "Is this time-sensitive or working to a deadline?"
- If the prospect gives a vague answer, ask one specific clarifying follow-up. If still vague, accept it and move on. Never repeat a covered question.
- If the prospect's message covers multiple data points, acknowledge all and skip the covered questions.
- Normalise: quantities ("about twenty" → "20 (approx)"), budgets ("fifty grand" → "USD 50,000 (approx)"), timelines ("next year" → "Q3/Q4 2026 (approx)").
- When all 6 collected: emit [CONTACT_READY] on a line by itself. Then on your next turn display this verbatim: "Your details will be shared with FPM International to process your enquiry. See our privacy notice for details." Then ask for name, then email.
- If the prospect declines to provide an email: emit [FLOW_CLOSED] and say "No problem — whenever you're ready, you can reach the FPM team directly at info@fpmsg.co.uk. We'd be glad to help."
- Replies: max 2 short paragraphs or 3 bullet points per turn.
```

### 1.2 Token Count (Reference Draft)

The reference draft above is ~680 tokens and exceeds the 500-token ceiling. See §1.3 for the condensed version used in the build.

### 1.3 Condensed System Prompt (Authoritative — Use This for Build)

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
- Out-of-scope product: say "While we can't take this on directly, please email info@fpmsg.co.uk and we'll do our best to point you in the right direction." Emit [FLOW_CLOSED].
- Unsupported/sanctioned destination: say "Unfortunately this destination is outside our current operating scope. While we can't take this on directly, please email info@fpmsg.co.uk and we'll do our best to point you in the right direction." Do not name it as sanctioned. Emit [FLOW_CLOSED].
- Collect 6 data points one at a time, skipping already-provided: (1) product type, (2) quantity, (3) destination, (4) timeframe, (5) budget, (6) urgency ("Is this time-sensitive?").
- If vague: one specific clarifying follow-up, then accept and move on. Never repeat a covered question.
- If multiple data points in one message: acknowledge all, skip covered questions.
- Normalise: quantities ("about twenty" → "20 (approx)"), budgets ("fifty grand" → "USD 50,000 (approx)"), timelines ("next year" → "Q3/Q4 2026 (approx)").
- When all 6 collected: emit [CONTACT_READY] on its own line. Next turn display verbatim: "Your details will be shared with FPM International to process your enquiry. See our privacy notice for details." Then ask for name, then email.
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
| H — Rule 3: out-of-scope | 24 | ~32 |
| I — Rule 4: unsupported destination | 30 | ~40 |
| J — Rule 5: 6 data points | 24 | ~32 |
| K — Rule 6: vague + no-repeat | 18 | ~24 |
| L — Rule 7: multi-point | 13 | ~17 |
| M — Rule 8: normalisation | 22 | ~29 |
| N — Rule 9: CONTACT_READY + GDPR | 42 | ~56 |
| O — Rule 10: no-email closure | 20 | ~27 |
| P — Formatting rule | 12 | ~16 |
| **Total** | **~341 words** | **~454 tokens** |

**Total: ~454 tokens — PASS (≤500 ceiling, AC-NFR-006.2).**  
**Trade context sub-budget (A + B + C + D = identity + categories + compliance): ~147 tokens — PASS (≤350 sub-limit, AC-004.6).**

Note: estimates may vary ±5%. If exact count exceeds 490 tokens, trim one example phrase per category line.

### 1.5 Sentinel Summary

| Sentinel | Emitted when | Client action |
|---|---|---|
| `[CONTACT_READY]` | All 6 qualification data points collected | Strip from render; call `updatePhase('contact_capture')` |
| `[FLOW_CLOSED]` | Prospect declines email; out-of-scope; unsupported destination | Strip from render; call `updatePhase('closed')` — no `/submit` call |

**Dual-sentinel handling:** If both sentinels appear in a single response (not possible under correct system prompt operation, but handled defensively), `[FLOW_CLOSED]` takes priority. `updatePhase('closed')` is called and `[CONTACT_READY]` is ignored.

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

`ts` on each message = `Math.round((Date.now() - state.startedAt) / 1000)` (relative seconds), satisfying AC-DQ-003.2. Never written to `localStorage`, `sessionStorage`, IndexedDB, or cookies (AC-DM-001.1, AC-NFR-004.3). Discarded on page reload (AC-NFR-004.4).

### 2.2 Lead Sub-Object

```js
lead: {
  product:          null,            // string — data point 1 (FR-003)
  quantity:         null,            // string — data point 2 (FR-003)
  destination:      null,            // string — data point 3 (FR-003)
  timeframe:        null,            // string — data point 4 (FR-003)
  budget:           null,            // string — data point 5 (FR-003)
  urgency:          'not_specified', // 'yes'|'no'|'not_specified' — data point 6 (FR-003)
  contactName:      null,            // string — contact capture phase
  contactEmail:     null,            // string — RFC 5322 validated before transcript fires
  gdprAcknowledged: false,           // boolean — set true on updatePhase('contact_capture')
  submittedAt:      null,            // string — ISO 8601, set on successful /submit
}
```

Field order matches FR-003: product (1), quantity (2), destination (3), timeframe (4), budget (5), urgency (6). Urgency type `'yes'|'no'|'not_specified'` matches REQ-001 §11.5 canonical schema.

### 2.3 Phase Values and Transition Rules

| Phase | Value | Entry condition | Exit condition |
|---|---|---|---|
| Qualifying | `'qualifying'` | `initChat()` on load | `[CONTACT_READY]` detected in assistant response |
| Contact capture | `'contact_capture'` | `updatePhase('contact_capture')` on sentinel | `contactName` and valid `contactEmail` both set |
| Escalation | `'escalation'` | `updatePhase('escalation')` after email confirmed | User clicks `#chat-confirm-btn` |
| Closed | `'closed'` | `/submit` 2xx OR `[FLOW_CLOSED]` sentinel | Terminal |

**Transition rules:**
1. Strictly linear. `updatePhase()` throws `Error` if `phaseOrder[newPhase] <= phaseOrder[state.phase]`.
2. All `updatePhase()` calls in `sendMessage()` are wrapped in try/catch. Regression throws are silently absorbed — `state.phase` remains unchanged and message rendering continues. This makes sentinel processing idempotent on retry.
3. `phase = 'closed'` disables `#chat-input` and `#chat-send`.
4. `gdprAcknowledged` is set to `true` immediately on `updatePhase('contact_capture')` (the GDPR notice always follows `[CONTACT_READY]` deterministically — no separate client detection needed).
5. `[FLOW_CLOSED]` always triggers `updatePhase('closed')` with no `/submit` call, regardless of current phase.

---

## 3. Worker Contract

### 3.1 POST /api/chat

#### Request Schema

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

**Constraints:**
- `messages`: max 20 entries. Client truncates from the front. First entry must have `role:'user'`. `ts` fields are stripped before POST. Sentinels are stripped before storage in `state.messages` and therefore never appear in the array sent to the Worker.
- `system`: full condensed system prompt (§1.3). Sent on every request; Worker passes unchanged.
- `model`: `"claude-haiku-4-5-20251001"`. Worker may override with `env.CHAT_MODEL`.
- `max_tokens`: 300. Worker enforces: `Math.min(req.body.max_tokens ?? 300, 300)`.

Session header (2nd request+): `X-Session-ID: <uuid-v4>`

#### Successful Response (HTTP 200)

```json
{ "content": "string", "session_id": "string" }
```

`content`: `response.content[0].text`. `session_id`: generated by Worker on first request (`crypto.randomUUID()`); echoed thereafter.

#### Error Responses

| HTTP | Condition | Body |
|---|---|---|
| 400 | `messages` absent/not array/length>20 | `{ "error": "Bad request: <reason>" }` |
| 429 | Anthropic rate limit | `{ "error": "Rate limit exceeded. Please wait a moment and try again." }` |
| 500 | Anthropic error / Worker exception | `{ "error": "Service error. Please contact info@fpmsg.co.uk." }` |
| 503 | Anthropic unreachable | `{ "error": "Service temporarily unavailable." }` |

---

### 3.2 POST /submit

#### Request Schema

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

Timestamp format: `MM:SS` (minutes:seconds from `state.startedAt`), e.g. `00:00`, `01:42`. Hours notation not used — a conversation will not run for hours (consistent with AC-DQ-003.2 examples `"00:00"`, `"00:42"`).

---

## 4. Chat UI Component Structure

### 4.1 Placement

Replaces left-column contact form only. Right column and surrounding section unchanged (AC-001.2, AC-NFR-005.4).

### 4.2 HTML Structure

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
    <textarea class="chat-input" id="chat-input" rows="2" placeholder="Type your message…" maxlength="500" autocomplete="off"></textarea>
    <button class="chat-send-btn" id="chat-send" type="button" aria-label="Send message">Send</button>
  </div>

</div>
```

Message element appended by `renderMessage()`:
```html
<div class="chat-message chat-message--{role}" data-role="{role}">
  <span class="chat-message__bubble"></span>
</div>
```

Bubble text: `span.textContent = text` — **never `innerHTML`** (AC-NFR-003.3).

### 4.3 CSS Classes

| Class | Design tokens / rules |
|---|---|
| `.chat-panel` | `--radius-md`, `--color-surface`, `--space-4`, `border:1px solid var(--color-border)` |
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

CSS variables: `--color-primary`, `--color-surface`, `--color-surface-alt`, `--color-text`, `--color-text-muted`, `--color-error`, `--color-border`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--space-2`, `--space-3`, `--space-4`, `--font-size-sm`, `--font-size-base`.

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

Mobile keyboard (AC-NFR-002.2): `initChat()` wires `#chat-input` focus → `document.getElementById('chat-panel').scrollIntoView({behavior:'smooth', block:'end'})`.

### 4.6 Performance Decisions (AC-NFR-001)

- `initChat()` at end of `<body>` or `DOMContentLoaded` — no blocking (AC-NFR-001.1).
- Opening message hardcoded — no Worker call on load. Widget renders in first paint.
- `claude-haiku-4-5-20251001` selected for low latency (~300–800ms first-token, full 300-token response in 1–2s) (AC-NFR-001.2–001.3).
- `callWorker()` has 10-second `AbortController` timeout → `showFallback('timeout')`.

### 4.7 Required IDs

`chat-panel`, `chat-messages`, `chat-status-indicator`, `chat-status-label`, `chat-input`, `chat-send`, `chat-confirm-bar`, `chat-confirm-btn`.

---

## 5. JS Function Signatures

All in a self-contained IIFE in `index.html`. No external dependencies (AC-NFR-005.1–005.3).

### 5.1 `initChat(): void`

Sets `state.startedAt = Date.now()`, `state.phase = 'qualifying'`. Calls `renderMessage('assistant', OPENING_MESSAGE)`. Wires: `#chat-send` click → `handleSend()`, Enter keydown (no Shift) → `handleSend()`, `#chat-confirm-btn` click → `submitTranscript()`, `#chat-input` focus → `scrollIntoView({behavior:'smooth', block:'end'})`.

### 5.2 `handleSend(): void`

Reads and trims `#chat-input.value`. If empty, returns. Calls `sendMessage(text)`. Clears input.

### 5.3 `sendMessage(text: string): Promise<void>`

Appends `{role:'user', content:text, ts:relativeTs()}` to `state.messages`. Calls `renderMessage('user', text)`. Disables `#chat-input` and `#chat-send`. Calls `callWorker()`. On success:

1. Strips `[CONTACT_READY]` and `[FLOW_CLOSED]` sentinels from `content`.
2. If `[FLOW_CLOSED]` was present: wraps `updatePhase('closed')` in try/catch (absorbs regression throw silently). No `/submit` call.
3. Else if `[CONTACT_READY]` was present: wraps `updatePhase('contact_capture')` in try/catch.
4. Calls `renderMessage('assistant', strippedContent)`. Appends to `state.messages`.
5. If `state.phase === 'contact_capture'`: calls `extractContactData(text)`.
6. If `state.lead.contactEmail !== null` and `state.phase === 'contact_capture'`: wraps `updatePhase('escalation')` in try/catch.

On error: calls `showFallback('worker_error')`. Re-enables input unless `state.phase === 'closed'`.

**Dual-sentinel rule (defensive):** `[FLOW_CLOSED]` check runs before `[CONTACT_READY]`. If both present, only `[FLOW_CLOSED]` is acted upon.

### 5.4 `callWorker(messages): Promise<string>`

Strips `ts` field from each message before POST. Builds body per §3.1. 10-second `AbortController` timeout. Sends `X-Session-ID: state.sessionId` if set. On 200: stores `session_id` if `state.sessionId` empty; returns `content`. On non-2xx or network/timeout failure: throws.

### 5.5 `updatePhase(newPhase): void`

Phase order: `{qualifying:0, contact_capture:1, escalation:2, closed:3}`. Throws if `phaseOrder[newPhase] <= phaseOrder[state.phase]`. Sets `state.phase`. Side-effects:
- `'contact_capture'`: `state.lead.gdprAcknowledged = true`.
- `'escalation'`: renders summary (see §6 step 5 template), removes `hidden` from `#chat-confirm-bar`, sets `#chat-input.disabled = true`.
- `'closed'`: adds `hidden` to `#chat-confirm-bar`, disables input and send button.

### 5.6 `renderMessage(role, text): void`

Creates `.chat-message.chat-message--{role}` div + `.chat-message__bubble` span. Sets `span.textContent = text`. Appends to `#chat-messages`. Scrolls container to bottom. Does not push to `state.messages`.

### 5.7 `buildLeadPayload(): object`

Sets `state.lead.submittedAt`. Builds subject, `message` body from template (§3.2), and transcript from `state.messages` with `MM:SS` timestamps. Returns `/submit` POST body — does not POST.

### 5.8 `submitTranscript(): Promise<void>`

Calls `buildLeadPayload()`. POSTs to `SUBMIT_ENDPOINT`. On 2xx: `updatePhase('closed')`, renders `CLOSING_MESSAGE`. On failure: `showFallback('submit_error')`, re-enables input, leaves confirm bar visible for retry.

### 5.9 `extractContactData(userText: string): void`

Called from `sendMessage()` when `phase === 'contact_capture'`. If `contactName === null`: stores `userText.trim()` as `contactName` (the system prompt always asks name before email, so the first user message in this phase is the name). Else if `contactEmail === null`: validates with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. If invalid: `renderMessage('assistant', "That doesn't look like a valid email address — could you double-check?")` (no Worker call). If valid: stores as `contactEmail`.

**Dependency note:** This function assumes name is always requested before email, guaranteed by the system prompt ordering. If the system prompt is changed, this function must be reviewed.

**AC-DM-001.4 note:** Name and email typed as chat messages are included in `state.messages` transmitted to Anthropic. See §9 (CHAT-GAP-001).

### 5.10 `showFallback(reason): void`

Renders `FALLBACK_MESSAGE`. Re-enables input unless `phase === 'closed'`. Sets status indicator to error colour and label to `'Connection error'`.

### 5.11 `relativeTs(): number`

Returns `Math.round((Date.now() - state.startedAt) / 1000)` (AC-DQ-003.2).

---

## 6. Escalation Flow Sequence

| Step | Action | AC |
|---|---|---|
| 1 | `[CONTACT_READY]` detected → stripped → `updatePhase('contact_capture')` (in try/catch). `gdprAcknowledged = true`. | AC-003.2 |
| 2 | Assistant’s next turn (from Worker) contains GDPR notice verbatim per system prompt Rule 9. `renderMessage()` displays it. | AC-NFR-004.1 |
| 3 | Assistant asks name. User replies. `extractContactData()` stores `contactName`. | AC-005.1–005.2 |
| 4 | Assistant asks email. User replies. `extractContactData()` validates. Invalid → re-prompt (no Worker call). Valid → store `contactEmail` → `updatePhase('escalation')` (in try/catch). | AC-005.3 |
| 5 | `updatePhase('escalation')` renders summary and shows confirm bar. Summary template:<br><pre>Here's a summary of your enquiry:\n\nProduct: {product}\nQuantity: {quantity}\nDestination: {destination}\nTimeframe: {timeframe}\nBudget: {budget}\nUrgency: {urgency}\nContact: {contactName} <{contactEmail}>\n\nClick "Confirm and Send Enquiry" to submit.</pre> | AC-006.1–006.3 |
| 6 | User clicks `#chat-confirm-btn` → `submitTranscript()`. | AC-006.4 |
| 7 | POST `/submit` → Worker → Web3Forms → `info@fpmsg.co.uk`. | AC-007.1–007.7 |
| 8 (success) | 2xx → `updatePhase('closed')`, render `CLOSING_MESSAGE`. | AC-008.1–008.6 |
| 9 (failure) | Non-2xx → `showFallback('submit_error')`, re-enable input, keep confirm bar visible. | AC-012.1–012.3 |

**No-email path (TC-008):** `[FLOW_CLOSED]` → `updatePhase('closed')` (no submit) → render `CLOSING_MESSAGE_NO_EMAIL`. (AC-008.7, AC-010.5)

**Out-of-scope / sanctioned (TC-003, TC-011):** Same `[FLOW_CLOSED]` handling — no transcript. (AC-010.4, AC-010.5)

---

## 7. Opening Message

Constant `OPENING_MESSAGE`, hardcoded, rendered by `initChat()` — no Worker call on load.

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

**`CLOSING_MESSAGE`** (email provided):
```
Thank you — your enquiry has been sent to the FPM team. We'll review your requirements and come back with confirmation of how we can help and the next steps for your enquiry. You can expect a response within one business day, Mon–Fri, to the email address you provided. If you need to reach us in the meantime, you can also email info@fpmsg.co.uk.
```

**`CLOSING_MESSAGE_NO_EMAIL`** (prospect declined email):
```
No problem — whenever you're ready, you can reach the FPM team directly at info@fpmsg.co.uk. We'd be glad to help.
```

AC-008.1–008.7 ✓ | AC-012.1–012.3 ✓

---

## 9. Known Gaps Introduced

| ID | AC | Detail |
|---|---|---|
| CHAT-GAP-001 | AC-DM-001.4 | Prospect name and email typed in chat are transmitted to Anthropic API as part of `state.messages`. Strict withholding is architecturally incompatible with passing conversation history to `/api/chat`. Mitigation: Anthropic zero-retention agreement (go-live gate, AC-DM-001.5). Must be added to `docs/known-gaps.md` before go-live. |

---

## 10. Token Budget Summary

| Budget | Limit | Estimate | Status |
|---|---|---|---|
| Total system prompt (§1.3) | 500 tokens | ~454 tokens | **PASS** |
| Trade context sub-budget (A+B+C+D) | 350 tokens | ~147 tokens | **PASS** |
| History cap | 20 messages | enforced in `callWorker()` | **PASS** |
| Max tokens/response | 300 | Worker-enforced | **PASS** |

---

## 11. Worker Changes Required

### 11.1 /api/chat

| Change | Detail |
|---|---|
| System prompt passthrough | Use `req.body.system` verbatim. |
| Session ID | Generate `crypto.randomUUID()` if no `X-Session-ID` header; return in every response. |
| `CHAT_MODEL` env var | `env.CHAT_MODEL ?? req.body.model ?? 'claude-haiku-4-5-20251001'`. |
| `max_tokens` cap | `Math.min(req.body.max_tokens ?? 300, 300)`. |
| Input validation | 400 if `messages` absent/not array/length>20. |
| Error mapping | Anthropic 429→429; all other non-2xx→500. |
| Response | `{ content: response.content[0].text, session_id: sessionId }`. |

### 11.2 /submit

Forward `from_name`, `replyto`, `subject`, `lead` unchanged. 400 if `access_key` missing. CORS unchanged.

### 11.3 No New Routes

No new Worker routes at v1.

---

## Appendix A — Constants

| Constant | Value |
|---|---|
| `WORKER_URL` | `https://holy-smoke-922f.cachafpm.workers.dev` |
| `CHAT_ENDPOINT` | `${WORKER_URL}/api/chat` |
| `SUBMIT_ENDPOINT` | `${WORKER_URL}/submit` |
| `WEB3FORMS_KEY` | `68f8c9d3-17eb-47d4-a85b-7b65aedc2310` (public) |
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

*End of SPEC-001 v1.2 — FPM AI Chat Assistant Technical Specification*
