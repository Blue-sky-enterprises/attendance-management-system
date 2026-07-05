// ─── Crypto Utilities (WebCrypto API only, no external deps) ─────────────────

const KDF_ITERATIONS = 600_000;
const KDF_HASH = "SHA-256";
const SALT_BYTES = 16;  // 128-bit salt
const IV_BYTES = 12;    // 96-bit IV — standard for AES-GCM

// ─── Random generation ────────────────────────────────────────────────────────

/** Generate a cryptographically secure random salt (16 bytes) */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

/** Generate a cryptographically secure random IV (12 bytes) */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_BYTES));
}

// ─── Key derivation ───────────────────────────────────────────────────────────

/**
 * Derives a 256-bit AES-GCM key from a password and salt using PBKDF2-SHA-256.
 * Uses 600 000 iterations (NIST-recommended minimum for 2026).
 *
 * The key is non-extractable to prevent accidental exposure.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const enc = new TextEncoder();

  // Import the raw password as a PBKDF2 base key
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  // Derive the AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: KDF_ITERATIONS,
      hash: KDF_HASH,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"],
  );
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypts `plaintext` with AES-256-GCM.
 * Returns the ciphertext including the 16-byte authentication tag appended
 * by the WebCrypto implementation.
 *
 * @throws if encryption fails for any reason
 */
export async function encryptData(
  key: CryptoKey,
  iv: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  return new Uint8Array(cipherBuffer);
}

/**
 * Decrypts `ciphertext` (with embedded auth tag) using AES-256-GCM.
 *
 * @throws DOMException with name "OperationError" on wrong password / tampered data
 */
export async function decryptData(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new Uint8Array(plainBuffer);
}

// ─── Checksum ─────────────────────────────────────────────────────────────────

/**
 * Computes a SHA-256 hex checksum of the given bytes.
 * Used as a diagnostic integrity check after decryption (not a security control —
 * AES-GCM already provides authenticated encryption).
 */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Exported constants ───────────────────────────────────────────────────────
export { KDF_ITERATIONS };
