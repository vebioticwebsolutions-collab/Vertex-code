import { db } from '../../../db/client.ts';
import { quotes } from '../../../db/schema.ts';
import { callRenderBackend } from '../../../lib/calc.js';
import { normalizePhone } from '../../../lib/phone.js';
import { preflight, jsonWithCors } from '../../../lib/cors.js';

export const OPTIONS = ({ request }) => preflight(request);

export const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(request, { error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user, productType, plankType, materialType, dimensions } = body || {};
  if (!user || typeof user !== 'object' || !dimensions || typeof dimensions !== 'object') {
    return jsonWithCors(request, { error: 'Missing "user" or "dimensions"' }, { status: 400 });
  }

  try {
    // Pricing is ALWAYS computed server-side via the calc backend — we never
    // trust a client-supplied calcResult, or a caller could write arbitrary
    // rate/final_rate values straight into the quotes table.
    const calcResult = await callRenderBackend(body);

    await db.insert(quotes).values({
      fullName: user.fullName,
      companyName: user.companyName,
      gstin: user.gstin,
      email: user.email,
      mobile: user.mobile,
      customerKey: normalizePhone(user.mobile),
      productType: productType,
      plankType: plankType,
      materialType: materialType,
      length: dimensions.length ? Number(dimensions.length) : null,
      width: dimensions.width ? Number(dimensions.width) : null,
      height: dimensions.height ? Number(dimensions.height) : null,
      qty: dimensions.qty ? Number(dimensions.qty) : null,
      remarks: dimensions.remarks,
      weightKg: calcResult.weight_kg ?? null,
      sheetWidthMm: calcResult.sheet_width_mm ?? null,
      effectiveLengthMm: calcResult.effective_length_mm ?? null,
      ratePerKg: calcResult.rate_per_kg ?? null,
      finalRate: calcResult.final_rate ?? null,
      weightBreakdown: calcResult.breakdown ?? null,
    });

    return jsonWithCors(request, calcResult, { status: 200 });
  } catch (error) {
    // Log the detail server-side; don't leak internal error text cross-origin.
    console.error('Submit Quote Error:', error);
    return jsonWithCors(request, { error: 'Failed to submit quote' }, { status: 500 });
  }
};
