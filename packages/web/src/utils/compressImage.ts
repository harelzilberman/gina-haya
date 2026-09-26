/**
 * Client-side image compression before upload.
 *
 * - Reads EXIF orientation so phone photos aren't sideways.
 * - Resizes so the longest side ≤ 1600 px (preserves aspect ratio).
 * - Encodes as JPEG at quality 0.82.
 * - No external dependencies — uses only Canvas and FileReader.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY  = 0.82;

/** Read EXIF orientation tag (1–8) from a JPEG ArrayBuffer. Returns 1 if absent. */
function readExifOrientation(view: DataView): number {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;
    if (marker === 0xffe1) {
      const len = view.getUint16(offset);
      if (len >= 8 && view.getUint32(offset + 2) === 0x45786966 /* 'Exif' */) {
        const tiff = offset + 8;
        const le   = view.getUint16(tiff) === 0x4949;
        const get16 = (o: number) => view.getUint16(o, le);
        const get32 = (o: number) => view.getUint32(o, le);
        const ifd    = tiff + get32(tiff + 4);
        const entries = get16(ifd);
        for (let i = 0; i < entries; i++) {
          if (get16(ifd + 2 + 12 * i) === 0x0112 /* Orientation */) {
            return get16(ifd + 2 + 12 * i + 8);
          }
        }
      }
      offset += len;
    } else if ((marker & 0xff00) !== 0xff00) {
      break;
    } else if (offset + 2 <= view.byteLength) {
      offset += view.getUint16(offset);
    } else {
      break;
    }
  }
  return 1;
}

/**
 * Apply EXIF transform to canvas context before drawing.
 * Orientations 5–8 swap width/height — the caller must set canvas dimensions
 * accordingly (pass the *canvas* w/h, not the draw w/h).
 */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  cw: number,
  ch: number,
): void {
  switch (orientation) {
    case 2: ctx.transform(-1,  0,  0,  1, cw,  0); break;
    case 3: ctx.transform(-1,  0,  0, -1, cw, ch); break;
    case 4: ctx.transform( 1,  0,  0, -1,  0, ch); break;
    case 5: ctx.transform( 0,  1,  1,  0,  0,  0); break;
    case 6: ctx.transform( 0,  1, -1,  0, ch,  0); break;
    case 7: ctx.transform( 0, -1, -1,  0, ch, cw); break;
    case 8: ctx.transform( 0, -1,  1,  0,  0, cw); break;
    default: break; // 1 = identity
  }
}

/**
 * Compress a File client-side.
 * Returns `{ dataUrl, base64, mimeType: 'image/jpeg' }`.
 * Always produces a JPEG regardless of original format.
 */
export function compressImage(
  file: File,
): Promise<{ dataUrl: string; base64: string; mimeType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (ev) => {
      const ab          = ev.target?.result as ArrayBuffer;
      const orientation = readExifOrientation(new DataView(ab));
      const rotated     = orientation >= 5; // orientations 5–8 swap w/h

      const blob = new Blob([ab], { type: file.type });
      const url  = URL.createObjectURL(blob);
      const img  = new Image();

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to decode image'));
      };

      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const srcW  = img.naturalWidth;
          const srcH  = img.naturalHeight;
          const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
          const drawW = Math.round(srcW * scale);
          const drawH = Math.round(srcH * scale);

          // Canvas dimensions account for EXIF rotation
          const canvasW = rotated ? drawH : drawW;
          const canvasH = rotated ? drawW : drawH;

          const canvas   = document.createElement('canvas');
          canvas.width   = canvasW;
          canvas.height  = canvasH;
          const ctx      = canvas.getContext('2d')!;
          applyOrientation(ctx, orientation, canvasW, canvasH);
          ctx.drawImage(img, 0, 0, drawW, drawH);

          const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve({ dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
        } catch (err) {
          reject(err);
        }
      };

      img.src = url;
    };
    reader.readAsArrayBuffer(file);
  });
}
