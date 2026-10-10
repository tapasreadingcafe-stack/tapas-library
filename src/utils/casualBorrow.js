/* Sell the Casual Borrowing plan from outside the POS (the Borrow screen).
 *
 * It records the same bill the POS would for the "Casual Borrowing (14 days)"
 * and "Casual Deposit (Refundable)" service buttons — same item names, item
 * types, GST and date-wise bill number — so Accounts, Reports and today's POS
 * totals can't tell the two apart. Then it starts (or extends) the plan on the
 * member exactly as a POS checkout of svc_mem_casual does.
 */
import { supabase } from './supabase';
import { PLAN_DEFAULTS, CASUAL_DEPOSIT_AMOUNT, calculateEndDate } from './membershipUtils';
import { posItemType } from './revenueStreams';
import { lineNet } from './cartUtils';
import { billTaxFor } from './billTax';
import { loadGstSettings, gstActive } from './gstSettings';
import { formatBillNo, seqWithinDay, dayKey } from './invoiceNumber';
import { todayYmd, ymdToTs, isBackdated } from './backdate';

// Names must match the POS service buttons: revenue streams are classified
// from item_name, and "Deposit" in the name is what keeps it out of income.
export const CASUAL_PLAN_ITEM = { cartId: 'svc_mem_casual', name: 'Casual Borrowing (14 days)', price: PLAN_DEFAULTS.casual.price, qty: 1 };
export const CASUAL_DEPOSIT_ITEM = { cartId: 'svc_mem_casual_deposit', name: 'Casual Deposit (Refundable)', price: CASUAL_DEPOSIT_AMOUNT, qty: 1 };

export function casualCart(withDeposit) {
  return withDeposit ? [CASUAL_PLAN_ITEM, CASUAL_DEPOSIT_ITEM] : [CASUAL_PLAN_ITEM];
}

/** What the customer pays, GST included when it's switched on. */
export async function casualTotal(withDeposit) {
  const cart = casualCart(withDeposit);
  const gstCfg = await loadGstSettings().catch(() => null);
  const billTax = gstActive(gstCfg) ? billTaxFor(cart, { settings: gstCfg }) : null;
  const total = billTax ? billTax.payable : cart.reduce((s, i) => s + lineNet(i), 0);
  return { cart, gstCfg, billTax, total };
}

/**
 * @param member      the members row (needs id, plan, subscription_end)
 * @param withDeposit add the ₹500 refundable deposit to the bill
 * @param payMethod   'cash' | 'upi' | 'card'
 * @param billDate    YYYY-MM-DD the bill (and plan) belongs to; defaults to today
 * @returns { txnRef, total, endDate, startDate }
 */
