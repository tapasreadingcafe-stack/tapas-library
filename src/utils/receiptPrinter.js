/* Receipt printing — one tap, from any phone or laptop, straight to the
 * thermal printer.
 *
 * A browser can't talk to a Wi-Fi or USB receipt printer itself, so the tap
 * puts the receipt in the Supabase print queue and the print station at the
 * counter (printer_bridge on the shop Mac) prints it in the printer's own
 * ESC/POS language — no print dialog, no driver, no image.
 *
 * The receipt is sent as structured data rather than pre-formatted text so the
 * station can lay it out for the paper width of whatever printer it drives.
 */
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { lineGross, lineDisc, lineDiscLabel } from './cartUtils';

export const DEFAULT_SHOP = {
  name: 'Tapas Reading Cafe',
  lines: ['2nd Floor, 2628, 27th Main Rd, HSR Layout', 'Bengaluru 560102'],
  phone: '+91 77603 93951',
  gstin: null,
};

// The station heartbeats every 10s; allow a few missed beats before calling it gone.
const STATION_STALE_MS = 35000;
const num = (v) => Number(v) || 0;
const stamp = (d) => d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function buildReceiptPayload(txn, gstCfg) {
  const tax = txn?.tax && txn.tax.totalTax > 0 ? txn.tax : null;
  // The printed logo carries the name, so the header is address, GSTIN, phone.
  // A tax invoice uses the registered address from GST Settings once one is
  // saved, and the cafe's own address until then — never a blank header.
  const gstAddress = gstCfg
    ? [gstCfg.address_line1, gstCfg.address_line2, [gstCfg.city, gstCfg.pincode].filter(Boolean).join(' ')].filter(Boolean)
    : [];
  const shop = {
    name: (tax && (gstCfg?.trade_name || gstCfg?.legal_name)) || DEFAULT_SHOP.name,
    lines: tax && gstAddress.length ? gstAddress : DEFAULT_SHOP.lines,
    phone: DEFAULT_SHOP.phone,
    gstin: tax ? (txn.gstin || gstCfg?.gstin || null) : null,
  };

  const totals = [];
  if (num(txn.discount) > 0) {
    totals.push({ label: 'Subtotal', value: num(txn.subtotal) });
    totals.push({ label: 'Discount', value: -num(txn.discount) });
  }
  if (tax) {
    // One slab (the usual cafe bill): show each half's rate, e.g. "CGST @ 2.5%".
    const half = tax.bySlab?.length === 1 ? ` @ ${tax.bySlab[0].rate / 2}%` : '';
    // Taxable value prints at normal size; the tax split under it, marked
    // `small`, prints in the printer's smaller font.
    totals.push({ label: 'Taxable value', value: tax.taxableValue });
    totals.push({ label: `CGST${half}`, value: tax.cgst, small: true });
    totals.push({ label: `SGST${half}`, value: tax.sgst, small: true });
    if (tax.roundOff) totals.push({ label: 'Round off', value: tax.roundOff, small: true });
  }

  const when = txn.date instanceof Date ? txn.date : new Date(txn.date || Date.now());
  const cash = txn.payMethod === 'cash';
  return {
    shop,
    title: tax ? 'TAX INVOICE' : 'RECEIPT',
    billNo: txn.txnRef || '',
    dateText: stamp(when),
    customer: txn.member?.name || null,
    items: (txn.items || []).map((it) => ({
      name: it.copyCode ? `${it.name} [${it.copyCode}]` : it.name,
      qty: it.qty || 1,
      amount: lineGross(it),
      discLabel: lineDisc(it) > 0 ? `${lineDiscLabel(it)} off` : null,
      discAmount: lineDisc(it),
    })),
    totals,
    total: num(txn.total),
    payMethod: txn.payMethod || null,
    cashReceived: cash ? num(txn.cashReceived) : null,
    change: cash ? num(txn.change) : null,
    footer: 'Thank you for visiting Tapas Reading Cafe!',
  };
}

export async function queuePrintJob(kind, payload) {
  const { data, error } = await supabase.from('print_jobs').insert([{ kind, payload }]).select('id, status').single();
  if (error) throw error;
  return data;
}

export const queueReceipt = (txn, gstCfg) => queuePrintJob('receipt', buildReceiptPayload(txn, gstCfg));
export const queueTestPrint = () => queuePrintJob('test', { dateText: stamp(new Date()) });

/** Follow a job until it prints or fails, or give up waiting and report where it got to. */
export async function waitForJob(id, { timeoutMs = 12000, intervalMs = 800 } = {}) {
  const until = Date.now() + timeoutMs;
  let last = { status: 'queued' };
  while (Date.now() < until) {
    const { data } = await supabase.from('print_jobs').select('status, error').eq('id', id).maybeSingle();
    if (data) {
      last = data;
      if (data.status === 'done' || data.status === 'failed') return data;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
}

export async function fetchPrinterStatus() {
  const { data, error } = await supabase.from('print_stations').select('*').order('last_seen', { ascending: false }).limit(1);
  if (error) return { state: 'setup-needed', detail: error.message };
  const station = data && data[0];
  if (!station) return { state: 'no-station' };
  if (Date.now() - new Date(station.last_seen).getTime() > STATION_STALE_MS) return { state: 'station-offline', station };
  if (!station.printer_online) return { state: 'printer-offline', station };
  return { state: 'online', station };
}

export const PRINTER_STATE_TEXT = {
  checking:          { dot: '#9ca3af', text: 'Checking printer…' },
  online:            { dot: '#16a34a', text: 'Printer ready' },
  'printer-offline': { dot: '#dc2626', text: 'Printer offline — check it is switched on and its cable is plugged in' },
  'station-offline': { dot: '#f59e0b', text: 'Print station not running on the counter computer' },
  'no-station':      { dot: '#f59e0b', text: 'Print station not set up yet' },
  'setup-needed':    { dot: '#9ca3af', text: 'Direct printing not set up — prints via browser' },
};

export const printerStateText = (state) => PRINTER_STATE_TEXT[state] || PRINTER_STATE_TEXT.checking;

export function usePrinterStatus(pollMs = 15000) {
  const [status, setStatus] = useState({ state: 'checking' });
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const next = await fetchPrinterStatus();
      if (alive) setStatus(next);
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [pollMs]);
  return status;
}
