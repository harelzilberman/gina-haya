import * as ExpoCrypto from 'expo-crypto';

// Polyfill getRandomValues for Hermes (React Native)
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {};
}

if (typeof global.crypto.getRandomValues === 'undefined') {
  (global as any).crypto.getRandomValues = (array: Uint8Array) => {
    const bytes = ExpoCrypto.getRandomBytes(array.length);
    array.set(bytes);
    return array;
  };
}

// Polyfill subtle for PKCE sha256
if (typeof global.crypto.subtle === 'undefined') {
  (global as any).crypto.subtle = {
    digest: async (algorithm: string, data: ArrayBuffer) => {
      const hashAlgorithm = algorithm === 'SHA-256'
        ? ExpoCrypto.CryptoDigestAlgorithm.SHA256
        : ExpoCrypto.CryptoDigestAlgorithm.SHA256;

      const uint8 = new Uint8Array(data);
      const hex = await ExpoCrypto.digestStringAsync(
        hashAlgorithm,
        String.fromCharCode(...uint8),
        { encoding: ExpoCrypto.CryptoEncoding.HEX }
      );

      // Convert hex to ArrayBuffer
      const result = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
      return result.buffer;
    },
  };
}
