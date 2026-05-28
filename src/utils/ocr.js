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

// Runs OCR on an image blob. Returns Tesseract's full `data` object
// (includes per-line bboxes + confidence). Throws on failure.
export async function recognizeText(blob) {
  const Tess = await loadTesseract();
  const { data } = await Tess.recognize(blob, 'eng');
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
