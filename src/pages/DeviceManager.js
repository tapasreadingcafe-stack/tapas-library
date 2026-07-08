import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';

const BRIDGE_URL = 'http://127.0.0.1:5050';

const DEVICE_TYPES = [
  { key: 'barcode_scanner', icon: '📷', name: 'Barcode Scanner', desc: 'USB/Bluetooth barcode scanner for scanning book ISBNs and copy codes', connectTip: 'Plug in USB scanner or pair Bluetooth. Scanner types barcodes as keyboard input — no driver needed.' },
  { key: 'bill_printer', icon: '🧾', name: 'Bill / Receipt Printer', desc: 'Thermal printer for printing checkout receipts and POS bills', connectTip: 'Connect via USB. Install printer driver. Select it when clicking Print in the app.' },
  { key: 'barcode_printer', icon: '🏷️', name: 'Barcode Label Printer', desc: 'Thermal printer for printing book barcode stickers (Zebra, TSC, TVS)', connectTip: null },
];

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

  // Printer needs attention when the bridge is up but the device isn't healthy.
  const printerNeedsFix = bridgeStatus === true && diag && !diag.healthy;

  return (
    <div style={{ padding: '20px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>🔌 Device Manager</h1>
      <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>Connect and manage barcode scanners, receipt printers, and label printers</p>

      {DEVICE_TYPES.map(dev => {
        const connected = devices[dev.key];
        const isBridgePrinter = dev.key === 'barcode_printer';

        // Status badge (label + colors)
        let badge = { label: connected ? 'Connected' : 'Not connected', bg: connected ? '#d4edda' : '#f8f8f8', fg: connected ? '#155724' : '#999' };
        let borderColor = connected ? '#1dd1a1' : '#e0e0e0';
        if (isBridgePrinter) {
          if (bridgeStatus === null) badge = { label: 'Checking…', bg: '#f8f8f8', fg: '#999' };
          else if (printerNeedsFix) { badge = { label: 'Needs attention', bg: '#fff3cd', fg: '#8a6d00' }; borderColor = '#f6c343'; }
          else if (bridgeStatus === true) { badge = { label: 'Connected', bg: '#d4edda', fg: '#155724' }; borderColor = '#1dd1a1'; }
          else { badge = { label: 'Not connected', bg: '#f8f8f8', fg: '#999' }; borderColor = '#e0e0e0'; }
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

                {isBridgePrinter ? (
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
                {!isBridgePrinter && (
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
                <button onClick={() => testDevice(dev.key)} disabled={testing === dev.key}
                  style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                  {testing === dev.key ? 'Checking...' : isBridgePrinter ? 'Check Connection' : 'Test'}
                </button>
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
          <li><strong>Receipt printer:</strong> Set as default printer for fastest printing</li>
          <li><strong>Barcode labels:</strong> Set paper size to 58mm or 80mm width in printer settings</li>
          <li><strong>Chrome:</strong> Go to chrome://settings → Printing → set default printer</li>
          <li><strong>Bluetooth scanner:</strong> Pair in System Settings → Bluetooth, then it works like a keyboard</li>
        </ul>
      </div>
    </div>
  );
}
