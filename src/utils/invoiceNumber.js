/* Date-wise bill numbers — INV-YYYYMMDD-NNN
 *
 * The old scheme numbered invoices by their POSITION in the on-screen list,
 * newest first. That made the newest bill always INV-2026-0001, renumbered
 * everything whenever a filter changed or a bill was deleted, and stamped every
 * invoice with the CURRENT year rather than its own.
 *
 * A date-wise number is derived from facts that don't move: the bill's own
 * date, and its rank among the bills of that same day. So:
 *   - a new bill takes the next number for TODAY and disturbs nothing else
 *   - filtering the list cannot change any number
 *   - deleting a bill only affects later bills on that same day
 *   - the number carries its own date, so it can never show the wrong year
 *
 * The sequence is computed from every bill of that day, never from a filtered
 * subset — that distinction is the whole point, so callers must pass the full
 * day's set.
 */

/** Local-time YYYYMMDD for a timestamp. Local, not UTC: a 00:33 IST bill
 *  belongs to that Indian day, not to the previous UTC one. */
export function dayKey(dateish) {
  const d = dateish instanceof Date ? dateish : new Date(dateish);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** Format one bill number. `seq` is 1-based within the day. */
export function formatBillNo(dateish, seq) {
  const key = dayKey(dateish);
  if (!key) return '—';
  return `INV-${key}-${String(seq).padStart(3, '0')}`;
}

/**
 * Map transaction id -> bill number, for a set of bills.
 *
 * `bills` must be every bill for each day it covers; pass the unfiltered fetch,
 * not the client-filtered view. Within a day, bills are ranked oldest-first, so
 * the first sale of the morning is 001 and stays 001.
 */
export function buildBillNumbers(bills) {
  const byDay = new Map();
  for (const b of bills || []) {
    const key = dayKey(b.created_at);
    if (!key) continue;
    const list = byDay.get(key) || [];
    list.push(b);
    byDay.set(key, list);
  }

  const out = {};
  for (const [, list] of byDay) {
    list
      // Oldest first. `id` breaks ties so two bills on the same timestamp
      // always land in the same order, however the rows arrived.
      .sort((a, b) => {
        const t = new Date(a.created_at) - new Date(b.created_at);
        return t !== 0 ? t : String(a.id).localeCompare(String(b.id));
      })
      .forEach((b, i) => { out[b.id] = formatBillNo(b.created_at, i + 1); });
  }
  return out;
}

/**
 * Rank of one bill within its own day, given that day's other bills.
 * Used at checkout, where only the just-saved bill needs a number.
 */
export function seqWithinDay(createdAt, sameDayBills, selfId) {
  const t = new Date(createdAt).getTime();
  let rank = 1;
  for (const b of sameDayBills || []) {
    if (b.id === selfId) continue;
    const bt = new Date(b.created_at).getTime();
    if (bt < t || (bt === t && String(b.id).localeCompare(String(selfId)) < 0)) rank++;
  }
  return rank;
}
