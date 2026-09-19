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
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { fetchStations, isStationLive, pickStation } from './receiptPrinter';
import { generateZPL } from './barcodeUtils';

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
export const queueLabel = (zpl) => queueLabelJob('label', { zpl });

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

/** Queue a job for the station to run against the label printer. */
const queueLabelJob = async (kind, payload) => {
  const { data, error } = await supabase
    .from('print_jobs')
    .insert([{ kind, payload }])
    .select('id, status')
    .single();
  if (error) throw error;
  return data;
};

/** A real label, with a real barcode on it, so a test proves the whole path. */
export const queueTestLabel = () =>
  queueLabelJob('label', {
    zpl: generateZPL([{
      brand: 'TAPAS READING CAFE',
      copyCode: 'TEST-0001',
      title: 'Test label',
      price: '',
    }]),
  });

/** Ask the station to clear and un-pause the label queue (the Auto-Fix button). */
export const queueLabelFix = () => queueLabelJob('label-fix', {});

/* What the dashboard knows about the label printer, from anywhere.
 *
 * Same states as the receipt printer, with one extra: a till still running an
 * older station reports nothing about the Zebra at all. That is "we don't
 * know", not "it's broken", and saying the wrong one sends someone to look at
 * a printer that is perfectly fine. */
export async function fetchLabelPrinterStatus() {
  const { stations, error } = await fetchStations();
  if (error) return { state: 'setup-needed', detail: error.message };
  if (!stations.length) return { state: 'no-station' };
  const station = pickStation(stations, 'label_online');
  if (!isStationLive(station)) return { state: 'station-offline', station };
  // The column itself is missing until the migration is run.
  if (!('label_online' in station)) return { state: 'setup-needed', station };
  if (station.label_online === null) return { state: 'station-outdated', station };
  if (!station.label_online) return { state: 'printer-offline', station };
  return { state: 'online', station };
}

export function useLabelPrinterStatus(pollMs = 15000) {
  const [status, setStatus] = useState({ state: 'checking' });
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const next = await fetchLabelPrinterStatus();
      if (alive) setStatus(next);
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [pollMs]);
  return status;
}

/* The one-line version, for the Direct Print screens: the same sentence the
 * POS shows above Print Receipt, so nobody has to open Settings to find out
 * whether pressing the button will produce a label. */
export const LABEL_STATE_TEXT = {
  checking:           { dot: '#9ca3af', text: 'Checking the label printer…' },
  online:             { dot: '#16a34a', text: 'Label printer ready' },
  'printer-offline':  { dot: '#dc2626', text: 'Label printer offline — check it is switched on and its cable is plugged in' },
  'station-offline':  { dot: '#f59e0b', text: 'The computer that owns the label printer isn’t running' },
  'station-outdated': { dot: '#f59e0b', text: 'That computer isn’t set up for labels yet — Settings → Devices' },
  'no-station':       { dot: '#f59e0b', text: 'No computer is set up to print labels yet' },
  'setup-needed':     { dot: '#9ca3af', text: 'Label printing not set up — Settings → Devices' },
};

export const labelStateText = (state) => LABEL_STATE_TEXT[state] || LABEL_STATE_TEXT.checking;
