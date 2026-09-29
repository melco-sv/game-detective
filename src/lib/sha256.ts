/**
 * SHA-256 lewat WebCrypto, tersedia di browser (Worker termasuk) maupun di
 * Node ≥ 19 lewat `globalThis.crypto.subtle`. Dipakai untuk fingerprint hasil
 * query (engine/validation/fingerprint.ts) dan hash nama tersangka
 * (engine/validation/suspect.ts). Lihat docs/02-arsitektur.md §6.2, §6.5.
 */

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

/**
 * SHA-256 byte mentah (BUKAN teks). Dipakai untuk memverifikasi `case.db`
 * yang diunduh Worker (§5.3): `sha256Hex` akan salah karena mengasumsikan
 * input berupa teks UTF-8, sedangkan byte database bukan teks.
 */
export async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return toHex(digest);
}

/** Uint8Array → 'x' + hex, dipakai untuk menormalkan nilai BLOB (§6.2). */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}
