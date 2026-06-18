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
 */

const ALLOWED_ORIGINS = [
  'https://fpmsg.co.uk',
  'https://www.fpmsg.co.uk',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
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

    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return json(data, res.status, origin);
  } catch {
    return json({ success: false, message: 'Worker error on form submit' }, 500, origin);
  }
}

async function handleChat(request, env, origin) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI not configured' }, 503, origin);
  }

  try {
    const body = await request.json();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return json(data, res.status, origin);
  } catch {
    return json({ error: 'AI proxy error' }, 500, origin);
  }
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}
