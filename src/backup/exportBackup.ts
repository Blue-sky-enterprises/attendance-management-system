// ─── Export Backup ─────────────────────────────────────────────────────────────
//
// Pipeline:
//   readLocalStorage → JSON.stringify → gzip → PBKDF2 derive key →
//   AES-256-GCM encrypt → Base64 → JSON envelope → download .json

import { APP_ID, BACKUP_VERSION } from "./backupTypes";
import { generateSalt, generateIV, deriveKey, encryptData, sha256Hex, KDF_ITERATIONS } from "./crypto";
import { compressData } from "./compression";
import { toBase64, downloadJson, generateBackupFilename } from "./utils";
import { readAllSections, computeSummary } from "./storage";

/**
 * Exports a complete encrypted backup of all application data.
 *
 * Steps:
 * 1. Read all LocalStorage sections
 * 2. Serialise to JSON
 * 3. Gzip compress
 * 4. Compute SHA-256 checksum of compressed bytes (diagnostic)
 * 5. Derive AES-256-GCM key via PBKDF2
 * 6. Encrypt (AES-256-GCM, auth tag included)
 * 7. Build envelope JSON with metadata
 * 8. Trigger browser download
 *
 * @param password - user-provided passphrase (never stored)
 * @returns filename of the downloaded file
 * @throws on any crypto, compression, or download failure
 */
export async function exportBackup(password: string): Promise<string> {
  // ── 1. Read ──────────────────────────────────────────────────────────────
  const payload = readAllSections();
  const summary = computeSummary(payload.sections);

  // ── 2. Serialise ─────────────────────────────────────────────────────────
  const payloadJson = JSON.stringify(payload);
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payloadJson);

  // ── 3. Compress ───────────────────────────────────────────────────────────
  const compressed = await compressData(payloadBytes);

  // ── 4. Checksum (of compressed plaintext) ────────────────────────────────
  const checksum = await sha256Hex(compressed);

  // ── 5. Key derivation ─────────────────────────────────────────────────────
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(password, salt);

  // ── 6. Encrypt ────────────────────────────────────────────────────────────
  const ciphertext = await encryptData(key, iv, compressed);

  // ── 7. Build envelope ─────────────────────────────────────────────────────
  const envelope = {
    app: APP_ID,
    backupVersion: BACKUP_VERSION,
    appVersion: payload.appVersion,
    createdAt: payload.createdAt,
    algorithm: "AES-256-GCM" as const,
    kdf: "PBKDF2-SHA-256" as const,
    kdfIterations: KDF_ITERATIONS,
    compression: "gzip" as const,
    salt: toBase64(salt),
    iv: toBase64(iv),
    summary,
    checksum,
    data: toBase64(ciphertext),
  };

  // ── 8. Download ───────────────────────────────────────────────────────────
  const filename = generateBackupFilename();
  downloadJson(JSON.stringify(envelope, null, 2), filename);

  return filename;
}
