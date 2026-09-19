import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { supabase } from '../utils/supabase';
import { usePrinterStatus, queueTestPrint, waitForJob } from '../utils/receiptPrinter';
import { useLabelPrinterStatus, queueTestLabel, queueLabelFix } from '../utils/labelPrinter';

const DEVICE_TYPES = [
  { key: 'barcode_scanner', icon: '📷', name: 'Barcode Scanner', desc: 'USB/Bluetooth barcode scanner for scanning book ISBNs and copy codes', connectTip: 'Plug in USB scanner or pair Bluetooth. Scanner types barcodes as keyboard input — no driver needed.' },
  { key: 'bill_printer', icon: '🧾', name: 'Bill / Receipt Printer', desc: 'POSIFLOW KP307 or any ESC/POS thermal printer — Print Receipt on any phone or laptop prints here directly, no driver', connectTip: null },
  { key: 'barcode_printer', icon: '🏷️', name: 'Barcode Label Printer', desc: 'Zebra (or TSC / TVS) label printer — Print Labels on any phone or laptop prints here directly, no driver', connectTip: null },
];

// What a till computer runs to set itself up. Served by this app from public/,
// generated on every build from printer_bridge/ (scripts/sync-print-station.js).
//
// The station key rides inside the command. That is the whole setup: the
// installer sees the key and asks nothing — it finds the USB printer(s) by name,
// builds the print queue and starts the station at login. Earlier the key was a
// separate step answered at a prompt, and under curl | bash that prompt could
// never be answered, so every install stopped at "No station key".
// The key is 64 hex characters (print_station_keys.token), so quoting is only
// belt and braces.
//
// One till normally has both printers, so both cards hand out the same command
// with the other printer's flag set from a checkbox. RECEIPT_PRINTER=none is
// for the rarer case — a computer that only prints labels — where the installer
// would otherwise hunt for a receipt printer that isn't there and give up.
const INSTALL_URL = 'https://dashboard.tapasreadingcafe.com/install-print-station.sh';
const installCommand = (key, { labels, receipts }) =>
  `curl -fsSL ${INSTALL_URL} | STATION_KEY='${key}'`
  + (labels ? ' LABEL_PRINTER=usb' : '')
  + (receipts ? '' : ' RECEIPT_PRINTER=none')
  + ' bash';

