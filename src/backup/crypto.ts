// ─── Crypto Utilities (WebCrypto API only, no external deps) ─────────────────

const KDF_ITERATIONS = 600_000;
const KDF_HASH = "SHA-256";
const SALT_BYTES = 16; // 128-bit salt
const IV_BYTES = 12; // 96-bit IV — standard for AES-GCM

/**
 * Converts a Uint8Array into a BufferSource backed by a plain ArrayBuffer.
 *
 * Newer TypeScript DOM typings infer Uint8Array<ArrayBufferLike>, while
 * Web Crypto expects a BufferSource backed by ArrayBuffer.
 */
function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

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
 *
 * Uses 600,000 iterations.
 * The key is non-extractable.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toBufferSource(salt),
      iterations: KDF_ITERATIONS,
      hash: KDF_HASH,
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

// ─── Encrypt ──────────────────────────────────────────────────────────────────

export async function encryptData(
  key: CryptoKey,
  iv: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toBufferSource(iv),
    },
    key,
    toBufferSource(plaintext),
  );

  return new Uint8Array(encrypted);
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

export async function decryptData(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toBufferSource(iv),
    },
    key,
    toBufferSource(ciphertext),
  );

  return new Uint8Array(decrypted);
}

// ─── SHA-256 checksum ─────────────────────────────────────────────────────────

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    toBufferSource(data),
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Export constants ─────────────────────────────────────────────────────────

export { KDF_ITERATIONS };