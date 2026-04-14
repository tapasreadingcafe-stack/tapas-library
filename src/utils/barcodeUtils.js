// Code128B barcode encoder — shared across BookCopies, BarcodeManager, BarcodeEditor

export const CODE128B = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11100101100','11100100110',
  '11101100100','11100110100','11100110010','11011011000','11011000110',
  '11000110110','10100011000','10001011000','10001000110','10110001000',
  '10001101000','10001100010','11010001000','11000101000','11000100010',
  '10110111000','10110001110','10001101110','10111011000','10111000110',
  '10001110110','11101110110','11010001110','11000101110','11011101000',
  '11011100010','11011101110','11101011000','11101000110','11100010110',
  '11101101000','11101100010','11100011010','11101111010','11001000010',
  '11110001010','10100110000','10100001100','10010110000','10010000110',
  '10000101100','10000100110','10110010000','10110000100','10011010000',
  '10011000010','10000110100','10000110010','11000010010','11001010000',
  '11110111010','11000010100','10001111010','10100111100','10010111100',
  '10010011110','10111100100','10011110100','10011110010','11110100100',
  '11110010100','11110010010','11011011110','11011110110','11110110110',
  '10101111000','10100011110','10001011110','10111101000','10111100010',
  '11110101000','11110100010','10111011110','10111101110','11101011110',
  '11110101110','11010000100','11010010000','11010011100','1100011101011',
];

export function encodeCode128B(text) {
  let encoded = CODE128B[104]; // Start B
  let checksum = 104;
  for (let i = 0; i < text.length; i++) {
    const val = text.charCodeAt(i) - 32;
    if (val < 0 || val > 94) continue;
    encoded += CODE128B[val];
    checksum += val * (i + 1);
  }
  encoded += CODE128B[checksum % 103];
  encoded += CODE128B[106]; // Stop
  return encoded;
}

// JSX version for React components
export function generateBarcodeSVG(text, options = {}) {
  const cleanText = text.replace(/-/g, '');
  const bits = encodeCode128B(cleanText);
  const barWidth = options.barWidth || 2;
  const height = options.height || 50;
  const totalW = bits.length * barWidth;

  return (
    <svg viewBox={`0 0 ${totalW} ${height}`} style={{ width: options.width || '100%', height: `${height}px` }}>
      {bits.split('').map((bit, i) => (
        bit === '1' ? <rect key={i} x={i * barWidth} y={0} width={barWidth} height={height} fill="black" /> : null
      ))}
    </svg>
  );
}

// HTML string version for print windows (window.open + document.write)
export function generateBarcodeSVGString(text, options = {}) {
  const cleanText = text.replace(/-/g, '');
  const bits = encodeCode128B(cleanText);
  const barWidth = options.barWidth || 2;
  const height = options.height || 50;
  const totalW = bits.length * barWidth;
  const width = options.width || '100%';

  let rects = '';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${height}" fill="black"/>`;
    }
  }
  return `<svg viewBox="0 0 ${totalW} ${height}" style="width:${width};height:${height}px">${rects}</svg>`;
}

// ---- ZPL generation for Zebra thermal printers ----
// Template-driven: uses BarcodeEditor templates to control layout
// Paper: 100mm wide (2 labels across, 50mm × 25mm each)
// Zebra ZD230 at 203 DPI

const DPI = 203;
const mmToDots = (mm) => Math.round((mm / 25.4) * DPI);
const ptToDots = (pt) => Math.round(pt * 2.5); // approximate pt → ZPL font size

// Default template used when no saved template is selected
const DEFAULT_TEMPLATE = {
  canvasSize: { width: 50, height: 25 },
  elements: [
    { type: 'brand',    x: 12, y: 1,  width: 26, height: 4, fontSize: 8,  text: '' },
    { type: 'barcode',  x: 10, y: 4,  width: 30, height: 10 },
    { type: 'title',    x: 10, y: 16, width: 24, height: 5, fontSize: 8 },
    { type: 'price',    x: 10, y: 20, width: 12, height: 5, fontSize: 9 },
  ],
};

