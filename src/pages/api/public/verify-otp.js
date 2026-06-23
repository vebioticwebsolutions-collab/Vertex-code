import { preflight, jsonWithCors } from '../../../lib/cors.js';

// NOTE: OTP is a stub here (out of scope per the plan — "OTP is already handled").
// Accepts any 4-digit code for testing. Confirm real verification before cutover (gap 7.15).
export const OPTIONS = ({ request }) => preflight(request);

export const POST = async ({ request }) => {
  const { phone, code } = await request.json();

  if (code && code.length === 4) {
    console.log(`[SERVER LOG]: OTP ${code} verified for ${phone}`);
    return jsonWithCors(request, { success: true }, { status: 200 });
  }

  return jsonWithCors(request, { error: 'Invalid OTP' }, { status: 400 });
};
