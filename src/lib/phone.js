// Customer rollup key (gap 7.8): normalize a phone number to its last 10 digits.
// Strips spaces, punctuation, a leading +91 / 0, etc. Returns null if fewer than
// 10 digits remain. Applied at write to BOTH quotes.customer_key and
// follow_ups.customer_key so a customer's leads/follow-ups roll up together.
//
// Edge case (accepted for v1): a shared office number over-merges distinct buyers.
export function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}