export default function DeviceManager() {
  const toast = useToast();
  const [devices, setDevices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('connected_devices') || '{}'); } catch { return {}; }
  });
  const [testing, setTesting] = useState(null);
  const [scanTest, setScanTest] = useState('');
  // Both printers are reported by the print station's heartbeat, so these cards
  // tell the truth on a phone in the next room, not only on the till itself.
  const receipt = usePrinterStatus(10000);
  const labels = useLabelPrinterStatus(10000);
  const [stationKey, setStationKey] = useState(null);
  const [withLabels, setWithLabels] = useState(false);   // receipt card's "…and the Zebra"
  const [withReceipt, setWithReceipt] = useState(true);  // label card's "…and the receipt printer"
  const [testingReceipt, setTestingReceipt] = useState(false);
  const [testingLabel, setTestingLabel] = useState(false);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    supabase.from('print_station_keys').select('token').eq('id', 1).maybeSingle()
      .then(({ data }) => setStationKey(data?.token || null));
  }, []);

  const saveDevices = (d) => { setDevices(d); localStorage.setItem('connected_devices', JSON.stringify(d)); };

  const testDevice = (key) => {
    setTesting(key);
    if (key === 'barcode_scanner') {
      toast.info('Try scanning a barcode now. If text appears in the test box, scanner is working.');
    }
    setTimeout(() => setTesting(null), 3000);
  };

  const runReceiptTest = async () => {
    setTestingReceipt(true);
    try {
      const job = await queueTestPrint();
      const result = await waitForJob(job.id, { timeoutMs: 15000 });
      if (result.status === 'done') toast.success('Test receipt printed');
      else if (result.status === 'failed') toast.error(`Could not print: ${result.error || 'printer error'}`);
      else toast.warning('Test print queued — it prints as soon as the station and printer are ready');
    } catch (e) {
      toast.error(`Could not queue a test print: ${e.message || e}`);
    } finally {
      setTestingReceipt(false);
    }
  };

  const runLabelTest = async () => {
    setTestingLabel(true);
    try {
      const job = await queueTestLabel();
      const result = await waitForJob(job.id, { timeoutMs: 15000 });
      if (result.status === 'done') toast.success('Test label printed');
      else if (result.status === 'failed') toast.error(`Could not print: ${result.error || 'printer error'}`);
      else toast.warning('Test label queued — it prints as soon as the station and printer are ready');
    } catch (e) {
      toast.error(`Could not queue a test label: ${e.message || e}`);
    } finally {
      setTestingLabel(false);
    }
  };

  // The recovery someone used to walk over and type into Terminal after a jam:
  // clear the stuck jobs, un-pause the queue. It runs on the till, asked for
  // from whichever device the person is holding.
  const runLabelFix = async () => {
    setFixing(true);
    try {
      const job = await queueLabelFix();
      const result = await waitForJob(job.id, { timeoutMs: 20000 });
      if (result.status === 'done') toast.success('Label printer cleared and re-enabled — try Test Print');
      else if (result.status === 'failed') toast.error(result.error || 'Could not fix the label printer.');
      else toast.warning('Sent to the till — it runs as soon as the station answers');
    } catch (e) {
      toast.error(`Could not ask the till to fix the printer: ${e.message || e}`);
    } finally {
      setFixing(false);
    }
  };

  const copyInstallCommand = async (opts) => {
    try {
      await navigator.clipboard.writeText(installCommand(stationKey, opts));
      toast.success('Copied — now paste it into Terminal on the cafe computer');
    } catch {
      toast.error('Could not copy — try the Copy button again');
    }
  };

  const kbd = { display: 'inline-block', padding: '1px 6px', border: '1px solid #cbd5e0', borderBottomWidth: '2px', borderRadius: '4px', background: '#fff', fontFamily: 'inherit', fontSize: '12px', lineHeight: 1.4, whiteSpace: 'nowrap' };
  const panel = (bg, border) => ({ background: bg, border: `1px solid ${border}`, borderRadius: '6px', padding: '10px', fontSize: '12px', lineHeight: 1.6 });
  const command = (text) => (
    <div style={{ marginTop: '6px', background: '#1a1a2e', color: '#CFF389', borderRadius: '6px', padding: '9px 12px', fontFamily: 'monospace', fontSize: '12px', userSelect: 'all', overflowX: 'auto', whiteSpace: 'nowrap' }}>{text}</div>
  );

  /* Setting up the till computer. Deliberately three steps and one button:
   * the people doing this are at the counter, not at a desk. Everything that
   * isn't needed on a normal day sits under "Something not working?".
   *
   * One walkthrough serves both printers: the same station drives both, and
   * the only difference is which one you are standing in front of. */
  const bigStep = (n, body) => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '14px' }}>
      <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#1a1a2e', color: '#CFF389', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
      <div style={{ minWidth: 0, flex: 1, fontSize: '14px', color: '#2d3748', lineHeight: 1.5, paddingTop: '3px' }}>{body}</div>
    </div>
  );

  const renderStationSetup = (forLabels = false) => {
    const opts = forLabels ? { labels: true, receipts: withReceipt } : { labels: withLabels, receipts: true };
    return (
      <div style={{ marginTop: '4px' }}>
        {bigStep(1, forLabels
          ? <>Plug the <strong>label printer</strong> into the <strong>cafe computer</strong> with its USB cable, and switch it on.</>
          : <>Plug the <strong>receipt printer</strong> into the <strong>cafe computer</strong> with its USB cable, and switch it on.</>)}

        {bigStep(2, <>On that computer, open <strong>Terminal</strong>: press <kbd style={kbd}>⌘ Command</kbd> + <kbd style={kbd}>Space</kbd>, type <strong>Terminal</strong>, press <kbd style={kbd}>Enter</kbd>.</>)}

        {bigStep(3, (
          <>
            Press this button, then paste into Terminal (<kbd style={kbd}>⌘ Command</kbd> + <kbd style={kbd}>V</kbd>) and press <kbd style={kbd}>Enter</kbd>.
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => copyInstallCommand(opts)}
                disabled={!stationKey}
                style={{ padding: '12px 22px', background: stationKey ? '#1a1a2e' : '#a0aec0', color: '#CFF389', border: 0, borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: stationKey ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                {stationKey ? '📋 Copy setup command' : 'Loading…'}
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '13px', color: '#4a5568', cursor: 'pointer' }}>
              {forLabels ? (
                <>
                  <input type="checkbox" checked={withReceipt} onChange={e => setWithReceipt(e.target.checked)} />
                  The receipt printer is plugged into this computer too
                </>
              ) : (
                <>
                  <input type="checkbox" checked={withLabels} onChange={e => setWithLabels(e.target.checked)} />
                  The Zebra label printer is plugged into this computer too
                </>
              )}
            </label>
          </>
        ))}

        <div style={{ marginTop: '16px', padding: '10px 12px', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px', fontSize: '13px', color: '#276749' }}>
          ✅ When Terminal says <strong>“Done”</strong>, this card turns green. Press <strong>Test Print</strong>.
        </div>

        <details style={{ marginTop: '12px', fontSize: '13px', color: '#4a5568' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Something not working?</summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', lineHeight: 1.6 }}>
            <li>
              <strong>A window asks to install developer tools:</strong> click <strong>Install</strong>, wait until it
              finishes (10–30 minutes on an older Mac), then paste the command again.
            </li>
            <li>
              <strong>Terminal says “NOT working”:</strong> it tells you why just above. If it isn’t clear, take a photo
              of the Terminal window and send it.
            </li>
            <li>
              <strong>Card turns yellow again later:</strong> the computer went to sleep. On it, open
              System Preferences → Battery → Power Adapter and turn on “Prevent computer from sleeping
              automatically when the display is off”.
            </li>
            <li>
              <strong>Moving the printer from another computer:</strong> on the old one, paste this into Terminal so it
              stops taking print jobs:
              {command('launchctl unload ~/Library/LaunchAgents/com.tapas.printstation.plist')}
            </li>
          </ul>
        </details>
      </div>
    );
  };

  const renderReceiptPanel = () => {
    if (receipt.state === 'checking') {
      return <div style={panel('#f8f8f8', '#eee')}>⏳ Checking the receipt printer…</div>;
    }
    if (receipt.state === 'setup-needed') {
      return (
        <div style={panel('#f8f9ff', '#e0e8ff')}>
          <strong style={{ color: '#4c51bf' }}>One-time setup:</strong> run{' '}
          <code>supabase/migrations/20260911_print_queue.sql</code> in the Supabase SQL editor, then reload this page.
        </div>
      );
    }
    if (receipt.state === 'no-station' || receipt.state === 'station-offline') {
      return (
        <div style={panel('#fffaf0', '#fbd38d')}>
          <div style={{ color: '#975a16', fontWeight: 600, fontSize: '14px' }}>
            {receipt.state === 'no-station'
              ? 'Set up the cafe computer to print receipts'
              : `Receipts aren’t printing — ${receipt.station?.id || 'the cafe computer'} isn’t connected`}
          </div>
          {receipt.state === 'station-offline' && (
            <div style={{ marginTop: '4px', color: '#744210', fontSize: '13px' }}>
              If it’s just asleep, wake it up. Otherwise do these 3 steps on it:
            </div>
          )}
          {renderStationSetup(false)}
        </div>
      );
    }
    if (receipt.state === 'printer-offline') {
      return (
        <div style={panel('#fff5f5', '#feb2b2')}>
          <div style={{ color: '#c53030', fontWeight: 600 }}>⚠️ {receipt.station?.detail || 'The printer is not answering'}</div>
          <div style={{ color: '#742a2a', fontSize: '11px', marginTop: '4px' }}>
            Check the printer is switched on, has paper, and is still connected to {receipt.station?.id || 'the counter computer'}.
            Receipts sent in the meantime wait in the queue for up to 30 minutes.
          </div>
        </div>
      );
    }
    return (
      <div style={panel('#f0fff4', '#9ae6b4')}>
        <span style={{ color: '#276749' }}>
          ✅ <strong>Receipt printer ready</strong>
          {receipt.station?.printer_address ? ` · ${receipt.station.printer_address}` : ''}
          {receipt.station?.id ? ` · via ${receipt.station.id}` : ''}
        </span>
        <div style={{ color: '#2f855a', fontSize: '11px', marginTop: '4px' }}>Print Receipt on any phone or laptop now prints here directly.</div>
        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', color: '#276749', fontWeight: 600, fontSize: '12px' }}>
            Set up a different computer
          </summary>
          {renderStationSetup(false)}
        </details>
      </div>
    );
  };

  /* The label printer's card, told the same way as the receipt printer's —
   * because from the dashboard's side they are the same thing: a printer the
   * till owns, and every other device queues work for. */
  const renderLabelPanel = () => {
    if (labels.state === 'checking') {
      return <div style={panel('#f8f8f8', '#eee')}>⏳ Checking the label printer…</div>;
    }
    if (labels.state === 'setup-needed') {
      return (
        <div style={panel('#f8f9ff', '#e0e8ff')}>
          <strong style={{ color: '#4c51bf' }}>One-time setup:</strong> run{' '}
          <code>supabase/migrations/20260911_print_queue.sql</code> and{' '}
          <code>supabase/migrations/20260919_label_printer_status.sql</code> in the Supabase SQL editor,
          then reload this page.
        </div>
      );
    }
    if (labels.state === 'no-station' || labels.state === 'station-offline' || labels.state === 'station-outdated') {
      return (
        <div style={panel('#fffaf0', '#fbd38d')}>
          <div style={{ color: '#975a16', fontWeight: 600, fontSize: '14px' }}>
            {labels.state === 'no-station'
              ? 'Set up the cafe computer to print labels'
              : labels.state === 'station-outdated'
                ? `${labels.station?.id || 'The cafe computer'} was set up before label printing — finish it off`
                : `Labels aren’t printing — ${labels.station?.id || 'the cafe computer'} isn’t connected`}
          </div>
          <div style={{ marginTop: '4px', color: '#744210', fontSize: '13px' }}>
            {labels.state === 'station-outdated'
              ? 'It still prints receipts. Paste the command below on that computer and it will pick up the label printer too.'
              : labels.state === 'station-offline'
                ? 'If it’s just asleep, wake it up. Otherwise do these 3 steps on it:'
                : 'Labels print from any phone or laptop once one computer owns the printer.'}
          </div>
          {renderStationSetup(true)}
        </div>
      );
    }
    if (labels.state === 'printer-offline') {
      return (
        <div style={panel('#fff5f5', '#feb2b2')}>
          <div style={{ color: '#c53030', fontWeight: 600 }}>⚠️ {labels.station?.label_detail || 'The label printer is not answering'}</div>
          <div style={{ color: '#742a2a', fontSize: '11px', marginTop: '4px' }}>
            Check the label printer is switched on, has labels in it, and is still connected to {labels.station?.id || 'the counter computer'}.
            If it jammed and the queue paused, press <strong>🔧 Auto-Fix</strong> — it clears the stuck labels and
            re-enables the printer on that computer.
          </div>
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', color: '#c53030', fontWeight: 600, fontSize: '12px' }}>
              The label printer isn’t set up on that computer
            </summary>
            {renderStationSetup(true)}
          </details>
        </div>
      );
    }
    return (
      <div style={panel('#f0fff4', '#9ae6b4')}>
        <span style={{ color: '#276749' }}>
          ✅ <strong>Label printer ready</strong>
          {labels.station?.label_address ? ` · ${labels.station.label_address.replace(/^cups:/, '')}` : ''}
          {labels.station?.id ? ` · via ${labels.station.id}` : ''}
        </span>
        <div style={{ color: '#2f855a', fontSize: '11px', marginTop: '4px' }}>Direct Print on any phone or laptop now prints here directly.</div>
        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', color: '#276749', fontWeight: 600, fontSize: '12px' }}>
            Set up a different computer
          </summary>
          {renderStationSetup(true)}
        </details>
      </div>
    );
  };

  // The badge on a printer card: same five words for both printers, so nobody
  // has to learn two vocabularies.
  const printerBadge = (state) => {
    switch (state) {
      case 'online':          return [{ label: 'Connected', bg: '#d4edda', fg: '#155724' }, '#1dd1a1'];
      case 'printer-offline': return [{ label: 'Printer offline', bg: '#fde8e8', fg: '#c53030' }, '#fc8181'];
      case 'no-station':
      case 'station-offline':
      case 'station-outdated': return [{ label: 'Station not running', bg: '#fff3cd', fg: '#8a6d00' }, '#f6c343'];
      case 'setup-needed':    return [{ label: 'Not set up', bg: '#f8f8f8', fg: '#999' }, '#e0e0e0'];
      default:                return [{ label: 'Checking…', bg: '#f8f8f8', fg: '#999' }, '#e0e0e0'];
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>🔌 Device Manager</h1>
      <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>Connect and manage barcode scanners, receipt printers, and label printers</p>

      {DEVICE_TYPES.map(dev => {
        const connected = devices[dev.key];
        const isLabelPrinter = dev.key === 'barcode_printer';
        const isReceiptPrinter = dev.key === 'bill_printer';

        let badge = { label: connected ? 'Connected' : 'Not connected', bg: connected ? '#d4edda' : '#f8f8f8', fg: connected ? '#155724' : '#999' };
        let borderColor = connected ? '#1dd1a1' : '#e0e0e0';
        if (isReceiptPrinter) [badge, borderColor] = printerBadge(receipt.state);
        if (isLabelPrinter) [badge, borderColor] = printerBadge(labels.state);

        return (
          <div key={dev.key} style={{
            background: 'white', borderRadius: '10px', padding: '20px', marginBottom: '14px',
            borderLeft: `4px solid ${borderColor}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '24px' }}>{dev.icon}</span>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{dev.name}</h3>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                    background: badge.bg, color: badge.fg,
                  }}>
                    {badge.label}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 8px' }}>{dev.desc}</p>

                {isReceiptPrinter ? renderReceiptPanel() : isLabelPrinter ? renderLabelPanel() : (
                  <div style={{ background: '#f8f9ff', border: '1px solid #e0e8ff', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#667eea' }}>
                    💡 <strong>How to connect:</strong> {dev.connectTip}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                {!isLabelPrinter && !isReceiptPrinter && (
                  <button onClick={() => { saveDevices({ ...devices, [dev.key]: !connected }); toast.success(connected ? `${dev.name} disconnected` : `${dev.name} marked as connected`); }}
                    style={{ padding: '8px 16px', background: connected ? '#ff6b6b' : '#1dd1a1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                    {connected ? 'Disconnect' : 'Mark Connected'}
                  </button>
                )}
                {isLabelPrinter && labels.state === 'printer-offline' && (
                  <button onClick={runLabelFix} disabled={fixing}
                    style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: fixing ? 'default' : 'pointer', fontWeight: '600', fontSize: '12px', opacity: fixing ? 0.6 : 1 }}>
                    {fixing ? 'Fixing…' : '🔧 Auto-Fix'}
                  </button>
                )}
                {isReceiptPrinter && (
                  <button onClick={runReceiptTest} disabled={testingReceipt || receipt.state === 'setup-needed' || receipt.state === 'checking'}
                    style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', opacity: (testingReceipt || receipt.state === 'setup-needed') ? 0.6 : 1 }}>
                    {testingReceipt ? 'Printing…' : '🧾 Test Print'}
                  </button>
                )}
                {isLabelPrinter && (
                  <button onClick={runLabelTest} disabled={testingLabel || labels.state === 'setup-needed' || labels.state === 'checking'}
                    style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', opacity: (testingLabel || labels.state === 'setup-needed') ? 0.6 : 1 }}>
                    {testingLabel ? 'Printing…' : '🏷️ Test Print'}
                  </button>
                )}
                {!isLabelPrinter && !isReceiptPrinter && (
                  <button onClick={() => testDevice(dev.key)} disabled={testing === dev.key}
                    style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                    {testing === dev.key ? 'Checking...' : 'Test'}
                  </button>
                )}
              </div>
            </div>

            {/* Scanner test area */}
            {dev.key === 'barcode_scanner' && testing === 'barcode_scanner' && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Scan a barcode now — text should appear below:</p>
                <input autoFocus value={scanTest} onChange={e => setScanTest(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && scanTest) { toast.success('Scanner working! Scanned: ' + scanTest); setScanTest(''); setTesting(null); } }}
                  style={{ width: '100%', padding: '12px', border: '2px solid #1dd1a1', borderRadius: '8px', fontSize: '18px', textAlign: 'center', fontFamily: 'monospace' }}
                  placeholder="Waiting for scan..." />
              </div>
            )}
          </div>
        );
      })}

      {/* Printer settings tips */}
      <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '16px', marginTop: '10px' }}>
        <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>🖨️ Printer Setup Tips</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#856404', lineHeight: '1.8' }}>
          <li><strong>Both printers, one computer:</strong> plug the receipt printer and the Zebra into the till by USB and run the setup command once, with both boxes ticked. Every phone and laptop then prints to both.</li>
          <li><strong>Label printer stuck?</strong> If the Barcode Label Printer shows <em>Printer offline</em> after a jam, press <strong>Auto-Fix</strong> — it clears the stuck labels and re-enables the printer on the till.</li>
          <li><strong>No driver needed:</strong> neither printer is installed in System Settings — the setup command builds the print queues itself.</li>
          <li><strong>Zebra on the Wi-Fi:</strong> re-run the setup command on the till and give its IP address instead of <code>usb</code>; the printer then belongs to no single laptop.</li>
          <li><strong>Bluetooth scanner:</strong> Pair in System Settings → Bluetooth, then it works like a keyboard</li>
        </ul>
      </div>
    </div>
  );
}
