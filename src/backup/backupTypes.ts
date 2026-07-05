// ─── Backup Types ─────────────────────────────────────────────────────────────

import type { BorrowingRecord, Client, DailyAttendance, Employee } from "@/types";

/** Application identifier — used to reject foreign backup files */
export const APP_ID = "blue-sky-attendance";

/** Current backup schema version */
export const BACKUP_VERSION = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Envelope — the JSON written to disk
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The on-disk JSON structure.
 * Sensitive payload is AES-256-GCM encrypted → Base64 inside `data`.
 */
export interface BackupEnvelope {
  /** Application identifier for validation */
  app: typeof APP_ID;
  /** Schema version of the backup format */
  backupVersion: number;
  /** Application version at time of export (from package.json) */
  appVersion: string;
  /** ISO-8601 timestamp of export */
  createdAt: string;
  /** Encryption algorithm */
  algorithm: "AES-256-GCM";
  /** Key derivation function */
  kdf: "PBKDF2-SHA-256";
  /** PBKDF2 iteration count */
  kdfIterations: number;
  /** Compression algorithm */
  compression: "gzip";
  /** Base64-encoded random 16-byte salt */
  salt: string;
  /** Base64-encoded random 12-byte IV */
  iv: string;
  /**
   * Quick summary stored in plaintext — useful for pre-decrypt overview.
   * Record counts so the UI can show "Contains 24 employees, 17 clients…"
   * without decrypting first.
   */
  summary: BackupSummary;
  /** Base64-encoded ciphertext (includes 16-byte GCM auth tag) */
  data: string;
  /** SHA-256 hex checksum of the decompressed plaintext payload (post-decrypt diagnostic) */
  checksum: string;
}

/** Plaintext record counts stored in the envelope for quick preview */
export interface BackupSummary {
  attendance: number;
  employees: number;
  clients: number;
  borrowings: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload — decrypted, decompressed inner data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The decrypted payload stored inside `data`.
 * Uses a `sections` wrapper for forward-compatibility.
 */
export interface BackupPayload {
  app: typeof APP_ID;
  backupVersion: number;
  appVersion: string;
  createdAt: string;
  sections: BackupSections;
}

/** All restorable application sections */
export interface BackupSections {
  attendance: DailyAttendance[];
  clients: Client[];
  employees: Employee[];
  borrowings: BorrowingRecord[];
  /** Theme preference string, e.g. "dark" | "light" */
  theme: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview & Restore
// ─────────────────────────────────────────────────────────────────────────────

/** Section keys that can be individually approved for restore */
export type SectionKey = keyof BackupSections;

/** User approval state — true means "restore this section" */
export type RestoreApproval = Record<SectionKey, boolean>;

/** All available section keys in order */
export const ALL_SECTION_KEYS: SectionKey[] = [
  "attendance",
  "clients",
  "employees",
  "borrowings",
  "theme",
];

/** LocalStorage key mapping for each section */
export const SECTION_LS_KEY: Record<SectionKey, string> = {
  attendance: "att_records",
  clients: "att_clients",
  employees: "att_employees",
  borrowings: "att_borrowings",
  theme: "theme",
};

/** Display label for each section */
export const SECTION_LABEL: Record<SectionKey, string> = {
  attendance: "Attendance",
  clients: "Clients",
  employees: "Employees",
  borrowings: "Fines & Borrowings",
  theme: "Theme Settings",
};

/** Analytics derived from imported data — not stored in backup */
export interface DerivedAnalytics {
  totalDuties: number;
  totalAbsentees: number;
  topEmployee: { name: string; count: number } | null;
  dateRange: { first: string; last: string } | null;
}

/** Everything the preview screen needs */
export interface ImportPreviewData {
  envelope: BackupEnvelope;
  payload: BackupPayload;
  analytics: DerivedAnalytics;
  /** Encrypted file size in bytes */
  encryptedSizeBytes: number;
  /** Decompressed payload size in bytes */
  uncompressedSizeBytes: number;
}
