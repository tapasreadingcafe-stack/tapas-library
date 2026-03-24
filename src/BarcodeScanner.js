import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
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
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          setFound(true);
          onScan(code.data);
          setTimeout(() => {
            onClose();
          }, 500);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onScan, onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000
    }}>
      <div style={{
        position: 'relative',
        width: '90%',
        maxWidth: '400px',
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        padding: '20px'
      }}>
        <h2 style={{ margin: '0 0 15px 0' }}>📱 Scan Barcode</h2>
        
        {error ? (
          <div style={{ color: '#ff6b6b', padding: '20px', textAlign: 'center' }}>
            ❌ {error}
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                borderRadius: '4px',
                marginBottom: '15px'
              }}
              autoPlay
              playsInline
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', marginBottom: '15px' }}>
              Point camera at barcode
            </p>
            {found && (
              <p style={{ textAlign: 'center', color: '#4CAF50', fontWeight: 'bold', marginBottom: '15px' }}>
                ✅ Barcode found!
              </p>
            )}
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}