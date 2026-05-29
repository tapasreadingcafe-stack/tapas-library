// Cloud OCR via OCR.space — much more accurate than in-browser
// Tesseract on book-cover photos with decorative fonts.
//
// Default API key 'helloworld' works for low-volume testing. For
// production, sign up free at https://ocr.space/ocrapi/freekey and
// set REACT_APP_OCR_SPACE_KEY in your Vercel env (25k requests/mo).

const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = process.env.REACT_APP_OCR_SPACE_KEY || 'helloworld';
const MAX_BYTES = 1024 * 1024; // OCR.space free tier caps file at 1MB

// Downscale + compress until under `maxBytes`, returning a JPEG blob.
async function shrinkForUpload(blob, maxBytes = MAX_BYTES) {
  if (blob.size <= maxBytes) return blob;

  const img = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
    i.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    i.src = url;
  });

  // Try progressively smaller dimensions / qualities until it fits.
  const dims = [1600, 1280, 1024, 800];
  const qualities = [0.85, 0.75, 0.65];
  for (const maxDim of dims) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    for (const q of qualities) {
      const out = await new Promise(r => canvas.toBlob(b => r(b), 'image/jpeg', q));
      if (out && out.size <= maxBytes) return out;
    }
  }
  // Last resort — return the smallest we could make
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = Math.round(800 * (img.naturalHeight / img.naturalWidth));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise(r => canvas.toBlob(b => r(b), 'image/jpeg', 0.6));
}

// Runs cloud OCR on a blob. Returns a normalised result object:
//   { text: 'full recognised text', lines: [{ text, ... }] }
export async function recognizeText(blob) {
  const file = await shrinkForUpload(blob);

  const fd = new FormData();
  fd.append('file', file, 'photo.jpg');
  fd.append('language', 'eng');
  fd.append('OCREngine', '2');     // newer / more accurate engine
  fd.append('scale', 'true');      // auto-upscale small text
  fd.append('isOverlayRequired', 'false');

  const response = await fetch(OCR_SPACE_URL, {
    method: 'POST',
    headers: { apikey: OCR_API_KEY },
    body: fd,
  });
  if (!response.ok) {
    throw new Error('OCR.space HTTP ' + response.status);
  }
  const json = await response.json();
  if (json.IsErroredOnProcessing) {
    const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join(' ') : (json.ErrorMessage || 'OCR failed');
    throw new Error(msg);
  }
  const parsed = json.ParsedResults?.[0]?.ParsedText || '';
  const lines = parsed.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return { text: parsed, lines: lines.map(text => ({ text })) };
}

// Patterns that signal the end of the title region — author credits,
// copyright, edition / age info. Anything after this we ignore.
const TITLE_TERMINATOR = /^(by\b|written\b|illustrated\b|story\b|author|adapted|translated|©|copyright|published|edition|volume|vol\.|book\s*\d|chapter|ages?\s*\d|level\s*\d)/i;

// Pick the most likely book title from OCR output.
// Strategy: walk lines from the top, keep all "word-like" lines
// (mostly letters), stop at the first author/credit/copyright line,
// then join them with spaces. Handles single-line titles AND stylised
// covers like "TEN / APPLES / UP / ON / TOP" where every word is on
// its own line.
export function pickTitleLine(data) {
  const lines = (data?.lines?.map(l => (l.text || '').trim()) || []).filter(Boolean);
  if (!lines.length) return '';

  const isWordLike = (text) => {
    if (text.length < 1) return false;
    const letters = (text.match(/[a-zA-Z]/g) || []).length;
    const ratio = letters / Math.max(1, text.length);
    // Mostly letters, and at least one real letter run of ≥ 1 char.
    return letters >= 1 && ratio >= 0.55;
  };

  const titleParts = [];
  for (const line of lines) {
    if (TITLE_TERMINATOR.test(line)) break;
    if (!isWordLike(line)) {
      // Junk line between title words (e.g. a stray ":" or "—").
      // Skip but don't terminate — the next real word may still be
      // part of the title.
      continue;
    }
    titleParts.push(line);
    // Hard cap so we never grab a whole back-cover blurb.
    if (titleParts.join(' ').length > 120) break;
  }

  if (titleParts.length) {
    return cleanupTitle(titleParts.join(' '));
  }

  // Fallback: nothing matched — pick longest letter-dominant line.
  const scored = lines.map(text => ({
    text,
    letters: (text.match(/[a-zA-Z]/g) || []).length,
    length: text.length,
  }));
  scored.sort((a, b) => b.length - a.length);
  return cleanupTitle(scored[0]?.text || '');
}

function cleanupTitle(s) {
  return s
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9.!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
