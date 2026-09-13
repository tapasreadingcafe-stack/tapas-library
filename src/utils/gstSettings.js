/* GST configuration — loading, validation, and mapping a bill line to a rate.
 *
 * Settings live in the `gst_settings` table rather than localStorage. Rates in
 * a browser are per-device: two tills could bill the same item at different
 * rates and neither would match the return.
 *
 * Each revenue stream is configured on its own: whether GST is charged on it
 * at all, at what rate, and whether its prices already contain the tax
 * (inclusive) or have it added at the till (exclusive). The cafe and the
 * library genuinely want different answers — a ₹60 chai can become ₹63 while
 * a ₹600 membership stays ₹600 — so one business-wide switch was never enough.
 */
import { supabase } from './supabase';

// Order here is the order the settings screen lists them in.
export const DEFAULT_RATES = {
  cafe:       { label: 'Cafe',            rate: 5,  hsn: '996331', enabled: true,  inclusive: false },
  library:    { label: 'Books',           rate: 0,  hsn: '4901',   enabled: false, inclusive: true  },
  membership: { label: 'Memberships',     rate: 18, hsn: '999723', enabled: false, inclusive: true  },
  fines:      { label: 'Fines & charges', rate: 18, hsn: '999799', enabled: false, inclusive: true  },
  events:     { label: 'Events',          rate: 18, hsn: '999293', enabled: false, inclusive: true  },
};

// GST slabs. 0 is a nil rate (still a reportable supply); a deposit is not a
// supply at all and never reaches this list.
export const GST_SLABS = [0, 5, 12, 18, 28];

export const GST_STATE_CODES = {
  '29': 'Karnataka', '27': 'Maharashtra', '07': 'Delhi', '33': 'Tamil Nadu',
  '36': 'Telangana', '32': 'Kerala', '24': 'Gujarat', '09': 'Uttar Pradesh',
  '19': 'West Bengal', '08': 'Rajasthan', '06': 'Haryana', '23': 'Madhya Pradesh',
  '03': 'Punjab', '10': 'Bihar', '21': 'Odisha', '02': 'Himachal Pradesh',
  '05': 'Uttarakhand', '20': 'Jharkhand', '22': 'Chhattisgarh', '18': 'Assam',
  '30': 'Goa', '34': 'Puducherry', '04': 'Chandigarh',
};

/**
 * Fill a saved rates object out to the full shape. A row saved before a field
 * existed, or saved by an older screen, must still resolve every stream to a
 * definite answer rather than silently to `undefined`.
 */
