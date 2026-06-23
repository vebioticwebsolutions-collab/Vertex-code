// Server-only: verifies the short-lived JWT minted by the internal tool (Repo B)
// for server-to-server calls to /api/internal/*. The JWT — not CORS — is the gate
// (gap 7.10/7.11). HS256 over the shared INTERNAL_JWT_SECRET.
import { jwtVerify } from 'jose';

// Returns { ok: true, payload }, or { ok: false, error, serverError? }.
// A missing secret is a server misconfiguration (serverError: true) — distinct
// from a bad/missing token so it doesn't masquerade as a client 401.
// TODO (B1): when Repo B mints these, also enforce issuer/audience claims here.
export async function verifyInternalJwt(request) {
  const secret = process.env.INTERNAL_JWT_SECRET;
  if (!secret) return { ok: false, serverError: true, error: 'Auth not configured' };

  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, error: 'Missing bearer token' };

  try {
    const { payload } = await jwtVerify(match[1], new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    return { ok: true, payload };
  } catch {
    return { ok: false, error: 'Invalid or expired token' };
  }
}

// Shared JSON Response builder for the internal API (no CORS — server-to-server).
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function unauthorized(error = 'Unauthorized') {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function serverError(error = 'Internal Server Error') {
  return new Response(JSON.stringify({ error }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Convenience: maps a failed verify result to the right Response.
export function rejectAuth(result) {
  return result.serverError ? serverError(result.error) : unauthorized(result.error);
}
