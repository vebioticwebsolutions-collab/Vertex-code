import { createClient } from '@supabase/supabase-js';

export const POST = async ({ request }) => {
  try {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseKey = import.meta.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { user, productType, plankType, dimensions } = body;

    const { data, error } = await supabase
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
          length: dimensions.length ? Number(dimensions.length) : null,
          width: dimensions.width ? Number(dimensions.width) : null,
          height: dimensions.height ? Number(dimensions.height) : null,
          qty: dimensions.qty ? Number(dimensions.qty) : null,
          remarks: dimensions.remarks
        }
      ]);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Database Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}