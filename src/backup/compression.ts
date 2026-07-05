// ─── Compression Utilities (fflate) ──────────────────────────────────────────
//
// fflate is a zero-dependency, tree-shakeable gzip library (~8 kB).
// We use the async Promise-based wrappers for non-blocking operation.

import { gzip, gunzip } from "fflate";

// ─── Compress ─────────────────────────────────────────────────────────────────

/**
 * Gzip-compresses a Uint8Array.
 * Run before encryption to reduce payload size and prevent data pattern leakage.
 *
 * @param input - raw bytes to compress
 * @returns compressed bytes
 */
export function compressData(input: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    gzip(input, { level: 6 }, (err, result) => {
      if (err) reject(new Error(`Compression failed: ${err.message}`));
      else resolve(result);
    });
  });
}

// ─── Decompress ───────────────────────────────────────────────────────────────

/**
 * Gunzip-decompresses a Uint8Array.
 * Run after decryption to restore the original JSON payload.
 *
 * @param input - compressed bytes
 * @returns decompressed bytes
 * @throws if decompression fails (corrupted data)
 */
export function decompressData(input: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    gunzip(input, (err, result) => {
      if (err) reject(new Error(`Decompression failed: ${err.message}`));
      else resolve(result);
    });
  });
}
