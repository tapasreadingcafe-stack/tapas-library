/* Revenue streams — one bill in, separate books out.
 *
 * A customer gets a single bill (membership + a book + a coffee + a deposit),
 * but the business needs those split apart. The split is derived per LINE from
 * `pos_transaction_items`, never from the bill total — a bill total tells you
 * nothing about which side of the business earned it.
 *
 * Two rules matter here:
 *   1. A refundable deposit is NOT revenue. It's money held on behalf of the
 *      customer and owed back, so it's tracked separately and excluded from
 *      income and from GST.
 *   2. Legacy rows wrote `item_type: 'service'` for membership, deposit,
 *      printing and manually-added fines alike, so those are classified by
 *      name. New rows carry an explicit type, and both are handled.
 */

export const STREAMS = {
  library:    { key: 'library',    label: 'Library',     icon: '📚', color: '#667eea', gst: 'books'    },
  cafe:       { key: 'cafe',       label: 'Cafe',        icon: '☕', color: '#1dd1a1', gst: 'cafe'     },
  membership: { key: 'membership', label: 'Memberships', icon: '💳', color: '#06b6d4', gst: 'services' },
  fines:      { key: 'fines',      label: 'Fines',       icon: '⚠️', color: '#f39c12', gst: 'services' },
  deposit:    { key: 'deposit',    label: 'Deposits',    icon: '🔐', color: '#6b7280', gst: null       },
};

// Streams that count as income. `deposit` is deliberately absent.
export const REVENUE_STREAMS = ['library', 'cafe', 'membership', 'fines'];

const DEPOSIT_RE    = /deposit/i;
const MEMBERSHIP_RE = /member|monthly|yearly|annual|renew/i;
const FINE_RE       = /fine|damage|lost/i;

// Classify a name that arrived with a generic type.
function streamFromName(name) {
  const n = name || '';
  if (DEPOSIT_RE.test(n))    return 'deposit';
  if (MEMBERSHIP_RE.test(n)) return 'membership';
  if (FINE_RE.test(n))       return 'fines';
  // Printing, stationery, donations, misc charges are all library-side.
  return 'library';
}

/** Stream for a stored `pos_transaction_items` row. */
export function streamOf(row) {
  switch (row?.item_type) {
    case 'book':       return 'library';
    case 'cafe':       return 'cafe';
    case 'fine':       return 'fines';
    case 'membership': return 'membership';
    case 'deposit':    return 'deposit';
    default:           return streamFromName(row?.item_name);
  }
}

/**
 * The `item_type` to STORE for a POS cart item.
 * 'book', 'cafe' and 'fine' are passed through unchanged — SettingsHealth
 * matches on 'fine', so that value must stay stable. Only the catch-all
 * 'service' is refined, which is what made the old data ambiguous.
 */
export function posItemType(cartItem) {
  const t = cartItem?.type;
  if (t === 'book' || t === 'cafe' || t === 'fine') return t;
  const s = streamFromName(cartItem?.name);
  if (s === 'deposit')    return 'deposit';
  if (s === 'membership') return 'membership';
  if (s === 'fines')      return 'fine';
  return 'service';
}

/**
 * Split a period's POS lines into per-stream totals.
 *
 * `items` are rows of { transaction_id, item_type, item_name, total_price }.
 * `bills` maps transaction_id -> total_amount (what was actually charged).
 *
 * Line totals are already net of any per-item discount, but a bill-level
 * discount (promo / manual) lives only on the bill. It's prorated across the
 * revenue lines so the streams reconcile exactly to what was collected.
 * Deposit lines are excluded from that proration — a refundable deposit is
 * always taken in full, so discounting it would understate what's owed back.
 */
export function splitByStream(items, bills) {
  const totals = { library: 0, cafe: 0, membership: 0, fines: 0, deposit: 0 };
  const byTxn = new Map();

  for (const it of items || []) {
    const list = byTxn.get(it.transaction_id) || [];
    list.push(it);
    byTxn.set(it.transaction_id, list);
  }

  for (const [txnId, lines] of byTxn) {
    const tagged = lines.map(l => ({ stream: streamOf(l), amount: Number(l.total_price) || 0 }));
    const depositTotal = tagged.filter(t => t.stream === 'deposit').reduce((s, t) => s + t.amount, 0);
    const revenueTotal = tagged.filter(t => t.stream !== 'deposit').reduce((s, t) => s + t.amount, 0);

    const billTotal = bills?.[txnId];
    // How much of the bill was left for revenue after the deposit came off.
    const collectedRevenue = typeof billTotal === 'number'
      ? Math.max(0, billTotal - depositTotal)
      : revenueTotal;
    const scale = revenueTotal > 0 ? collectedRevenue / revenueTotal : 1;

    for (const t of tagged) {
      totals[t.stream] += t.stream === 'deposit' ? t.amount : t.amount * scale;
    }
  }

  Object.keys(totals).forEach(k => { totals[k] = Math.round(totals[k]); });
  return totals;
}
