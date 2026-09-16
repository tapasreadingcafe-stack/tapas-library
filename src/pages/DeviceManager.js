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
const INSTALL_COMMAND = 'curl -fsSL https://dashboard.tapasreadingcafe.com/install-print-station.sh | bash';

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
  const [keyShown, setKeyShown] = useState(false);
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

  // Just the key. The installer asks "Station key:" and writes the .env line
  // itself — copying "STATION_KEY=…" would save STATION_KEY=STATION_KEY=… and
  // the station would be refused with no obvious reason why.
  const copyStationKey = async () => {
    try {
      await navigator.clipboard.writeText(stationKey);
      toast.success('Station key copied — paste it when the installer asks');
    } catch {
      toast.error('Could not copy — click Show, then select and copy the key');
    }
  };

  const copyInstallCommand = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      toast.success('Command copied — paste it into Terminal on the till computer');
    } catch {
      toast.error('Could not copy — select the command and copy it');
    }
  };

  const smallBtn = { padding: '7px 11px', background: '#fff', border: '1px solid #d6dbe4', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, flexShrink: 0, fontFamily: 'inherit' };
  const panel = (bg, border) => ({ background: bg, border: `1px solid ${border}`, borderRadius: '6px', padding: '10px', fontSize: '12px', lineHeight: 1.6 });
  const command = (text) => (
    <div style={{ marginTop: '6px', background: '#1a1a2e', color: '#CFF389', borderRadius: '6px', padding: '9px 12px', fontFamily: 'monospace', fontSize: '12px', userSelect: 'all', overflowX: 'auto', whiteSpace: 'nowrap' }}>{text}</div>
  );

  /* One-command install on the till computer — no code folder, no git.
   * The installer (scripts/sync-print-station.js → /install-print-station.sh)
   * finds Python, builds the USB print queue, and starts the station at login.
   * Written for the counter's old MacBook (macOS 12) as much as a new one. */
  const step = (n, title, body) => (
    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
      <div style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: '#1a1a2e', color: '#CFF389', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#2d3748' }}>{title}</div>
        {body}
      </div>
    </div>
  );

  const renderStationSetup = () => (
    <div style={{ marginTop: '6px', color: '#4a5568' }}>
      {step(1, 'Get the computer ready', (
        <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
          <li>Plug it into power and connect it to the cafe Wi-Fi.</li>
          <li>Plug the receipt printer in by USB (and the Zebra label printer, if it prints labels too).</li>
          <li>
            Stop it sleeping: <strong>System Preferences → Battery → Power Adapter →</strong> turn on
            “Prevent computer from sleeping automatically when the display is off”.
            A sleeping till doesn’t print.
          </li>
        </ul>
      ))}

      {step(2, 'Copy the station key', stationKey ? (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
          <div style={{ flex: 1, minWidth: 0, background: '#1a1a2e', color: '#CFF389', borderRadius: '6px', padding: '9px 12px', fontFamily: 'monospace', fontSize: '12px', overflowX: 'auto', whiteSpace: 'nowrap', userSelect: 'all' }}>
            {keyShown ? stationKey : '•'.repeat(24)}
          </div>
          <button onClick={() => setKeyShown(v => !v)} style={smallBtn}>{keyShown ? 'Hide' : 'Show'}</button>
          <button onClick={copyStationKey} style={smallBtn}>Copy</button>
        </div>
      ) : (
        <div style={{ color: '#999', marginTop: '4px' }}>Loading station key…</div>
      ))}

      {step(3, 'Open Terminal on that computer and paste this', (
        <>
          <div style={{ marginTop: '2px', fontSize: '11px', color: '#718096' }}>
            Terminal is in <strong>Applications → Utilities</strong>.
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>{command(INSTALL_COMMAND)}</div>
            <button onClick={copyInstallCommand} style={{ ...smallBtn, marginTop: '6px' }}>Copy</button>
          </div>
          <div style={{ ...panel('#f7fafc', '#e2e8f0'), marginTop: '8px', fontSize: '11px' }}>
            <strong>Says it needs Python first?</strong> Normal on an older Mac. Click <strong>Install</strong> in
            the window that opens, wait for it to finish (10–30 minutes), then paste the command again.
          </div>
        </>
      ))}

      {step(4, 'Answer its questions', (
        <table style={{ marginTop: '6px', borderCollapse: 'collapse', fontSize: '12px', width: '100%' }}>
          <tbody>
            {[
              ['Station key', 'Paste the key from step 2'],
              ['How is the receipt printer connected?', <>Press <strong>Enter</strong> for USB — it finds the printer and sets it up. No need to add it in System Settings.</>],
              ['Label printer', <>Type <code>usb</code> if the Zebra is plugged in, or press <strong>Enter</strong> to skip</>],
              ['A name for this till', <>Anything — e.g. <code>Counter</code></>],
            ].map(([q, a]) => (
              <tr key={q}>
                <td style={{ padding: '5px 10px 5px 0', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '11px', color: '#2d3748', whiteSpace: 'nowrap' }}>{q}</td>
                <td style={{ padding: '5px 0', verticalAlign: 'top' }}>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}

      {step(5, 'Check it worked', (
        <div style={{ marginTop: '4px' }}>
          Wait for <strong>“Done. The station is running.”</strong> This card turns green within a few seconds —
          then press <strong>Test Print</strong>. If Terminal says <strong>“did NOT start”</strong>, take a photo of
          that screen and send it to whoever looks after the dashboard.
          From then on it starts by itself whenever that computer logs in.
        </div>
      ))}

      <div style={{ ...panel('#fff5f5', '#fed7d7'), marginTop: '14px', fontSize: '11px' }}>
        <strong>Only one print station at a time.</strong> When moving the printer to a new computer, stop the
        station on the old one first — otherwise both grab receipts, and the one without the printer fails them.
        On the old computer, paste into Terminal:
        {command('launchctl unload ~/Library/LaunchAgents/com.tapas.printstation.plist')}
        <div style={{ marginTop: '6px' }}>
          Receipts made while you switch aren’t lost: they wait in the queue for up to 30 minutes and print once
          the new station is up.
        </div>
      </div>
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
          <div style={{ color: '#975a16', fontWeight: 600 }}>
            {receipt.state === 'no-station'
              ? '🖥️ Set up the print station on the till computer (about 5 minutes)'
              : `🖥️ The print station on ${receipt.station?.id || 'the till computer'} has stopped`}
          </div>
          {receipt.state === 'station-offline' && (
            <div style={{ marginTop: '6px', color: '#744210' }}>
              Usually that computer is asleep, logged out, or switched off — wake it and log in, and
              it starts again by itself within a minute. If it still doesn't, run the steps below
              on it again; your saved settings are kept.
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
            Move the printer to another computer, or set up a new till
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
