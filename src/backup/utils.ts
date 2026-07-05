// ─── Encoding / Download Utilities ───────────────────────────────────────────

// ─── Base64 helpers ───────────────────────────────────────────────────────────

/**
 * Encodes a Uint8Array to a URL-safe Base64 string.
 * Uses the browser's built-in btoa after converting via String.fromCharCode.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string back to a Uint8Array.
 */
export function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── File download ────────────────────────────────────────────────────────────

/**
 * Triggers a browser download of a JSON string as a `.json` file.
 * Creates and immediately revokes an object URL to avoid memory leaks.
 *
 * @param content - JSON string to download
 * @param filename - desired filename (e.g. "attendance-backup-2026-07-05.json")
 */
export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick to ensure the download has started
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ─── Filename generation ──────────────────────────────────────────────────────

/**
 * Generates a dated backup filename.
 * Example: "attendance-backup-2026-07-05.json"
 */
export function generateBackupFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `attendance-backup-${y}-${m}-${d}.json`;
}

// ─── Byte formatting ──────────────────────────────────────────────────────────

/**
 * Formats bytes into a human-readable string (KB / MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Formats an ISO-8601 date string to a human-readable local date.
 * Example: "2026-07-05T10:30:00Z" → "July 5, 2026, 3:59 PM"
 */
export function formatISODate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
