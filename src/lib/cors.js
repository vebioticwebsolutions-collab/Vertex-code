// CORS for /api/public/* only. The public quote form is same-origin with
// app.<domain>, so CORS is a no-op there; it exists so the live root-domain site
// (a different origin) can call the public quote API if it embeds the form.
//
// Configure allowed origins via PUBLIC_ALLOWED_ORIGINS (comma-separated), e.g.
//   PUBLIC_ALLOWED_ORIGINS=https://app.example.com,https://example.com
// If unset, no cross-origin headers are emitted (same-origin still works).
function allowedOrigins() {
  return (process.env.PUBLIC_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function corsHeaders(request) {
  const headers = { Vary: 'Origin' };
  const origin = request.headers.get('origin');
  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

// Preflight responder for OPTIONS.
export function preflight(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

// JSON Response with CORS headers merged in.
export function jsonWithCors(request, body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request), ...(init.headers || {}) },
  });
}
