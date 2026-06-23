import { verifyInternalJwt, rejectAuth } from '../../../lib/internal-auth.js';

// Health/auth-probe for the server-to-server channel (tool → VPS). Proves the
// JWT gate works end-to-end. Real job endpoints (email/pdf/automation) land in A3.
// No CORS here by design: /api/internal/* is server-to-server, never browser-called.
export const GET = async ({ request }) => {
  const result = await verifyInternalJwt(request);
  if (!result.ok) return rejectAuth(result);

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'pstm-internal',
      caller: result.payload?.sub ?? null,
      ts: Date.now(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
