import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const OPENCV_URL = 'https://docs.opencv.org/4.10.0/opencv.js';

let opencvLoadingPromise = null;
function loadOpenCV() {
  if (window.cv && window.cv.Mat) return Promise.resolve(window.cv);
  if (opencvLoadingPromise) return opencvLoadingPromise;
  opencvLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${OPENCV_URL}"]`);
    const onReady = () => {
      const finish = () => resolve(window.cv);
      if (window.cv && window.cv.Mat) return finish();
      window.cv = window.cv || {};
      window.cv.onRuntimeInitialized = finish;
    };
    if (existing) { onReady(); return; }
    const script = document.createElement('script');
    script.src = OPENCV_URL;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => { opencvLoadingPromise = null; reject(new Error('Failed to load OpenCV.js')); };
    document.head.appendChild(script);
  });
  return opencvLoadingPromise;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function orderCorners(points) {
  // Returns [tl, tr, br, bl]
  const sum = points.map(p => ({ p, s: p.x + p.y }));
  const diff = points.map(p => ({ p, d: p.x - p.y }));
  sum.sort((a, b) => a.s - b.s);
  diff.sort((a, b) => a.d - b.d);
  const tl = sum[0].p;
  const br = sum[sum.length - 1].p;
  const tr = diff[diff.length - 1].p;
  const bl = diff[0].p;
  return [tl, tr, br, bl];
}

function detectCornersWithOpenCV(cv, sourceCanvas) {
  let src, gray, blur, edges, contours, hierarchy;
  try {
    src = cv.imread(sourceCanvas);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    blur = new cv.Mat();
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    edges = new cv.Mat();
    cv.Canny(blur, edges, 50, 150);
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel);
    kernel.delete();

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = src.cols * src.rows;
    let bestQuad = null;
    let bestArea = 0;
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const peri = cv.arcLength(c, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(c, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        const area = Math.abs(cv.contourArea(approx));
        if (area > bestArea && area > imgArea * 0.1) {
          if (bestQuad) bestQuad.delete();
          bestQuad = approx;
          bestArea = area;
        } else {
          approx.delete();
        }
      } else {
        approx.delete();
      }
      c.delete();
    }

    if (!bestQuad) return null;
    const pts = [];
    for (let i = 0; i < 4; i++) {
      pts.push({ x: bestQuad.data32S[i * 2], y: bestQuad.data32S[i * 2 + 1] });
    }
    bestQuad.delete();
    return orderCorners(pts);
  } finally {
    [src, gray, blur, edges, contours, hierarchy].forEach(m => m && m.delete && m.delete());
  }
}

function warpToFlatRect(cv, sourceCanvas, corners) {
  const [tl, tr, br, bl] = corners;
  const widthTop = dist(tl, tr);
  const widthBottom = dist(bl, br);
  const heightLeft = dist(tl, bl);
  const heightRight = dist(tr, br);
  const outW = Math.round(Math.max(widthTop, widthBottom));
  const outH = Math.round(Math.max(heightLeft, heightRight));

  let src, dst, M;
  try {
    src = cv.imread(sourceCanvas);
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
    ]);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0, outW, 0, outW, outH, 0, outH,
    ]);
    M = cv.getPerspectiveTransform(srcTri, dstTri);
    dst = new cv.Mat();
    cv.warpPerspective(src, dst, M, new cv.Size(outW, outH));
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    cv.imshow(outCanvas, dst);
    srcTri.delete();
    dstTri.delete();
    return outCanvas;
  } finally {
    [src, dst, M].forEach(m => m && m.delete && m.delete());
  }
}

