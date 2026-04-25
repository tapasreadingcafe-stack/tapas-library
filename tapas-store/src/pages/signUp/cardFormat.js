// Minimal card utilities. Keep the regex set lean — the point is a
// nice visual hint, not strict validation. Server side must still
// validate properly.

export function formatCardNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

export function formatExpiry(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

export function detectBrand(raw) {
  const d = digitsOnly(raw);
  if (!d) return null;
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^6(?:011|5)/.test(d)) return 'discover';
  if (/^(?:35|1800|2131)/.test(d)) return 'jcb';
  if (/^6/.test(d)) return 'rupay';
  return null;
}

export const BRAND_LABEL = {
  visa:       'VISA',
  mastercard: 'MC',
  amex:       'AMEX',
  discover:   'DISC',
  jcb:        'JCB',
  rupay:      'RUPAY',
};
