// Process a captured/uploaded book cover photo: detect the 4 corners of
// the cover with OpenCV.js, then perspective-warp it to a flat rectangle.
// If detection fails, returns the original blob untouched.

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

// Preload OpenCV when the module is imported, so by the time the user
// triggers a capture the runtime is usually already initialised.
export function preloadOpenCV() {
  return loadOpenCV().catch(err => console.warn('OpenCV preload failed:', err));
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function orderCorners(points) {
  const sum = points.map(p => ({ p, s: p.x + p.y }));
  const diff = points.map(p => ({ p, d: p.x - p.y }));
  sum.sort((a, b) => a.s - b.s);
  diff.sort((a, b) => a.d - b.d);
  return [sum[0].p, diff[diff.length - 1].p, sum[sum.length - 1].p, diff[0].p];
}

function detectCorners(cv, sourceCanvas) {
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

// Loads `blob` into a canvas and returns it.
function blobToCanvas(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Main entry: takes a Blob (from camera capture or file picker),
// returns a deskewed Blob suitable for upload. Falls back to the
// original blob if OpenCV can't find a cover quad.
export async function processBookCoverImage(blob) {
  let cv;
  try {
    cv = await loadOpenCV();
  } catch (err) {
    console.warn('OpenCV unavailable, using raw image:', err);
    return blob;
  }

  const fullCanvas = await blobToCanvas(blob);

  // Detect on a downscaled copy for speed; map corners back to full res.
  const MAX_DETECT = 800;
  const scale = Math.min(1, MAX_DETECT / Math.max(fullCanvas.width, fullCanvas.height));
  let detectCanvas = fullCanvas;
  if (scale < 1) {
    detectCanvas = document.createElement('canvas');
    detectCanvas.width = Math.round(fullCanvas.width * scale);
    detectCanvas.height = Math.round(fullCanvas.height * scale);
    detectCanvas.getContext('2d').drawImage(fullCanvas, 0, 0, detectCanvas.width, detectCanvas.height);
  }

  let corners = null;
  try {
    const detected = detectCorners(cv, detectCanvas);
    if (detected) corners = detected.map(p => ({ x: p.x / scale, y: p.y / scale }));
  } catch (err) {
    console.warn('Cover detection failed:', err);
  }

  if (!corners) {
    // No quad found — return original blob untouched.
    return blob;
  }

  try {
    const outCanvas = warpToFlatRect(cv, fullCanvas, corners);
    return await new Promise(resolve => outCanvas.toBlob(b => resolve(b || blob), 'image/jpeg', 0.9));
  } catch (err) {
    console.warn('Warp failed:', err);
    return blob;
  }
}
