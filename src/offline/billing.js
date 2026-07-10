/* Offline-first — offline billing helper (Phase 0, Step 4).
 * See docs/offline-first-plan.md.
 *
 * "Safe additive" approach: the ONLINE checkout in POS.js is untouched. This
 * runs ONLY when there's no network — it saves the completed bill to the local
 * DB + outbox (schema-matching columns + client UUIDs), so the sync module can
 * replay it verbatim when the connection returns.
 */
import { putLocal, getMeta, setMeta, uuid } from './localDb';
import { refreshPending } from './status';

// Single counter device → this prefix guarantees receipt numbers never clash.
const DEVICE = 'C1';

/** Next human-readable receipt number, e.g. C1-0007. Local, monotonic. */
export async function nextReceiptNo() {
  const n = (await getMeta('receipt_seq', 0)) + 1;
  await setMeta('receipt_seq', n);
  return `${DEVICE}-${String(n).padStart(4, '0')}`;
}

/**
 * Save a completed bill offline. Mirrors exactly the columns POS.js writes when
 * online (so the synced upsert matches the schema), plus a client-generated
 * uuid id. Returns { txnId, receiptNo } for the on-screen receipt.
 *
 * Prove-the-save-first scope: captures the sale record (transaction + items, or
 * the legacy sales row). Secondary effects (stock, copy-sold, membership) are
 * left for the later "full offline" phase.
 */
export async function saveBillOffline({
  hasPosTable, member, cart, total, discountAmount, appliedPromo, payMethod, cashReceived, change,
}) {
  const receiptNo = await nextReceiptNo();
  const now = new Date().toISOString();
  const txnId = uuid();

  if (hasPosTable) {
    await putLocal('pos_transactions', {
      id: txnId,
      member_id: member?.id || null,
      total_amount: total,
      discount_amount: discountAmount,
      promo_code: appliedPromo?.code || null,
      payment_method: payMethod,
      cash_received: payMethod === 'cash' ? (cashReceived || total) : null,
      change_given: payMethod === 'cash' ? change : null,
      created_at: now,
    });
    for (const item of cart) {
      await putLocal('pos_transaction_items', {
        id: uuid(),
        transaction_id: txnId,
        item_type: item.type,
        item_name: item.copyCode ? `${item.name} [${item.copyCode}]` : item.name,
        book_id: item.bookId || null,
        fine_id: item.fineId || null,
        unit_price: item.price,
        quantity: item.qty,
        total_price: item.price * item.qty,
      });
    }
  } else {
    await putLocal('sales', {
      id: txnId,
      member_id: member?.id || null,
      book_id: cart.find((c) => c.bookId)?.bookId || null,
      quantity: cart.reduce((s, c) => s + c.qty, 0),
      total_amount: total,
      sale_date: now.split('T')[0],
      status: 'completed',
    });
  }

  await refreshPending(); // bump the status light immediately
  return { txnId, receiptNo };
}

if (typeof window !== 'undefined') {
  window.__tapasBilling = { saveBillOffline, nextReceiptNo };
}
