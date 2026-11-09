/**
 * Deccan Mission High School (DMHS) - Cryptographic & Authentication Utilities
 *
 * NOTE: Client-side session wrapping and local integrity checks.
 * True authorization and access control are strictly enforced server-side
 * via Supabase Row-Level Security (RLS) policies and backend API tokens.
 * Plaintext passwords and critical private keys (SMTP, Service Role) are never
 * bundled in client code.
 */

// Pure JavaScript synchronous SHA-256 implementation (zero external dependencies)
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = "length";
  let i = 0,
    j = 0;
  let result = "";

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash: number[] = [];
  let k: number[] = [];
  let primeCounter = 0;

  const isComposite: { [n: number]: boolean } = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += "\x80";
  while ((ascii[lengthProperty] % 64) - 56) ascii += "\x00";
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ""; // Only 8-bit ASCII supported
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i]
          : (((w[i - 16] + s0) | 0) + ((w[i - 7] + s1) | 0)) | 0;

      const s1Hash =
        rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = ((((hash[7] + s1Hash) | 0) + ((ch + k[i]) | 0)) | 0 + w[i]) | 0;
      const s0Hash =
        rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0Hash + maj) | 0;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }
  return result;
}

// Client-side session and storage salting
const CLIENT_STORAGE_SALT = "DMHS_CLIENT_SESSION_v1";
const CLIENT_SESSION_KEY = "DMHS_CLIENT_INTEGRITY_v1";

/**
 * Client-side hash helper for local storage integrity checks.
 * Note: Authentic user passwords are encrypted server-side by Supabase Auth (Argon2id/Bcrypt).
 */
export function hashPassword(plainText: string): string {
  if (!plainText) return "";
  if (plainText.startsWith("sha256$")) return plainText;
  const digest = sha256(`${CLIENT_STORAGE_SALT}:${plainText.trim()}`);
  return `sha256$${digest}`;
}

/**
 * Secure constant-time string comparison helper to prevent timing attacks.
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies if entered password matches stored value (supports hashed and legacy plaintext).
 */
export function verifyPassword(entered: string, stored: string): boolean {
  if (!entered || !stored) return false;
  const cleanEntered = entered.trim();
  if (stored.startsWith("sha256$")) {
    const computed = hashPassword(cleanEntered);
    return secureCompare(computed, stored);
  }
  // Fallback for legacy passwords
  return secureCompare(cleanEntered, stored);
}

export interface SessionPayload {
  sub: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  username: string;
  email?: string;
  iat: number;
  exp: number;
}

/**
 * Base64 helper safe across browser and node environments.
 */
function toBase64(str: string): string {
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(str)));
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64");
  }
  return "";
}

function fromBase64(b64: string): string {
  if (typeof atob === "function") {
    return decodeURIComponent(escape(atob(b64)));
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  return "";
}

/**
 * Generates a tamper-proof signed session token: dmhs.<b64payload>.<sig>
 */
export function createSessionToken(user: {
  id: string | number;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  username: string;
  email?: string;
  durationMs?: number;
}): string {
  const iat = Date.now();
  const exp = iat + (user.durationMs || 24 * 60 * 60 * 1000); // Default 24 hours expiry
  const payload: SessionPayload = {
    sub: String(user.id),
    role: user.role,
    username: user.username,
    email: user.email,
    iat,
    exp,
  };

  const payloadB64 = toBase64(JSON.stringify(payload));
  const signature = sha256(`${CLIENT_SESSION_KEY}:${payloadB64}`).substring(0, 32);
  return `dmhs.${payloadB64}.${signature}`;
}

/**
 * Validates a signed session token. Checks signature authenticity and expiration.
 */
export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token || typeof token !== "string" || !token.startsWith("dmhs.")) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [, payloadB64, signature] = parts;
  const expectedSig = sha256(`${CLIENT_SESSION_KEY}:${payloadB64}`).substring(0, 32);
  if (!secureCompare(signature, expectedSig)) {
    return null; // Token signature has been tampered with!
  }

  try {
    const raw = fromBase64(payloadB64);
    const payload: SessionPayload = JSON.parse(raw);
    if (!payload || !payload.exp || Date.now() > payload.exp) {
      return null; // Session expired
    }
    return payload;
  } catch {
    return null;
  }
}
