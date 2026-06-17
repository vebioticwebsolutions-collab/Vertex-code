export const POST = async ({ request }) => {
  const { phone, code } = await request.json();
  
  // Accept any 4 digit code for testing
  if (code && code.length === 4) {
    console.log(`[SERVER LOG]: OTP ${code} verified for ${phone}`);
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Invalid OTP' }), { status: 400 });
}