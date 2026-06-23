// src/middleware.js
export async function onRequest({ response }, next) {
  const res = await next();
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Prevents search engines from indexing your development URLs if they leak
  res.headers.set('X-Robots-Tag', 'index, follow'); 
  return res;
}