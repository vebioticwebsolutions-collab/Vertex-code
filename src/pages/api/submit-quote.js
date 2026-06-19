
import { createClient } from '@supabase/supabase-js';

const COLD_START_RETRIES = 2; // Render free-tier services sleep when idle and need ~30-50s to wake up
const ATTEMPT_TIMEOUT_MS = 60000;
const RETRY_DELAY_MS = 5000;

async function callRenderBackend(body) {
  let lastError;

  for (let attempt = 0; attempt <= COLD_START_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

    try {
      const renderResponse = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/submit-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!renderResponse.ok) {
        const errText = await renderResponse.text();
        const isColdStart = errText.includes('unreachable') || errText.includes('timed out');
        if (isColdStart && attempt < COLD_START_RETRIES) {
          lastError = new Error(`Calculation service error: ${errText}`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        throw new Error(`Calculation service error: ${errText}`);
      }

      return await renderResponse.json();
    } catch (error) {
      clearTimeout(timeout);
      lastError = error.name === 'AbortError'
        ? new Error('Calculation service timed out')
        : error;
      if (attempt < COLD_START_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
    }
  }

  throw lastError;
}

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { user, productType, plankType, materialType, dimensions } = body;

    const calcResult = await callRenderBackend(body);

    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseKey = import.meta.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('quotes')
      .insert([
        {
          full_name: user.fullName,
          company_name: user.companyName,
          gstin: user.gstin,
          email: user.email,
          mobile: user.mobile,
          product_type: productType,
          plank_type: plankType,
          material_type: materialType, // Sends the MS/GI choice to Supabase
          length: dimensions.length ? Number(dimensions.length) : null,
          width: dimensions.width ? Number(dimensions.width) : null,
          height: dimensions.height ? Number(dimensions.height) : null,
          qty: dimensions.qty ? Number(dimensions.qty) : null,
          remarks: dimensions.remarks,
          weight_kg: calcResult.weight_kg ?? null,
          sheet_width_mm: calcResult.sheet_width_mm ?? null,
          effective_length_mm: calcResult.effective_length_mm ?? null,
          rate_per_kg: calcResult.rate_per_kg ?? null,
          final_rate: calcResult.final_rate ?? null,
          weight_breakdown: calcResult.breakdown ?? null
        }
      ]);

    if (error) throw error;

    return new Response(JSON.stringify(calcResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Submit Quote Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