export default function BookCoverScanner({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const imageCanvasRef = useRef(null); // full-resolution captured image
  const overlayRef = useRef(null);     // visible overlay canvas
  const [stage, setStage] = useState('camera'); // 'camera' | 'detecting' | 'adjust'
  const [error, setError] = useState('');
  const [corners, setCorners] = useState(null); // image-space coordinates
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const draggingRef = useRef(null);
  const [processing, setProcessing] = useState(false);

  // Preload OpenCV.js as soon as scanner mounts (in parallel with camera startup)
  useEffect(() => {
    loadOpenCV().catch(err => console.warn('OpenCV preload failed:', err));
  }, []);

  // Start camera
  useEffect(() => {
    if (stage !== 'camera') return;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        setError(isHttp
          ? 'Camera needs HTTPS. You’re on http://' + window.location.host + ' — open the dashboard on https:// or via localhost to use the scanner.'
          : 'Camera API not available in this browser.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError(err.message || 'Could not access camera. Make sure you allowed permission.');
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [stage]);

  // Capture frame, run detection
  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    imageCanvasRef.current = canvas;
    setImgSize({ w: canvas.width, h: canvas.height });
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStage('detecting');

    // Run detection on a downscaled copy for speed
    const MAX_DETECT = 800;
    const scale = Math.min(1, MAX_DETECT / Math.max(canvas.width, canvas.height));
    let detectCanvas = canvas;
    if (scale < 1) {
      detectCanvas = document.createElement('canvas');
      detectCanvas.width = Math.round(canvas.width * scale);
      detectCanvas.height = Math.round(canvas.height * scale);
      detectCanvas.getContext('2d').drawImage(canvas, 0, 0, detectCanvas.width, detectCanvas.height);
    }

    let detected = null;
    try {
      const cv = await loadOpenCV();
      const small = detectCornersWithOpenCV(cv, detectCanvas);
      if (small) {
        // Map corners back to full-resolution image space
        detected = small.map(p => ({ x: p.x / scale, y: p.y / scale }));
      }
    } catch (err) {
      console.warn('OpenCV detection failed:', err);
    }
    if (!detected) {
      // Fallback: 80% centered rectangle
      const margin = 0.1;
      detected = [
        { x: canvas.width * margin, y: canvas.height * margin },
        { x: canvas.width * (1 - margin), y: canvas.height * margin },
        { x: canvas.width * (1 - margin), y: canvas.height * (1 - margin) },
        { x: canvas.width * margin, y: canvas.height * (1 - margin) },
      ];
    }
    setCorners(detected);
    setStage('adjust');
  };

  // Compute responsive display size
  useEffect(() => {
    if (stage !== 'adjust' || !imgSize.w) return;
    const computeSize = () => {
      const maxW = Math.min(window.innerWidth - 32, 700);
      const maxH = window.innerHeight - 220;
      const ratio = imgSize.w / imgSize.h;
      let w = maxW, h = maxW / ratio;
      if (h > maxH) { h = maxH; w = maxH * ratio; }
      setDisplaySize({ w: Math.round(w), h: Math.round(h) });
    };
    computeSize();
    window.addEventListener('resize', computeSize);
    return () => window.removeEventListener('resize', computeSize);
  }, [stage, imgSize]);

  // Draw image + overlay
  useEffect(() => {
    if (stage !== 'adjust' || !overlayRef.current || !imageCanvasRef.current || !corners || !displaySize.w) return;
    const canvas = overlayRef.current;
    canvas.width = displaySize.w;
    canvas.height = displaySize.h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageCanvasRef.current, 0, 0, displaySize.w, displaySize.h);

    const scaleX = displaySize.w / imgSize.w;
    const scaleY = displaySize.h / imgSize.h;
    const pts = corners.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));

    // Dark overlay outside quad
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, displaySize.w, displaySize.h);
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill('evenodd');
    ctx.restore();

    // White quad outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();

    // Corner handles
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [corners, displaySize, imgSize, stage]);

  const getCanvasPoint = (e) => {
    const canvas = overlayRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!corners) return;
    const pt = getCanvasPoint(e);
    const scaleX = displaySize.w / imgSize.w;
    const scaleY = displaySize.h / imgSize.h;
    let nearest = -1, nearestDist = Infinity;
    corners.forEach((c, i) => {
      const d = Math.hypot(c.x * scaleX - pt.x, c.y * scaleY - pt.y);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    });
    if (nearestDist < 30) draggingRef.current = nearest;
  };

  const handlePointerMove = (e) => {
    if (draggingRef.current === null || draggingRef.current === undefined) return;
    e.preventDefault();
    const pt = getCanvasPoint(e);
    const scaleX = displaySize.w / imgSize.w;
    const scaleY = displaySize.h / imgSize.h;
    const ix = Math.max(0, Math.min(imgSize.w, pt.x / scaleX));
    const iy = Math.max(0, Math.min(imgSize.h, pt.y / scaleY));
    setCorners(prev => {
      const next = prev.slice();
      next[draggingRef.current] = { x: ix, y: iy };
      return next;
    });
  };

  const handlePointerUp = () => { draggingRef.current = null; };

  const handleRetake = () => {
    setCorners(null);
    setImgSize({ w: 0, h: 0 });
    imageCanvasRef.current = null;
    setStage('camera');
  };

  const handleDone = useCallback(async () => {
    if (!imageCanvasRef.current || !corners) return;
    setProcessing(true);
    try {
      const cv = await loadOpenCV();
      const outCanvas = warpToFlatRect(cv, imageCanvasRef.current, corners);
      outCanvas.toBlob(
        (blob) => {
          if (blob) onCapture(blob);
          setProcessing(false);
        },
        'image/jpeg',
        0.9
      );
    } catch (err) {
      console.error(err);
      setError('Could not process image: ' + err.message);
      setProcessing(false);
    }
  }, [corners, onCapture]);

  const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.92)', zIndex: 3000,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  };
  const btn = (bg) => ({
    background: bg, color: 'white', border: 'none', borderRadius: '8px',
    padding: '12px 20px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    minHeight: '44px',
  });

  const modal = (
    <div style={overlay}>
      <button
        type="button"
        onClick={onClose}
        style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 24, cursor: 'pointer', zIndex: 10 }}
        aria-label="Close"
      >×</button>

      {error && (
        <div style={{ color: 'white', textAlign: 'center', maxWidth: 400, marginBottom: 16 }}>
          <p style={{ fontSize: 16 }}>⚠️ {error}</p>
          <button type="button" onClick={onClose} style={btn('#667eea')}>Close</button>
        </div>
      )}

      {!error && stage === 'camera' && (
        <>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: 'calc(100vh - 200px)' }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 200px)', borderRadius: 8, background: '#000', pointerEvents: 'none' }}
            />
            <div style={{
              position: 'absolute', inset: '10%',
              border: '2px dashed rgba(255,255,255,0.7)', borderRadius: 8, pointerEvents: 'none',
            }} />
          </div>
          <p style={{ color: 'white', marginTop: 12, fontSize: 13, opacity: 0.8 }}>
            Frame the book cover inside the dashed box
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="button" onClick={onClose} style={btn('rgba(255,255,255,0.2)')}>Cancel</button>
            <button type="button" onClick={handleCapture} style={btn('#667eea')}>📷 Capture</button>
          </div>
        </>
      )}

      {!error && stage === 'detecting' && (
        <p style={{ color: 'white', fontSize: 16 }}>⏳ Detecting cover…</p>
      )}

      {!error && stage === 'adjust' && (
        <>
          <p style={{ color: 'white', marginBottom: 12, fontSize: 13, opacity: 0.85 }}>
            Drag the corners to adjust, then click Done
          </p>
          <canvas
            ref={overlayRef}
            style={{ touchAction: 'none', maxWidth: '100%', borderRadius: 8, cursor: 'grab' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="button" onClick={handleRetake} disabled={processing} style={btn('rgba(255,255,255,0.2)')}>↻ Retake</button>
            <button type="button" onClick={handleDone} disabled={processing} style={btn('#10b981')}>
              {processing ? '⏳ Processing…' : '✓ Done'}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(modal, document.body);
}
