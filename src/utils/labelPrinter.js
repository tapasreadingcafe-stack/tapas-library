/* Barcode / shelf label printing, from any device.
 *
 * Why this exists: the Direct Print buttons POST their ZPL straight to
 * http://127.0.0.1:5050. That address means "the machine running this browser",
 * so it only ever reaches the Flask bridge when the dashboard is open ON the
 * shop Mac. From a phone, a tablet, or a second laptop there is nothing
 * listening on 5050 and the print silently fails — which is exactly the bug
 * this replaces.
 *
 * Receipts already solved this: the browser writes a row to the Supabase
 * print_jobs queue and the station at the counter prints it. Labels now take
 * the same route, so one machine owns the printers and every other device just
 * queues work for it.
 *
 * The local bridge is still tried first, because on the shop Mac itself it is
 * instant and needs no round trip. The queue is the fallback, not the
 * exception — anywhere else it is the only path that can work.
 */
import { supabase } from './supabase';

const LOCAL_BRIDGE = 'http://127.0.0.1:5050';
const LOCAL_TIMEOUT_MS = 1200;

/** Try the bridge on this machine. Resolves false if it isn't there. */
async function printViaLocalBridge(zpl) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOCAL_TIMEOUT_MS);
    const res = await fetch(`${LOCAL_BRIDGE}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zpl }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return data.success !== false;
  } catch {
    // No bridge on this device — expected on every device except the station.
    return false;
  }
}

/** Queue the label for the print station to pick up. */
export async function queueLabel(zpl) {
  const { data, error } = await supabase
    .from('print_jobs')
    .insert([{ kind: 'label', payload: { zpl } }])
    .select('id, status')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Print a label from wherever the user happens to be.
 *
 * @returns {{ via: 'local' | 'queue', job?: object }}
 */
export async function printLabel(zpl) {
  if (!zpl) throw new Error('No label content to print');
  if (await printViaLocalBridge(zpl)) return { via: 'local' };
  const job = await queueLabel(zpl);
  return { via: 'queue', job };
}
