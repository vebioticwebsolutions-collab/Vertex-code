export const POST = async ({ request }) => {
  const { phone } = await request.json();
  
  console.log(`[SERVER LOG]: Pretending to send OTP to ${phone}`);
  
  return new Response(JSON.stringify({ success: true, message: 'OTP Sent' }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}