export function mergeRates(saved) {
  const out = {};
  for (const key of Object.keys(DEFAULT_RATES)) {
    const d = DEFAULT_RATES[key];
    const s = (saved && saved[key]) || {};
    out[key] = {
      label: d.label,
      rate: s.rate === undefined || s.rate === null || s.rate === '' ? d.rate : Number(s.rate) || 0,
      hsn: s.hsn ?? d.hsn,
      enabled: typeof s.enabled === 'boolean' ? s.enabled : d.enabled,
      inclusive: typeof s.inclusive === 'boolean' ? s.inclusive : d.inclusive,
    };
  }
  return out;
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

/**
 * Validate a GSTIN.
 *
 * Two levels, deliberately:
 *
 *   FORMAT is a hard failure. The 15-character shape (2-digit state code,
 *   10-character PAN, entity digit, 'Z', check character) is unambiguous and
 *   documented, so anything failing it is definitely wrong.
 *
 *   The CHECK DIGIT is only a warning. The published algorithm is implemented
 *   below, but I could not verify it against genuinely known-valid GSTINs
 *   offline. If the implementation were subtly wrong it would reject a REAL
 *   GSTIN and lock the owner out of turning GST on at all — a far worse
 *   failure than letting a typo through to a field they can see and re-read.
 *   So a mismatch flags "check this" and still lets them save.
 */
export function validateGstin(gstin) {
  const v = (gstin || '').trim().toUpperCase();
  if (!v) return { valid: false, reason: 'Enter a GSTIN' };
  if (v.length !== 15) return { valid: false, reason: 'A GSTIN is 15 characters' };
  if (!GSTIN_RE.test(v)) return { valid: false, reason: 'That is not a valid GSTIN format' };

  const state = GST_STATE_CODES[v.slice(0, 2)];
  const out = { valid: true, state: state || null, stateCode: v.slice(0, 2), normalised: v };
  if (!state) out.warning = `"${v.slice(0, 2)}" is not a state code I recognise — worth a check`;

  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = CHARS.indexOf(v[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(val / 36) + (val % 36);
  }
  const expected = CHARS[(36 - (sum % 36)) % 36];
  if (expected !== v[14]) {
    out.warning = 'The check digit does not match — worth re-reading, though it may just be my check.';
  }
  return out;
}

/** Load the single settings row. Returns null if the table isn't there yet. */
export async function loadGstSettings() {
  try {
    const { data, error } = await supabase.from('gst_settings').select('*').eq('id', 1).maybeSingle();
    if (error) return null;
    return data || null;
  } catch { return null; }
}

/**
 * How one revenue stream (see revenueStreams.js) is taxed.
 *
 *   exempt   — a refundable deposit. Not a supply, so never taxed, whatever
 *              the settings say.
 *   untaxed  — GST is switched off for this stream. The line is billed at its
 *              price with no tax, and kept out of taxable value.
 *   otherwise charged at `rate`, inclusive or exclusive.
 */
export function rateForStream(settings, stream) {
  if (stream === 'deposit') {
    return { exempt: true, untaxed: false, rate: null, hsn: null, inclusive: true };
  }
  const rates = mergeRates(settings?.rates);
  const entry = rates[stream] || rates.library;
  if (!entry.enabled) {
    return { exempt: false, untaxed: true, rate: null, hsn: entry.hsn || null, inclusive: true };
  }
  return { exempt: false, untaxed: false, rate: entry.rate, hsn: entry.hsn || null, inclusive: entry.inclusive };
}

/**
 * How one CART LINE is taxed — the stream's configuration, with any per-item
 * override applied on top.
 *
 * A stream-level answer is not enough for anything sold at a printed MRP. The
 * MRP is by law the maximum price inclusive of all taxes, so GST has to be
 * taken OUT of it; adding 5% on top would put the bill above MRP. The same
 * cafe stream also holds coffee that may be priced before tax, so the two have
 * to be able to disagree inside one bill.
 *
 * The override also carries the two cases a rate alone cannot express:
 * packaged goods taxed at a different slab from the restaurant rate, and
 * alcoholic liquor for human consumption, which is outside GST altogether.
 *
 * @param item  cart line, optionally carrying taxMode / gstRate / hsnCode
 */
export function rateForCartItem(settings, stream, item) {
  const base = rateForStream(settings, stream);
  const mode = item?.taxMode;

  // Alcohol is outside GST whatever the stream says — state excise and VAT
  // apply instead, and it must stay out of GST taxable turnover.
  if (mode === 'outside_gst') {
    return { ...base, exempt: false, untaxed: true, rate: null };
  }

  // A deposit is never a supply, and GST switched off for the stream stays off.
  if (base.exempt || base.untaxed) return base;

  const out = { ...base };
  if (mode === 'mrp') out.inclusive = true;
  else if (mode === 'exclusive') out.inclusive = false;

  const rate = item?.gstRate;
  if (rate !== undefined && rate !== null && rate !== '') out.rate = Number(rate) || 0;
  if (item?.hsnCode) out.hsn = item.hsnCode;

  return out;
}

/** Is GST actually live? Off unless enabled AND a valid GSTIN is on file. */
export function gstActive(settings) {
  return !!(settings?.enabled && validateGstin(settings.gstin).valid);
}
