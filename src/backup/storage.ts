// ─── LocalStorage I/O ─────────────────────────────────────────────────────────

import type { BackupPayload, BackupSections, RestoreApproval, SectionKey } from "./backupTypes";
import { SECTION_LS_KEY, APP_ID, BACKUP_VERSION } from "./backupTypes";

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Reads all application-related LocalStorage keys and returns them as a
 * typed payload ready for encryption.
 *
 * Safe: falls back to empty arrays / defaults when keys are missing.
 */
export function readAllSections(): BackupPayload {
  const read = <T>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return {
    app: APP_ID,
    backupVersion: BACKUP_VERSION,
    appVersion: __APP_VERSION__,
    createdAt: new Date().toISOString(),
    sections: {
      attendance: read(SECTION_LS_KEY.attendance, []),
      clients: read(SECTION_LS_KEY.clients, []),
      employees: read(SECTION_LS_KEY.employees, []),
      borrowings: read(SECTION_LS_KEY.borrowings, []),
      theme: read(SECTION_LS_KEY.theme, "dark"),
    },
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Writes only the user-approved sections to LocalStorage.
 * Uses full REPLACE semantics per section — no merging to avoid duplicate IDs.
 *
 * @param approval - which sections the user approved
 * @param payload  - the decrypted backup payload
 * @returns list of section keys that were actually written
 */
export function writeSections(
  approval: RestoreApproval,
  payload: BackupPayload,
): SectionKey[] {
  const written: SectionKey[] = [];
  const sections = payload.sections;

  (Object.keys(approval) as SectionKey[]).forEach((key) => {
    if (!approval[key]) return;

    const lsKey = SECTION_LS_KEY[key];
    const value = sections[key];

    try {
      localStorage.setItem(lsKey, JSON.stringify(value));
      written.push(key);
    } catch (err) {
      console.error(`Failed to write section "${key}" to LocalStorage:`, err);
      throw new Error(
        `Failed to restore "${key}": storage may be full or unavailable.`,
      );
    }
  });

  return written;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

/**
 * Computes plaintext record counts from a payload.
 * Stored in the envelope so the importer can show a quick overview
 * before decryption.
 */
export function computeSummary(sections: BackupSections) {
  return {
    attendance: sections.attendance.length,
    employees: sections.employees.length,
    clients: sections.clients.length,
    borrowings: sections.borrowings.length,
  };
}

// ─── Type declaration for Vite define ────────────────────────────────────────
declare const __APP_VERSION__: string;
