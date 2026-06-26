import React, { useState, useEffect } from 'react';
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

export default function DeviceManager() {
  const toast = useToast();
  const [devices, setDevices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('connected_devices') || '{}'); } catch { return {}; }
  });
  const [testing, setTesting] = useState(null);
  const [bridgeStatus, setBridgeStatus] = useState(null); // null=checking, true=up, false=down

  const saveDevices = (d) => { setDevices(d); localStorage.setItem('connected_devices', JSON.stringify(d)); };

  // Auto-detect bridge on mount and update barcode_printer status
  useEffect(() => {
    pingBridge().then(up => {
      setBridgeStatus(up);
      if (up) {
        saveDevices(d => {
          const next = { ...d, barcode_printer: true };
          localStorage.setItem('connected_devices', JSON.stringify(next));
          return next;
        });
      }
    });
  }, []); // eslint-disable-line

  const testDevice = async (key) => {
    setTesting(key);
    if (key === 'barcode_scanner') {
      toast.info('Try scanning a barcode now. If text appears in the test box, scanner is working.');
    } else if (key === 'barcode_printer') {
      const up = await pingBridge();
      setBridgeStatus(up);
      if (up) {
        saveDevices({ ...devices, barcode_printer: true });
        toast.success('Label printer bridge is running and ready!');
      } else {
        saveDevices({ ...devices, barcode_printer: false });
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

  const [scanTest, setScanTest] = useState('');

  return (
    <div style={{ padding: '20px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>🔌 Device Manager</h1>
      <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>Connect and manage barcode scanners, receipt printers, and label printers</p>

      {DEVICE_TYPES.map(dev => {
        const connected = devices[dev.key];
        const isBridgePrinter = dev.key === 'barcode_printer';
        return (
          <div key={dev.key} style={{
            background: 'white', borderRadius: '10px', padding: '20px', marginBottom: '14px',
            borderLeft: `4px solid ${connected ? '#1dd1a1' : '#e0e0e0'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '24px' }}>{dev.icon}</span>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{dev.name}</h3>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                    background: connected ? '#d4edda' : '#f8f8f8', color: connected ? '#155724' : '#999',
                  }}>
                    {isBridgePrinter && bridgeStatus === null ? 'Checking…' : connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 8px' }}>{dev.desc}</p>

                {isBridgePrinter ? (
                  <div style={{ background: bridgeStatus ? '#f0fff4' : '#f8f9ff', border: `1px solid ${bridgeStatus ? '#9ae6b4' : '#e0e8ff'}`, borderRadius: '6px', padding: '10px', fontSize: '12px' }}>
                    {bridgeStatus ? (
                      <span style={{ color: '#276749' }}>✅ <strong>Bridge is running</strong> — label printer ready to use.</span>
                    ) : (
                      <>
                        <span style={{ color: '#667eea' }}>💡 <strong>How to start:</strong> Open Terminal and run:</span>
                        <div style={{ marginTop: '8px', background: '#1a1a2e', color: '#CFF389', borderRadius: '6px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', userSelect: 'all' }}>
                          cd ~/Desktop/tapas-library/printer_bridge && python3 print_bridge.py
                        </div>
                        <div style={{ marginTop: '6px', color: '#888', fontSize: '11px' }}>Keep the terminal open while printing. Click <strong>Test</strong> after starting it.</div>
                      </>
                    )}
                  </div>
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
                <button onClick={() => testDevice(dev.key)} disabled={testing === dev.key}
                  style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                  {testing === dev.key ? 'Testing...' : isBridgePrinter ? 'Check Connection' : 'Test'}
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
          <li><strong>Receipt printer:</strong> Set as default printer for fastest printing</li>
          <li><strong>Barcode labels:</strong> Set paper size to 58mm or 80mm width in printer settings</li>
          <li><strong>Chrome:</strong> Go to chrome://settings → Printing → set default printer</li>
          <li><strong>Bluetooth scanner:</strong> Pair in System Settings → Bluetooth, then it works like a keyboard</li>
        </ul>
      </div>
    </div>
  );
}
