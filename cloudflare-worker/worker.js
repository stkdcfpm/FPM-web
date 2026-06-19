/**
 * FPM International — Cloudflare Worker
 *
 * Routes:
 *   POST /submit      — contact form → Web3Forms
 *   POST /api/chat    — AI assistant → Anthropic (key never leaves this Worker)
 *   OPTIONS *         — CORS preflight
 *
 * Environment variables (set in Cloudflare dashboard, never in source):
 *   ANTHROPIC_API_KEY  — Anthropic API key
 *   CHAT_MODEL         — optional model override (default: claude-haiku-4-5-20251001)
 */

const ALLOWED_ORIGINS = [
  'https://fpmsg.co.uk',
  'https://www.fpmsg.co.uk',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const { pathname } = new URL(request.url);

    if (pathname === '/submit' && request.method === 'POST') {
      return handleForm(request, origin);
    }

    if (pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env, origin);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleForm(request, origin) {
  try {
    const body = await request.json();
    if (!body.access_key) {
      return json({ error: 'Missing access_key' }, 400, origin);
    }
    const res = await fetch('https://api.web3forms.com/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    return json(data, res.status, origin);
  } catch {
    return json({ error: 'Service error. Please contact info@fpmsg.co.uk.' }, 500, origin);
  }
}

async function handleChat(request, env, origin) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'Service temporarily unavailable.' }, 503, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400, origin);
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return json({ error: 'messages must be an array.' }, 400, origin);
  }
  if (body.messages.length > 20) {
    return json({ error: 'Too many messages.' }, 400, origin);
  }

  const sessionId = request.headers.get('X-Session-ID') || crypto.randomUUID();
  const model     = env.CHAT_MODEL ?? body.model ?? 'claude-haiku-4-5-20251001';
  const maxTokens = Math.min(body.max_tokens ?? 300, 300);

  const anthropicBody = {
    model,
    max_tokens: maxTokens,
    messages:   body.messages,
  };
  if (body.system) anthropicBody.system = body.system;

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify(anthropicBody),
    });
  } catch {
    return json({ error: 'Service temporarily unavailable.' }, 503, origin);
  }

  if (!res.ok) {
    if (res.status === 429) {
      return json({ error: 'Rate limit exceeded. Please wait a moment and try again.' }, 429, origin);
    }
    return json({ error: 'Service error. Please contact info@fpmsg.co.uk.' }, 500, origin);
  }

  try {
    const data = await res.json();
    return json({ content: data.content[0].text, session_id: sessionId }, 200, origin);
  } catch {
    return json({ error: 'Service error. Please contact info@fpmsg.co.uk.' }, 500, origin);
  }
}
