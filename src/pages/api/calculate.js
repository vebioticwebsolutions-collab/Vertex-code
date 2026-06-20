import { callRenderBackend } from '../../lib/calc.js';

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const calcResult = await callRenderBackend(body);

    return new Response(JSON.stringify(calcResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Calculate Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
