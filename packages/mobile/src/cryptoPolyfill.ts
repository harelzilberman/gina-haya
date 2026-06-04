// Pure JS crypto polyfill - no native modules required
// Fixes "WebCrypto API is not supported" in Hermes/React Native

const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i+1] ?? 0, b2 = bytes[i+2] ?? 0;
    str += b64chars[b0 >> 2];
    str += b64chars[((b0 & 3) << 4) | (b1 >> 4)];
    str += i+1 < bytes.length ? b64chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    str += i+2 < bytes.length ? b64chars[b2 & 63] : '=';
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Simple SHA-256 in pure JS (from https://geraintluff.github.io/sha256/)
function sha256(ascii: string): Uint8Array {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [] as number[];
  const k: number[] = [];
  let primeCounter = k[lengthProperty];
  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = true;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return new Uint8Array(32);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength);
  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const i2 = i + j - 16;
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ (~e & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
          w[i - 16]
          + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
          + w[i - 7]
          + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
        ) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.length = 8;
    }
    hash = hash.map((x, i) => (x + oldHash[i]) | 0);
  }
  const resultBytes = new Uint8Array(32);
  for (i = 0; i < 8; i++) {
    for (j = 0; j < 4; j++) {
      resultBytes[i * 4 + j] = (hash[i] >> (24 - j * 8)) & 0xff;
    }
  }
  return resultBytes;
}

if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {};
}

if (typeof global.crypto.getRandomValues === 'undefined') {
  (global as any).crypto.getRandomValues = (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

if (typeof global.crypto.subtle === 'undefined') {
  (global as any).crypto.subtle = {
    digest: async (_algorithm: string, data: ArrayBuffer) => {
      const bytes = new Uint8Array(data);
      let str = '';
      for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
      }
      return sha256(str).buffer;
    },
  };
}
