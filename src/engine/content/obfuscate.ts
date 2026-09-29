/**
 * Penyamaran ringan untuk isi Petunjuk 4 (query jawaban) di manifest publik
 * (docs/02-arsitektur.md §6.5: "disamarkan dengan XOR + base64 memakai salt
 * chapter"). BUKAN kriptografi sungguhan — hanya mencegah intip kasual lewat
 * pencarian teks polos di file manifest yang di-fetch browser. Siapa pun
 * yang membuka devtools dan tahu saltnya (ikut di manifest) bisa
 * membalikkannya; itu keterbatasan yang diakui secara jujur di §6.5.
 *
 * Portabel Node <-> browser: tanpa `Buffer`, hanya TextEncoder/Decoder dan
 * btoa/atob (keduanya tersedia global di Node >= 16 dan semua browser).
 */

function toBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function fromBytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function xorBytes(bytes: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = (bytes[i] as number) ^ (keyBytes[i % keyBytes.length] as number);
  }
  return out;
}

export function obfuscateText(text: string, salt: string): string {
  return bytesToBase64(xorBytes(toBytes(text), toBytes(salt)));
}

export function deobfuscateText(encoded: string, salt: string): string {
  return fromBytes(xorBytes(base64ToBytes(encoded), toBytes(salt)));
}
