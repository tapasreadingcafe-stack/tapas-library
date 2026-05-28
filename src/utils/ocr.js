// Lazy-loaded Tesseract.js text recognition. Loads the library from
// CDN on first use (~2MB JS + ~1MB English language data), then
// caches in browser. Used for the "scan title from photo" feature.

const TESSERACT_URL = 'https://unpkg.com/tesseract.js@5.1.0/dist/tesseract.min.js';

let tessLoadingPromise = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tessLoadingPromise) return tessLoadingPromise;
  tessLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TESSERACT_URL}"]`);
    const onReady = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error('Tesseract loaded but global missing'));
    };
    if (existing) { onReady(); return; }
    const script = document.createElement('script');
    script.src = TESSERACT_URL;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => { tessLoadingPromise = null; reject(new Error('Failed to load Tesseract.js')); };
    document.head.appendChild(script);
  });
  return tessLoadingPromise;
}

// Preprocess for OCR: downscale to ~1600px, convert to grayscale with
// a contrast bump. Book cover photos often have colour and uneven
// lighting; high-contrast B&W gives Tesseract much better input.
async function preprocessForOCR(blob, maxDim = 1600) {
  const img = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
    i.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    i.src = url;
  });
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const px = id.data;
  const contrast = 1.4;
  const intercept = 128 - contrast * 128;
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const v = Math.max(0, Math.min(255, g * contrast + intercept));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(id, 0, 0);
  return await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.95));
}

// Runs OCR on an image blob. Returns Tesseract's full `data` object
// (includes per-line bboxes + confidence). Throws on failure.
export async function recognizeText(blob) {
  const Tess = await loadTesseract();
  let prepared = blob;
  try {
    prepared = await preprocessForOCR(blob);
  } catch (err) {
    console.warn('OCR preprocess failed, using raw image:', err);
  }
  const { data } = await Tess.recognize(prepared, 'eng', {
    // PSM 6 = "Assume a single uniform block of text". Works much
    // better than the default fully-automatic mode for cover-style
    // photos that have a few prominent lines.
    tessedit_pageseg_mode: '6',
  });
  return data;
}

// Pick the line that's most likely to be the book title.
// Strategy: prefer lines with the largest font size (tallest bbox) and
// reasonable text content. Book titles are nearly always the biggest
// text on a cover.
export function pickTitleLine(data) {
  const rawText = data?.text || (typeof data === 'string' ? data : '');

  // Use structured lines if available
  const lines = (data?.lines || []).map(line => {
    const text = (line.text || '').trim();
    const height = (line.bbox?.y1 || 0) - (line.bbox?.y0 || 0);
    return { text, height, confidence: line.confidence || 0 };
  }).filter(l => l.text.length >= 3);

  // Filter out obvious junk — mostly digits/punctuation/short fragments
  const goodLines = lines.filter(l => {
    const letters = (l.text.match(/[a-zA-Z]/g) || []).length;
    return letters >= Math.max(3, l.text.length * 0.5);
  });

  const candidates = goodLines.length ? goodLines : lines;
  if (candidates.length) {
    // Biggest font wins — that's the title on a book cover.
    candidates.sort((a, b) => b.height - a.height);
    return cleanupTitle(candidates[0].text);
  }

  // Fallback for plain-text input
  const fallback = rawText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  fallback.sort((a, b) => b.length - a.length);
  return cleanupTitle(fallback[0] || '');
}

function cleanupTitle(s) {
  return s
    .replace(/^[^a-zA-Z0-9]+/, '')   // strip leading junk
    .replace(/[^a-zA-Z0-9.!?]+$/, '') // strip trailing junk
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim();
}
