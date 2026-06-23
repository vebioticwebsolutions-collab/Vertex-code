import { callRenderBackend } from '../../../lib/calc.js';
import { preflight, jsonWithCors } from '../../../lib/cors.js';

export const OPTIONS = ({ request }) => preflight(request);

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const calcResult = await callRenderBackend(body);
    return jsonWithCors(request, calcResult, { status: 200 });
  } catch (error) {
    console.error('Calculate Error:', error);
    return jsonWithCors(request, { error: error.message }, { status: 500 });
  }
};
