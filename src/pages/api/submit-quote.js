
import { createClient } from '@supabase/supabase-js';
import { callRenderBackend } from '../../lib/calc.js';

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { user, productType, plankType, materialType, dimensions, calcResult: precomputedResult } = body;

    // If the calc was already triggered earlier (when Business Details was shown),
    // reuse it instead of waiting on the render backend again here.
    const calcResult = precomputedResult ?? await callRenderBackend(body);

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
