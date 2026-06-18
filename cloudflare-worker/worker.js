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

const ALLOWED_ORIGIN = 'https://fpmsg.co.uk';

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const { pathname } = new URL(request.url);

    if (pathname === '/submit' && request.method === 'POST') {
      return handleForm(request);
    }

    if (pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleForm(request) {
  try {
    const body = await request.json();

    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return json(data, res.status);
  } catch {
    return json({ success: false, message: 'Worker error on form submit' }, 500);
  }
}

async function handleChat(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI not configured' }, 503);
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
    return json(data, res.status);
  } catch {
    return json({ error: 'AI proxy error' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
