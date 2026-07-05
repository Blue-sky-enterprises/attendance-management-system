// ─── Import Backup ─────────────────────────────────────────────────────────────
//
// Pipeline:
//   upload .json → parse envelope → validate app/version →
//   PBKDF2 derive key → AES-256-GCM decrypt → gunzip →
//   verify checksum → parse payload → return for preview
//
// ⚠️  This module NEVER writes to LocalStorage.
//     Writing only happens after explicit user approval in the UI.

import type { BackupEnvelope, BackupPayload, DerivedAnalytics, ImportPreviewData } from "./backupTypes";
import { APP_ID, BACKUP_VERSION } from "./backupTypes";
import { deriveKey, decryptData, sha256Hex } from "./crypto";
import { decompressData } from "./compression";
import { fromBase64, formatBytes } from "./utils";

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates the envelope structure and metadata.
 * Throws a descriptive error for each validation failure.
 */
function validateEnvelope(env: unknown): asserts env is BackupEnvelope {
  if (typeof env !== "object" || env === null) {
    throw new Error("Invalid backup file: not a JSON object.");
  }
  const e = env as Record<string, unknown>;

  if (e.app !== APP_ID) {
    throw new Error(
      `Invalid backup file: expected app "${APP_ID}", got "${e.app}".`,
    );
  }
  if (typeof e.backupVersion !== "number") {
    throw new Error("Invalid backup file: missing backupVersion.");
  }
  if (e.backupVersion > BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version ${e.backupVersion}. ` +
        `Please update the app to restore this backup.`,
    );
  }
  if (e.algorithm !== "AES-256-GCM") {
    throw new Error(`Unsupported encryption algorithm: "${e.algorithm}".`);
  }
  if (e.compression !== "gzip") {
    throw new Error(`Unsupported compression: "${e.compression}".`);
  }
  if (typeof e.salt !== "string" || !e.salt) {
    throw new Error("Invalid backup file: missing or empty salt.");
  }
  if (typeof e.iv !== "string" || !e.iv) {
    throw new Error("Invalid backup file: missing or empty IV.");
  }
  if (typeof e.data !== "string" || !e.data) {
    throw new Error("Invalid backup file: missing encrypted data.");
  }
}

/**
 * Validates that the decrypted payload has the expected shape.
 */
function validatePayload(payload: unknown): asserts payload is BackupPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Corrupted backup: decrypted data is not a valid object.");
  }
  const p = payload as Record<string, unknown>;

  if (p.app !== APP_ID) {
    throw new Error("Corrupted backup: app identifier mismatch in payload.");
  }
  if (typeof p.sections !== "object" || p.sections === null) {
    throw new Error("Corrupted backup: missing sections object.");
  }
  const s = p.sections as Record<string, unknown>;
  if (!Array.isArray(s.attendance)) {
    throw new Error("Corrupted backup: attendance section is not an array.");
  }
  if (!Array.isArray(s.clients)) {
    throw new Error("Corrupted backup: clients section is not an array.");
  }
  if (!Array.isArray(s.employees)) {
    throw new Error("Corrupted backup: employees section is not an array.");
  }
  if (!Array.isArray(s.borrowings)) {
    throw new Error("Corrupted backup: borrowings section is not an array.");
  }
}

// ─── Analytics derivation ─────────────────────────────────────────────────────

/**
 * Derives analytics from the imported payload.
 * Analytics are computed, not stored, so we derive them here for the preview.
 */
function deriveAnalytics(payload: BackupPayload): DerivedAnalytics {
  const { attendance, employees } = payload.sections;

  const dutyMap: Record<string, number> = {};
  let totalDuties = 0;
  let totalAbsentees = 0;

  for (const rec of attendance) {
    totalAbsentees += rec.absentees?.length ?? 0;
    for (const cl of rec.clients ?? []) {
      for (const emp of cl.employees ?? []) {
        dutyMap[emp.employeeId] = (dutyMap[emp.employeeId] ?? 0) + emp.dutyCount;
        totalDuties += emp.dutyCount;
      }
    }
  }

  // Find top employee by duty count
  let topEmployee: { name: string; count: number } | null = null;
  for (const [id, count] of Object.entries(dutyMap)) {
    if (!topEmployee || count > topEmployee.count) {
      const emp = employees.find((e) => e.id === id);
      topEmployee = { name: emp?.name ?? "Unknown", count };
    }
  }

  // Date range of attendance records
  const dates = attendance.map((r) => r.date).sort();
  const dateRange =
    dates.length > 0 ? { first: dates[0], last: dates[dates.length - 1] } : null;

  return { totalDuties, totalAbsentees, topEmployee, dateRange };
}

// ─── Main import function ─────────────────────────────────────────────────────

/**
 * Reads an uploaded backup file, decrypts and decompresses it, then
 * returns all data needed for the preview screen.
 *
 * ⚠️  Does NOT write anything to LocalStorage.
 *
 * @param file     - the uploaded .json backup file
 * @param password - the user-provided passphrase
 * @returns preview data including the decrypted payload and derived analytics
 * @throws descriptive errors for every failure case
 */
export async function importBackup(
  file: File,
  password: string,
): Promise<ImportPreviewData> {
  // ── 1. Read and parse the file ────────────────────────────────────────────
  let envelope: BackupEnvelope;
  const rawText = await file.text();
  const encryptedSizeBytes = new Blob([rawText]).size;

  try {
    const parsed: unknown = JSON.parse(rawText);
    validateEnvelope(parsed);
    envelope = parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("Invalid backup file: could not parse JSON.");
    }
    throw err;
  }

  // ── 2. Decode Base64 fields ───────────────────────────────────────────────
  let salt: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array;
  try {
    salt = fromBase64(envelope.salt);
    iv = fromBase64(envelope.iv);
    ciphertext = fromBase64(envelope.data);
  } catch {
    throw new Error("Corrupted backup: could not decode Base64 fields.");
  }

  // ── 3. Derive key ─────────────────────────────────────────────────────────
  const key = await deriveKey(password, salt);

  // ── 4. Decrypt (wrong password → DOMException "OperationError") ──────────
  let compressed: Uint8Array;
  try {
    compressed = await decryptData(key, iv, ciphertext);
  } catch {
    throw new Error(
      "Decryption failed. Please check your password and try again.",
    );
  }

  // ── 5. Verify checksum (diagnostic — not a security check) ───────────────
  if (envelope.checksum) {
    const actualChecksum = await sha256Hex(compressed);
    if (actualChecksum !== envelope.checksum) {
      throw new Error(
        "Integrity check failed: backup data appears to be corrupted.",
      );
    }
  }

  // ── 6. Decompress ─────────────────────────────────────────────────────────
  let decompressed: Uint8Array;
  try {
    decompressed = await decompressData(compressed);
  } catch {
    throw new Error(
      "Decompression failed. The backup file may be corrupted.",
    );
  }

  const uncompressedSizeBytes = decompressed.byteLength;

  // ── 7. Parse payload ──────────────────────────────────────────────────────
  let payload: BackupPayload;
  try {
    const dec = new TextDecoder();
    const parsed: unknown = JSON.parse(dec.decode(decompressed));
    validatePayload(parsed);
    payload = parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("Corrupted backup: decrypted data is not valid JSON.");
    }
    throw err;
  }

  // ── 8. Derive analytics for preview ──────────────────────────────────────
  const analytics = deriveAnalytics(payload);

  return {
    envelope,
    payload,
    analytics,
    encryptedSizeBytes,
    uncompressedSizeBytes,
  };
}

export { formatBytes };
