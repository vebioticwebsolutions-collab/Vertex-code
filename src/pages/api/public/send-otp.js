import { preflight, jsonWithCors } from '../../../lib/cors.js';

// NOTE: OTP is a stub here (out of scope per the plan — "OTP is already handled").
// Confirm the real OTP provider lives in this Astro backend before cutover (gap 7.15).
export const OPTIONS = ({ request }) => preflight(request);

export const POST = async ({ request }) => {
  const { phone } = await request.json();
  console.log(`[SERVER LOG]: Pretending to send OTP to ${phone}`);
  return jsonWithCors(request, { success: true, message: 'OTP Sent' }, { status: 200 });
};