export function generateZPL(labels, template = null, paperConfig = {}) {
  const tmpl = template || DEFAULT_TEMPLATE;
  const {
    paperWidth = 800,
    colWidth = 400,
    labelHeight = mmToDots(tmpl.canvasSize?.height || 25),
  } = paperConfig;

  // Build ZPL for one label from template elements + actual data
  const buildLabel = (label, xOffset) => {
    const { brand = 'TAPAS READING CAFE', copyCode = '', title = '', price = '', mrpStrike = '' } = label;
    const lines = [];

    // Helper: get ZPL font command respecting fontWeight from template
    const fontCmd = (el, size) => {
      // ZPL ^A0 uses built-in font. For bold, increase font size slightly
      const bold = el.fontWeight === 'bold';
      const s = bold ? Math.round(size * 1.15) : size;
      return `^A0N,${s},${s}`;
    };

    for (const el of (tmpl.elements || [])) {
      const x = xOffset + mmToDots(el.x || 0);
      const y = mmToDots(el.y || 0);
      const w = mmToDots(el.width || 10);
      const h = mmToDots(el.height || 5);
      const fs = ptToDots(el.fontSize || 9);

      switch (el.type) {
        case 'brand': {
          const text = brand || el.text || 'TAPAS READING CAFE';
          lines.push(`^FO${x},${y}${fontCmd(el, fs)}^FD${text}^FS`);
          break;
        }
        case 'barcode': {
          if (copyCode) {
            // Calculate module width (^BY) to fill the element width
            // Code128: each char ~11 modules + start(11) + checksum(11) + stop(13) + quiet zones(~20)
            const totalModules = 11 + (copyCode.length * 11) + 11 + 13 + 20;
            const moduleWidth = Math.max(1, Math.min(10, Math.round(w / totalModules)));
            lines.push(`^FO${x},${y}^BY${moduleWidth}^BCN,${h},Y,N,N^FD${copyCode}^FS`);
          }
          break;
        }
        case 'title': {
          if (title) {
            const maxChars = Math.max(10, Math.floor(w / (fs * 0.6)));
            const truncated = title.length > maxChars ? title.slice(0, maxChars - 2) + '..' : title;
            lines.push(`^FO${x},${y}${fontCmd(el, fs)}^FD${truncated}^FS`);
          }
          break;
        }
        case 'copyCode': {
          if (copyCode) {
            lines.push(`^FO${x},${y}${fontCmd(el, fs)}^FD${copyCode}^FS`);
          }
          break;
        }
        case 'price': {
          const mode = el.priceDisplayMode || 'both';
          if (mode === 'mrp') {
            // MRP only
            const mrpText = mrpStrike || price;
            if (mrpText) lines.push(`^FO${x},${y}${fontCmd(el, fs)}^FD${mrpText}^FS`);
          } else if (mode === 'selling') {
            // Selling price only
            if (price) lines.push(`^FO${x},${y}${fontCmd(el, fs)}^FD${price}^FS`);
          } else {
            // Both: MRP (strikethrough) + Selling
            if (price && mrpStrike) {
              // MRP with strikethrough
              const mrpFs = Math.round(fs * 0.85);
              lines.push(`^FO${x},${y}^A0N,${mrpFs},${mrpFs}^FD${mrpStrike}^FS`);
              const mrpTextWidth = mrpStrike.length * Math.round(mrpFs * 0.6);
              const lineY = y + Math.round(mrpFs * 0.4);
              lines.push(`^FO${x},${lineY}^GB${mrpTextWidth},0,2^FS`);
              // Selling price after
              const sellingX = x + mrpTextWidth + 8;
              lines.push(`^FO${sellingX},${y}${fontCmd(el, fs)}^FD${price}^FS`);
            } else if (price) {
              lines.push(`^FO${x},${y}${fontCmd(el, fs)}^FD${price}^FS`);
            }
          }
          break;
        }
        case 'customText': {
          const text = el.text || '';
          if (text) {
            lines.push(`^FO${x},${y}${fontCmd(el, fs)}^FD${text}^FS`);
          }
          break;
        }
        case 'line': {
          const bw = el.borderWidth || 1;
          lines.push(`^FO${x},${y}^GB${w},0,${bw}^FS`);
          break;
        }
        case 'rectangle': {
          const bw = el.borderWidth || 1;
          lines.push(`^FO${x},${y}^GB${w},${h},${bw}^FS`);
          break;
        }
        default:
          break;
      }
    }
    return lines.join('\n');
  };

  const zplBlocks = [];

  // Pair labels 2-across
  for (let i = 0; i < labels.length; i += 2) {
    const page = [];
    page.push('^XA');
    page.push('^POI');
    page.push(`^PW${paperWidth}`);
    page.push(`^LL${labelHeight}`);

    page.push(buildLabel(labels[i], 0));

    if (i + 1 < labels.length) {
      page.push(buildLabel(labels[i + 1], colWidth));
    }

    page.push('^XZ');
    zplBlocks.push(page.join('\n'));
  }

  return zplBlocks.join('\n');
}
