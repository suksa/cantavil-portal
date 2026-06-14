// Tiny perceptual hash (8x8 average hash) for warning when the two required
// photos look almost identical — all computed locally in the browser, no upload.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 64-bit average hash as a 16-char hex string. Returns null on failure. */
export async function aHash(dataUrl: string): Promise<string | null> {
  try {
    const img = await loadImage(dataUrl);
    const N = 8;
    const c = document.createElement('canvas');
    c.width = N;
    c.height = N;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, N, N);
    const { data } = ctx.getImageData(0, 0, N, N);
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
    let bits = '';
    for (const g of gray) bits += g >= avg ? '1' : '0';
    let hex = '';
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  } catch {
    return null;
  }
}

/** Similarity in [0,1] from two aHash hex strings (1 = identical). */
export function hashSimilarity(a: string | null, b: string | null): number {
  if (!a || !b || a.length !== b.length) return 0;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      diff += x & 1;
      x >>= 1;
    }
  }
  return 1 - diff / 64;
}

/** True when two photos are near-duplicates (default threshold 0.9). */
export async function looksSimilar(a: string, b: string, threshold = 0.9): Promise<boolean> {
  const [ha, hb] = await Promise.all([aHash(a), aHash(b)]);
  return hashSimilarity(ha, hb) >= threshold;
}
