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

// Runs OCR on an image blob. Returns the recognised text (may contain
// multiple lines). Throws on failure — caller decides how to handle.
export async function recognizeText(blob) {
  const Tess = await loadTesseract();
  const { data } = await Tess.recognize(blob, 'eng');
  return (data?.text || '').trim();
}

// Convenience: returns the most prominent line (longest non-empty
// stretch), which for a title-only photo is usually the title text.
export function pickTitleLine(rawText) {
  if (!rawText) return '';
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  // Prefer the longest line — short lines are usually subtitle / author / noise.
  lines.sort((a, b) => b.length - a.length);
  return lines[0];
}