export async function sellCasualPlan({ member, withDeposit, payMethod, billDate }) {
  if (!member?.id) throw new Error('Pick a customer first');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('No internet — take the payment in Library POS instead');
  }
  const billDay = billDate || todayYmd();
  const billStamp = ymdToTs(billDay);
  const { cart, gstCfg, billTax, total } = await casualTotal(withDeposit);

  const { data: txn, error: txnErr } = await supabase
    .from('pos_transactions')
    .insert({
      member_id: member.id,
      ...(isBackdated(billDay) ? { created_at: billStamp } : {}),
      total_amount: total,
      discount_amount: 0,
      promo_code: null,
      payment_method: payMethod,
      cash_received: payMethod === 'cash' ? total : null,
      change_given: payMethod === 'cash' ? 0 : null,
      ...(billTax ? {
        taxable_value:   billTax.taxableValue,
        cgst_amount:     billTax.cgst,
        sgst_amount:     billTax.sgst,
        igst_amount:     billTax.igst,
        exempt_value:    billTax.exemptValue,
        round_off:       billTax.roundOff,
        place_of_supply: gstCfg?.place_of_supply || null,
      } : {}),
    })
    .select('id, created_at').single();
  if (txnErr) throw txnErr;

  const { error: itemsErr } = await supabase.from('pos_transaction_items').insert(
    cart.map(item => {
      const row = {
        transaction_id: txn.id,
        item_type: posItemType(item),
        item_name: item.name,
        unit_price: item.price,
        quantity: item.qty,
        total_price: lineNet(item),
      };
      const tl = billTax?.lines.find(l => l.cartId === item.cartId);
      if (tl) {
        row.hsn_code      = tl.hsn || null;
        row.gst_rate      = tl.rate;
        row.taxable_value = tl.taxable;
        row.cgst_amount   = tl.cgst;
        row.sgst_amount   = tl.sgst;
        row.igst_amount   = tl.igst;
        row.is_exempt     = !!tl.exempt;
      }
      return row;
    })
  );
  // Same rule as the POS: a bill with no lines would vanish from every revenue
  // report, so undo it rather than leave it half-saved.
  if (itemsErr) {
    await supabase.from('pos_transactions').delete().eq('id', txn.id);
    throw itemsErr;
  }

  // Start the fortnight — or, if a casual fortnight is still running, stack
  // onto its end like a renewal (as the POS does).
  const defaults = PLAN_DEFAULTS.casual;
  let startDate = billDay;
  if (member.plan === 'casual' && member.subscription_end) {
    const currentEnd = new Date(member.subscription_end);
    if (currentEnd > new Date(`${billDay}T00:00:00`)) startDate = member.subscription_end.split('T')[0];
  }
  const endDate = calculateEndDate(startDate, defaults.duration_days);
  try {
    await applyCasualPlan(member.id, startDate, endDate);
  } catch (memErr) {
    throw new Error(`Payment saved, but the plan didn't start: ${memErr.message}. Use "Switch plan on" in the Casual list.`);
  }

  // Date-wise bill number, read back from the day's rows like the POS does.
  let txnRef;
  try {
    const stamp = txn.created_at || billStamp;
    const key = dayKey(stamp);
    const dayStart = `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
    const { data: sameDay } = await supabase
      .from('pos_transactions').select('id, created_at')
      .gte('created_at', `${dayStart}T00:00:00`).lte('created_at', `${dayStart}T23:59:59`);
    txnRef = formatBillNo(stamp, seqWithinDay(stamp, sameDay || [], txn.id));
  } catch {
    txnRef = formatBillNo(txn.created_at || billStamp, 1);
  }
  if (billTax) {
    await supabase.from('pos_transactions').update({ invoice_no: txnRef }).eq('id', txn.id);
  }

  return { txnRef, total, startDate, endDate };
}

/** Put a member on the casual plan for [startDate, endDate]. Throws on failure. */
export async function applyCasualPlan(memberId, startDate, endDate) {
  const d = PLAN_DEFAULTS.casual;
  const { data, error } = await supabase.from('members').update({
    plan: 'casual',
    plan_price: d.price,
    plan_duration_days: d.duration_days,
    borrow_limit: d.borrow_limit,
    discount_percent: d.discount_percent,
    subscription_start: startDate,
    subscription_end: endDate,
    membership_type: 'standard',
    status: 'active',
  }).eq('id', memberId).select('id');
  if (error) throw error;
  // An update RLS silently filters out returns no rows and no error.
  if (!data || data.length === 0) throw new Error('the member record could not be updated');
  // Books already out fall due when the plan does.
  await supabase.from('circulation').update({ due_date: endDate }).eq('member_id', memberId).is('return_date', null);
}

const dayOf = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Everyone who has ever paid for Casual Borrowing, read from the BILLS — so a
 * customer still shows up even if their member record never got the plan.
 *
 * Casual is ₹70 per book: each payment covers one book for 14 days, and
 * returning the book ends that fortnight (a DB trigger trims the plan).
 *
 * Each row: { member, payments, depositPaid, lastPay, coveredUntil, planOk,
 *   state, loans, lastReturn }
 *   state: 'out'      — has the book now
 *          'ready'    — paid, plan on, no book taken yet
 *          'returned' — brought the book back; next book needs ₹70
 *          'ended'    — the 14 days ran out
 *          'fix'      — paid recently but the member record never got the plan
 */
export async function fetchCasualBorrowers() {
  const names = [CASUAL_PLAN_ITEM.name, CASUAL_DEPOSIT_ITEM.name];
  const { data: items, error: itemsErr } = await supabase
    .from('pos_transaction_items')
    .select('transaction_id, item_name, total_price')
    .in('item_name', names)
    .limit(5000);
  if (itemsErr) throw itemsErr;
  const txnIds = [...new Set((items || []).map(i => i.transaction_id))];
  if (!txnIds.length) return [];

  const txns = [];
  for (let i = 0; i < txnIds.length; i += 200) {
    const { data, error } = await supabase
      .from('pos_transactions')
      .select('id, member_id, created_at, payment_method')
      .in('id', txnIds.slice(i, i + 200));
    if (error) throw error;
    txns.push(...(data || []));
  }
  const txnById = new Map(txns.map(t => [t.id, t]));

  const byMember = new Map();
  (items || []).forEach(it => {
    const t = txnById.get(it.transaction_id);
    if (!t?.member_id) return; // a casual sale with no customer on the bill
    const row = byMember.get(t.member_id) || { memberId: t.member_id, payments: [], depositPaid: 0 };
    if (it.item_name === CASUAL_DEPOSIT_ITEM.name) row.depositPaid += Number(it.total_price) || 0;
    else row.payments.push({ day: dayOf(t.created_at), method: t.payment_method, billId: t.id });
    byMember.set(t.member_id, row);
  });

  const memberIds = [...byMember.keys()];
  const [{ data: members }, { data: loans }] = await Promise.all([
    supabase.from('members')
      .select('id, name, phone, plan, status, borrow_limit, subscription_start, subscription_end')
      .in('id', memberIds),
    // Open loans, plus recent returns (to tell "returned" from "not taken yet").
    supabase.from('circulation')
      .select('id, member_id, due_date, checkout_date, return_date, books(title)')
      .in('member_id', memberIds)
      .order('checkout_date', { ascending: false })
      .limit(1000),
  ]);
  const memberById = new Map((members || []).map(m => [m.id, m]));
  const duration = PLAN_DEFAULTS.casual.duration_days;
  const today = todayYmd();
  const ymd = (v) => (v ? String(v).slice(0, 10) : null);

  return memberIds.map(id => {
    const row = byMember.get(id);
    const payments = row.payments.sort((a, b) => a.day.localeCompare(b.day));
    const lastPay = payments[payments.length - 1] || null;
    const member = memberById.get(id) || { id, name: '(customer not found)' };
    const memberEnd = ymd(member.subscription_end);
    const mine = (loans || []).filter(l => l.member_id === id);
    const open = mine.filter(l => !l.return_date).map(l => ({
      id: l.id, title: l.books?.title || 'Unknown book', due_date: l.due_date, checkout_date: l.checkout_date,
    }));
    // A return of a book taken on or after the latest payment.
    const ret = lastPay && mine.find(l => l.return_date && ymd(l.checkout_date) >= lastPay.day);
    const lastReturn = ret ? { title: ret.books?.title || 'Unknown book', day: ymd(ret.return_date) } : null;

    const planOk = !lastPay || (member.plan === 'casual' && !!memberEnd && memberEnd >= lastPay.day);
    const fallbackEnd = lastPay ? calculateEndDate(lastPay.day, duration) : null;
    const coveredUntil = planOk ? memberEnd : fallbackEnd;

    let state;
    if (open.length) state = 'out';
    else if (lastReturn) state = 'returned';
    else if (!planOk && fallbackEnd && fallbackEnd >= today) state = 'fix';
    else if (coveredUntil && coveredUntil >= today) state = 'ready';
    else state = 'ended';

    return { member, payments, depositPaid: row.depositPaid, lastPay, coveredUntil, fallbackEnd, planOk, state, loans: open, lastReturn };
  }).sort((a, b) => {
    const rank = { out: 0, ready: 1, fix: 1, returned: 2, ended: 3 };
    return rank[a.state] - rank[b.state] || (b.lastPay?.day || '').localeCompare(a.lastPay?.day || '');
  });
}
