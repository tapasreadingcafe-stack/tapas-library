import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Camera access denied. Check permissions.');
      }
    };
    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      else if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (found) return;
    let detector = null;

    // Use native BarcodeDetector if available (reads EAN-13, CODE_128, QR, etc.)
    if (hasBarcodeDetector) {
      try {
        detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
        });
      } catch {}
    }

    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      let code = null;

      // Try native BarcodeDetector first (handles 1D barcodes like ISBN EAN-13, CODE_128)
      if (detector) {
        try {
          let barcodes = await detector.detect(canvas);
          // If no result, try with enhanced contrast (helps with printed labels)
          if (!barcodes.length) {
            try {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const d = imgData.data;
              for (let p = 0; p < d.length; p += 4) {
                const avg = (d[p] + d[p+1] + d[p+2]) / 3;
                d[p] = d[p+1] = d[p+2] = avg > 140 ? 255 : 0;
              }
              const enhCanvas = document.createElement('canvas');
              enhCanvas.width = canvas.width;
              enhCanvas.height = canvas.height;
              enhCanvas.getContext('2d').putImageData(imgData, 0, 0);
              barcodes = await detector.detect(enhCanvas);
            } catch {}
          }
          if (barcodes.length > 0) {
            code = barcodes[0].rawValue;
          }
        } catch {}
      }

      // Fallback to jsQR for QR codes only
      if (!code) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imageData.data, imageData.width, imageData.height);
        if (qr) code = qr.data;
      }

      if (code && code !== lastScanned) {
        setFound(true);
        setLastScanned(code);
        onScan(code);
        setTimeout(() => onClose(), 600);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [found, onScan, onClose, hasBarcodeDetector, lastScanned]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 5000
    }}>
      <div style={{
        position: 'relative', width: '92%', maxWidth: '420px',
        background: 'white', borderRadius: '12px', overflow: 'hidden', padding: '20px'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>📱 Scan Barcode</h2>

        {error ? (
          <div style={{ color: '#e74c3c', padding: '20px', textAlign: 'center', fontSize: '14px' }}>
            ❌ {error}
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
              <video
                ref={videoRef}
                style={{ width: '100%', display: 'block', borderRadius: '8px' }}
                autoPlay
                playsInline
                muted
              />
              {/* Scan guide overlay */}
              <div style={{
                position: 'absolute', top: '50%', left: '10%', right: '10%',
                height: '3px', background: found ? '#1dd1a1' : '#667eea',
                transform: 'translateY(-50%)', borderRadius: '2px',
                boxShadow: `0 0 10px ${found ? '#1dd1a1' : '#667eea'}`,
                animation: found ? 'none' : 'scanLine 2s ease-in-out infinite',
              }} />
              <style>{`@keyframes scanLine { 0%,100% { top: 30%; } 50% { top: 70%; } }`}</style>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {found ? (
              <p style={{ textAlign: 'center', color: '#1dd1a1', fontWeight: '700', fontSize: '15px', margin: '8px 0' }}>
                ✅ Barcode found: {lastScanned}
              </p>
            ) : (
              <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', margin: '4px 0' }}>
                Point camera at ISBN barcode on the book
              </p>
            )}

            {!hasBarcodeDetector && (
              <p style={{ textAlign: 'center', color: '#f39c12', fontSize: '11px', margin: '4px 0', background: '#fff3cd', padding: '6px', borderRadius: '4px' }}>
                ⚠️ Your browser only supports QR codes. For ISBN barcodes, use Chrome on Android or type the number manually below.
              </p>
            )}
          </>
        )}

        <button onClick={onClose}
          style={{
            width: '100%', padding: '11px', marginTop: '8px',
            background: '#667eea', color: 'white', border: 'none',
            borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '14px'
          }}>
          Close
        </button>
      </div>
    </div>
  );
}
