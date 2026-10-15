// Barcode decoding in plain JavaScript, for browsers whose built-in
// BarcodeDetector can't read book barcodes. Safari on iPhone / iPad (and so
// every iOS browser, Chrome included) only reads QR codes natively, which made
// ISBN scanning impossible there.
//
// Takes the @zxing/library module (loaded on demand by the scanner, so the
// ~400 KB library only downloads on devices that need it) and returns a
// function that decodes one frame of ImageData, or null if nothing was found.

const MAX_WIDTH = 960; // larger frames cost time without reading barcodes better

export function makeZxingDecoder(Z) {
  const reader = new Z.MultiFormatReader();
  const hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
    Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8,
    Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E,
    Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_39,
    Z.BarcodeFormat.QR_CODE,
  ]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);

  const decodeGray = (gray, width, height) => {
    try {
      const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.RGBLuminanceSource(gray, width, height)));
      return reader.decodeWithState(bitmap).getText();
    } catch {
      return null; // NotFound / checksum / format errors all mean "not this frame"
    } finally {
      reader.reset();
    }
  };

  /** @param img {{ data: Uint8ClampedArray, width: number, height: number }} RGBA */
  return function decode(img) {
    const { data, width, height } = img;
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      // Green-weighted luminance, as ZXing computes it.
      gray[i] = (data[p] + 2 * data[p + 1] + data[p + 2]) >> 2;
    }
    const found = decodeGray(gray, width, height);
    if (found) return found;

    // A book held sideways puts the bars horizontal — try the frame rotated.
    const rot = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) rot[x * height + (height - 1 - y)] = gray[y * width + x];
    }
    return decodeGray(rot, height, width);
  };
}

/** Scale a video frame down onto a canvas no wider than MAX_WIDTH. */
export function frameToImageData(video, canvas) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = vw > MAX_WIDTH ? MAX_WIDTH / vw : 1;
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
