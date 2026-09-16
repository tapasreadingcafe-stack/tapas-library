import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { supabase } from '../utils/supabase';
import { usePrinterStatus, queueTestPrint, waitForJob } from '../utils/receiptPrinter';

const BRIDGE_URL = 'http://127.0.0.1:5050';

const DEVICE_TYPES = [
  { key: 'barcode_scanner', icon: '📷', name: 'Barcode Scanner', desc: 'USB/Bluetooth barcode scanner for scanning book ISBNs and copy codes', connectTip: 'Plug in USB scanner or pair Bluetooth. Scanner types barcodes as keyboard input — no driver needed.' },
  { key: 'bill_printer', icon: '🧾', name: 'Bill / Receipt Printer', desc: 'POSIFLOW KP307 or any ESC/POS thermal printer — Print Receipt on any phone or laptop prints here directly, no driver', connectTip: null },
  { key: 'barcode_printer', icon: '🏷️', name: 'Barcode Label Printer', desc: 'Thermal printer for printing book barcode stickers (Zebra, TSC, TVS)', connectTip: null },
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
const INSTALL_URL = 'https://dashboard.tapasreadingcafe.com/install-print-station.sh';
const installCommand = (key, withLabels) =>
  `curl -fsSL ${INSTALL_URL} | STATION_KEY='${key}'${withLabels ? ' LABEL_PRINTER=usb' : ''} bash`;

async function pingBridge() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Deep printer diagnosis from the bridge. Returns null if the bridge is
// unreachable or is an older build without the /api/printer-status endpoint.
async function fetchDiag() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/printer-status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function DeviceManager() {
  const toast = useToast();
  const [devices, setDevices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('connected_devices') || '{}'); } catch { return {}; }
  });
  const [testing, setTesting] = useState(null);
  const [bridgeStatus, setBridgeStatus] = useState(null); // null=checking, true=up, false=down
  const [diag, setDiag] = useState(null);                 // detailed printer status from bridge
  const [fixing, setFixing] = useState(false);
  const [scanTest, setScanTest] = useState('');
  // Receipt printer — real status from the print station's heartbeat.
  const receipt = usePrinterStatus(10000);
  const [stationKey, setStationKey] = useState(null);
  const [withLabels, setWithLabels] = useState(false);
  const [testingReceipt, setTestingReceipt] = useState(false);

  useEffect(() => {
    supabase.from('print_station_keys').select('token').eq('id', 1).maybeSingle()
      .then(({ data }) => setStationKey(data?.token || null));
  }, []);

  const saveDevices = (d) => { setDevices(d); localStorage.setItem('connected_devices', JSON.stringify(d)); };

  const markPrinter = useCallback((up) => {
    setDevices(prev => {
      const next = { ...prev, barcode_printer: up };
      localStorage.setItem('connected_devices', JSON.stringify(next));
      return next;
    });
  }, []);

  // Auto-detect bridge on mount, and pull a full printer diagnosis if it's up.
  useEffect(() => {
    (async () => {
      const up = await pingBridge();
      setBridgeStatus(up);
      if (up) {
        markPrinter(true);
        setDiag(await fetchDiag());
      }
    })();
  }, [markPrinter]);

  // Self-detect: while the bridge is up, re-check the printer every 30s so a
  // paused queue / stuck jobs surface on their own without the user hunting.
  useEffect(() => {
    if (!bridgeStatus) return undefined;
    const id = setInterval(async () => {
      const d = await fetchDiag();
      if (d) setDiag(d);
    }, 30000);
    return () => clearInterval(id);
  }, [bridgeStatus]);

  const runAutoFix = async () => {
    setFixing(true);
    try {
      const res = await fetch(`${BRIDGE_URL}/api/printer-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (data.status) setDiag(data.status);
      if (data.success) toast.success(data.message || 'Printer fixed!');
      else toast.error(data.message || 'Could not fully fix the printer.');
    } catch {
      toast.error('Could not reach the printer bridge to run the fix. Is it running on port 5050?');
    }
    setFixing(false);
  };

  const testDevice = async (key) => {
    setTesting(key);
    if (key === 'barcode_scanner') {
      toast.info('Try scanning a barcode now. If text appears in the test box, scanner is working.');
    } else if (key === 'barcode_printer') {
      const up = await pingBridge();
      setBridgeStatus(up);
      if (up) {
        markPrinter(true);
        const d = await fetchDiag();
        setDiag(d);
        if (d && d.healthy) toast.success('Label printer is online and ready!');
        else if (d) toast.error(d.diagnosis || 'Printer needs attention — try Auto-Fix.');
        else toast.success('Bridge is running (update it for full diagnostics).');
      } else {
        markPrinter(false);
        setDiag(null);
        toast.error('Bridge not reachable. Run the terminal command below to start it.');
      }
    } else {
      const win = window.open('', '_blank', 'width=300,height=200');
      win.document.write(`<html><body style="font-family:monospace;text-align:center;padding:20px">
        <h3>Test Print</h3><p>Tapas Reading Cafe</p><p>${new Date().toLocaleString('en-IN')}</p>
        <p>If you see this, your printer is connected!</p>
      </body></html>`);
      win.document.close();
      setTimeout(() => { win.print(); setTimeout(() => win.close(), 1000); }, 300);
      toast.success('Print dialog opened — select your printer');
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

  const copyInstallCommand = async () => {
    try {
      await navigator.clipboard.writeText(installCommand(stationKey, withLabels));
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
   * isn't needed on a normal day sits under "Something not working?". */
  const bigStep = (n, body) => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '14px' }}>
      <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#1a1a2e', color: '#CFF389', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
      <div style={{ minWidth: 0, flex: 1, fontSize: '14px', color: '#2d3748', lineHeight: 1.5, paddingTop: '3px' }}>{body}</div>
    </div>
  );

  const renderStationSetup = () => (
    <div style={{ marginTop: '4px' }}>
      {bigStep(1, <>Plug the receipt printer into the <strong>cafe computer</strong> with its USB cable, and switch it on.</>)}

      {bigStep(2, <>On that computer, open <strong>Terminal</strong>: press <kbd style={kbd}>⌘ Command</kbd> + <kbd style={kbd}>Space</kbd>, type <strong>Terminal</strong>, press <kbd style={kbd}>Enter</kbd>.</>)}

      {bigStep(3, (
        <>
          Press this button, then paste into Terminal (<kbd style={kbd}>⌘ Command</kbd> + <kbd style={kbd}>V</kbd>) and press <kbd style={kbd}>Enter</kbd>.
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={copyInstallCommand}
              disabled={!stationKey}
              style={{ padding: '12px 22px', background: stationKey ? '#1a1a2e' : '#a0aec0', color: '#CFF389', border: 0, borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: stationKey ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {stationKey ? '📋 Copy setup command' : 'Loading…'}
            </button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '13px', color: '#4a5568', cursor: 'pointer' }}>
            <input type="checkbox" checked={withLabels} onChange={e => setWithLabels(e.target.checked)} />
            The Zebra label printer is plugged into this computer too
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
            stops taking receipts:
            {command('launchctl unload ~/Library/LaunchAgents/com.tapas.printstation.plist')}
          </li>
        </ul>
      </details>
    </div>
  );

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
          {renderStationSetup()}
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
          {renderStationSetup()}
        </details>
      </div>
    );
  };

  // Printer needs attention when the bridge is up but the device isn't healthy.
  const printerNeedsFix = bridgeStatus === true && diag && !diag.healthy;

  return (
    <div style={{ padding: '20px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>🔌 Device Manager</h1>
      <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>Connect and manage barcode scanners, receipt printers, and label printers</p>

      {DEVICE_TYPES.map(dev => {
        const connected = devices[dev.key];
        const isBridgePrinter = dev.key === 'barcode_printer';
        const isReceiptPrinter = dev.key === 'bill_printer';

        // Status badge (label + colors)
        let badge = { label: connected ? 'Connected' : 'Not connected', bg: connected ? '#d4edda' : '#f8f8f8', fg: connected ? '#155724' : '#999' };
        let borderColor = connected ? '#1dd1a1' : '#e0e0e0';
        if (isBridgePrinter) {
          if (bridgeStatus === null) badge = { label: 'Checking…', bg: '#f8f8f8', fg: '#999' };
          else if (printerNeedsFix) { badge = { label: 'Needs attention', bg: '#fff3cd', fg: '#8a6d00' }; borderColor = '#f6c343'; }
          else if (bridgeStatus === true) { badge = { label: 'Connected', bg: '#d4edda', fg: '#155724' }; borderColor = '#1dd1a1'; }
          else { badge = { label: 'Not connected', bg: '#f8f8f8', fg: '#999' }; borderColor = '#e0e0e0'; }
        }
        if (isReceiptPrinter) {
          const st = receipt.state;
          if (st === 'online') { badge = { label: 'Connected', bg: '#d4edda', fg: '#155724' }; borderColor = '#1dd1a1'; }
          else if (st === 'printer-offline') { badge = { label: 'Printer offline', bg: '#fde8e8', fg: '#c53030' }; borderColor = '#fc8181'; }
          else if (st === 'no-station' || st === 'station-offline') { badge = { label: 'Station not running', bg: '#fff3cd', fg: '#8a6d00' }; borderColor = '#f6c343'; }
          else if (st === 'setup-needed') { badge = { label: 'Not set up', bg: '#f8f8f8', fg: '#999' }; borderColor = '#e0e0e0'; }
          else { badge = { label: 'Checking…', bg: '#f8f8f8', fg: '#999' }; borderColor = '#e0e0e0'; }
        }

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

                {isReceiptPrinter ? renderReceiptPanel() : isBridgePrinter ? (
                  bridgeStatus === null ? (
                    <div style={{ background: '#f8f8f8', border: '1px solid #eee', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#888' }}>
                      ⏳ Checking printer status…
                    </div>
                  ) : bridgeStatus === false ? (
                    <div style={{ background: '#f8f9ff', border: '1px solid #e0e8ff', borderRadius: '6px', padding: '10px', fontSize: '12px' }}>
                      <span style={{ color: '#667eea' }}>💡 <strong>How to start:</strong> Open Terminal and run:</span>
                      <div style={{ marginTop: '8px', background: '#1a1a2e', color: '#CFF389', borderRadius: '6px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', userSelect: 'all' }}>
                        cd ~/Desktop/tapas-library/printer_bridge && python3 print_bridge.py
                      </div>
                      <div style={{ marginTop: '6px', color: '#888', fontSize: '11px' }}>Keep the terminal open while printing. Click <strong>Check Connection</strong> after starting it.</div>
                    </div>
                  ) : printerNeedsFix ? (
                    <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '6px', padding: '10px', fontSize: '12px' }}>
                      <div style={{ color: '#c53030', fontWeight: 600, marginBottom: '4px' }}>⚠️ {diag.diagnosis}</div>
                      <div style={{ color: '#742a2a', fontSize: '11px', lineHeight: 1.7 }}>
                        {diag.installed ? `Queue ${diag.enabled ? 'enabled' : 'paused'}` : 'Printer not detected'}
                        {diag.reason ? ` · ${diag.reason}` : ''}
                        {diag.queued ? ` · ${diag.queued} job(s) stuck` : ''}
                      </div>
                      <div style={{ color: '#742a2a', fontSize: '11px', marginTop: '6px' }}>
                        Click <strong>🔧 Auto-Fix</strong> to clear the queue and re-enable the printer automatically.
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: '6px', padding: '10px', fontSize: '12px' }}>
                      {diag ? (
                        <span style={{ color: '#276749' }}>
                          ✅ <strong>Zebra online &amp; ready</strong>
                          {diag.state ? ` · ${diag.state}` : ''}
                          {diag.queued ? ` · ${diag.queued} in queue` : ''}
                        </span>
                      ) : (
                        <span style={{ color: '#276749' }}>✅ <strong>Bridge is running</strong> — label printer ready to use.</span>
                      )}
                    </div>
                  )
                ) : (
                  <div style={{ background: '#f8f9ff', border: '1px solid #e0e8ff', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#667eea' }}>
                    💡 <strong>How to connect:</strong> {dev.connectTip}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                {!isBridgePrinter && !isReceiptPrinter && (
                  <button onClick={() => { saveDevices({ ...devices, [dev.key]: !connected }); toast.success(connected ? `${dev.name} disconnected` : `${dev.name} marked as connected`); }}
                    style={{ padding: '8px 16px', background: connected ? '#ff6b6b' : '#1dd1a1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                    {connected ? 'Disconnect' : 'Mark Connected'}
                  </button>
                )}
                {isBridgePrinter && printerNeedsFix && (
                  <button onClick={runAutoFix} disabled={fixing}
                    style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: fixing ? 'default' : 'pointer', fontWeight: '600', fontSize: '12px', opacity: fixing ? 0.6 : 1 }}>
                    {fixing ? 'Fixing…' : '🔧 Auto-Fix'}
                  </button>
                )}
                {isReceiptPrinter ? (
                  <button onClick={runReceiptTest} disabled={testingReceipt || receipt.state === 'setup-needed' || receipt.state === 'checking'}
                    style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', opacity: (testingReceipt || receipt.state === 'setup-needed') ? 0.6 : 1 }}>
                    {testingReceipt ? 'Printing…' : '🧾 Test Print'}
                  </button>
                ) : (
                  <button onClick={() => testDevice(dev.key)} disabled={testing === dev.key}
                    style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                    {testing === dev.key ? 'Checking...' : isBridgePrinter ? 'Check Connection' : 'Test'}
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
          <li><strong>Label printer stuck?</strong> If the Barcode Label Printer shows <em>Needs attention</em>, click <strong>Auto-Fix</strong> — it clears the queue and re-enables the printer.</li>
          <li><strong>Receipt printer:</strong> No driver needed — plug it into the till computer by USB and set up the print station there with one command (see the Receipt printer card). Every phone and laptop then prints to it. Use <strong>Test Print</strong> to check.</li>
          <li><strong>Barcode labels:</strong> Set paper size to 58mm or 80mm width in printer settings</li>
          <li><strong>Chrome:</strong> Go to chrome://settings → Printing → set default printer</li>
          <li><strong>Bluetooth scanner:</strong> Pair in System Settings → Bluetooth, then it works like a keyboard</li>
        </ul>
      </div>
    </div>
  );
}
