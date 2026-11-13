import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ENC_PREFIX = 'enc:v1:';
const MASK_PREFIX = '••••';
const DEV_FALLBACK_SEED = 'nextcms-dev-external-api-secret-do-not-use-in-prod';

const SECRET_PLACEHOLDER_RE = /\{\{secret\.([A-Za-z0-9_.-]+)\}\}/g;
const ENV_PLACEHOLDER_RE = /\{\{env\.([A-Za-z0-9_]+)\}\}/g;

let warnedDevFallback = false;

function resolveSecretMaterial(override?: string): string {
  const raw =
    override ??
    process.env.EXTERNAL_API_SECRET_KEY ??
    process.env.PLUGIN_SECRET_KEY ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;
  if (raw && raw.trim()) {
    return raw.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'External API secret encryption requires EXTERNAL_API_SECRET_KEY, PLUGIN_SECRET_KEY, or AUTH_SECRET in production.'
    );
  }
  if (!warnedDevFallback) {
    warnedDevFallback = true;
    console.warn(
      '[external-api-secrets] No secret key env var set; using development-only fallback key.'
    );
  }
  return DEV_FALLBACK_SEED;
}

function deriveKey(override?: string): Buffer {
  return createHash('sha256')
    .update(`nextcms-external-api-secret:${resolveSecretMaterial(override)}`)
    .digest();
}

export function isEncryptedExternalApiSecret(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export function isMaskedSecret(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(MASK_PREFIX);
}

export function maskSecretLast4(plaintext: string): string {
  if (!plaintext) return '';
  if (plaintext.length <= 4) return MASK_PREFIX;
  return `${MASK_PREFIX}${plaintext.slice(-4)}`;
}

/** Encrypts a plaintext secret using AES-256-GCM. */
export function encryptExternalApiSecret(
  plaintext: string,
  secretOverride?: string
): string {
  if (!plaintext) return '';
  if (isEncryptedExternalApiSecret(plaintext)) return plaintext;
  const key = deriveKey(secretOverride);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypts an `enc:v1:` secret value back to plaintext. */
export function decryptExternalApiSecret(
  stored: unknown,
  secretOverride?: string
): string | undefined {
  if (typeof stored !== 'string' || !stored) return undefined;
  if (!isEncryptedExternalApiSecret(stored)) return stored;
  const parts = stored.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) return undefined;
  const [ivHex, tagHex, dataHex] = parts;
  try {
    const key = deriveKey(secretOverride);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return undefined;
  }
}

function isPlaceholderOnly(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    /^(?:Bearer\s+)?\{\{(?:secret|env)\.[A-Za-z0-9_.-]+\}\}$/i.test(trimmed) ||
    /^\{\{(?:secret|env)\.[A-Za-z0-9_.-]+\}\}$/.test(trimmed)
  );
}

export function isSensitiveHeaderName(key: string): boolean {
  return /^(authorization|proxy-authorization|cookie|x-api-key|api-key|x-auth-token|x-access-token)$/i.test(
    key.trim()
  ) || /secret|token|password|apikey|api_key/i.test(key);
}

/**
 * Encrypts a `secrets` map for DB storage. Preserves existing encrypted values
 * when the client submits the `••••last4` mask sentinel.
 */
export function encryptSecretMap(
  nextPlain: Record<string, string> = {},
  existingStored: Record<string, string> = {},
  secretOverride?: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, val] of Object.entries(nextPlain)) {
    const key = rawKey.trim();
    if (!key) continue;
    if (isMaskedSecret(val)) {
      if (existingStored[key]) {
        out[key] = existingStored[key];
      }
      continue;
    }
    if (!val) continue;
    out[key] = encryptExternalApiSecret(val, secretOverride);
  }
  return out;
}

export function decryptSecretMap(
  stored: Record<string, string> = {},
  secretOverride?: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(stored ?? {})) {
    const plain = decryptExternalApiSecret(val, secretOverride);
    if (plain !== undefined) {
      out[key] = plain;
    }
  }
  return out;
}

export function maskSecretMap(
  stored: Record<string, string> = {},
  secretOverride?: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(stored ?? {})) {
    if (isMaskedSecret(val)) {
      out[key] = val;
      continue;
    }
    const plain = decryptExternalApiSecret(val, secretOverride);
    if (plain !== undefined) {
      out[key] = maskSecretLast4(plain);
    }
  }
  return out;
}

/**
 * Encrypts sensitive header values for DB storage while preserving existing
 * encrypted values when the client sends back a `••••last4` mask.
 */
export function encryptHeadersForStorage(
  nextHeaders: Record<string, string> = {},
  existingStored: Record<string, string> = {},
  secretOverride?: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, val] of Object.entries(nextHeaders)) {
    const key = rawKey.trim();
    if (!key) continue;
    if (isMaskedSecret(val)) {
      if (existingStored[key] !== undefined) {
        out[key] = existingStored[key];
      }
      continue;
    }
    if (isSensitiveHeaderName(key) && val && !isPlaceholderOnly(val)) {
      out[key] = encryptExternalApiSecret(val, secretOverride);
    } else {
      out[key] = val;
    }
  }
  return out;
}

export function decryptHeadersForRuntime(
  storedHeaders: Record<string, string> = {},
  secretOverride?: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(storedHeaders ?? {})) {
    if (isEncryptedExternalApiSecret(val)) {
      out[key] = decryptExternalApiSecret(val, secretOverride) ?? '';
    } else {
      out[key] = val;
    }
  }
  return out;
}

export function maskHeadersForDisplay(
  storedHeaders: Record<string, string> = {},
  secretOverride?: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(storedHeaders ?? {})) {
    if (isMaskedSecret(val)) {
      out[key] = val;
    } else if (isEncryptedExternalApiSecret(val)) {
      const plain = decryptExternalApiSecret(val, secretOverride) ?? '';
      out[key] = maskSecretLast4(plain);
    } else if (isSensitiveHeaderName(key) && val && !isPlaceholderOnly(val)) {
      out[key] = maskSecretLast4(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function getEnvAllowlist(override?: string[]): Set<string> {
  if (override) {
    return new Set(override.map(s => s.trim()).filter(Boolean));
  }
  const raw = process.env.EXTERNAL_API_ENV_ALLOWLIST ?? '';
  return new Set(
    raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
}

/**
 * Interpolates `{{secret.NAME}}` from the preset's vault secrets and
 * `{{env.VAR_NAME}}` ONLY when `VAR_NAME` starts with `EXT_API_` or is listed
 * in `EXTERNAL_API_ENV_ALLOWLIST`.
 */
export function interpolateExternalApiHeaders(
  headers: Record<string, string>,
  secrets: Record<string, string> = {},
  options?: { allowEnv?: boolean; envAllowlist?: string[] }
): Record<string, string> {
  const allowEnv = options?.allowEnv ?? true;
  const envAllowlist = getEnvAllowlist(options?.envAllowlist);
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers ?? {})) {
    let resolved = value.replace(SECRET_PLACEHOLDER_RE, (_, name: string) => {
      return secrets[name] ?? '';
    });
    resolved = resolved.replace(ENV_PLACEHOLDER_RE, (_, name: string) => {
      if (!allowEnv) return '';
      if (name.startsWith('EXT_API_') || envAllowlist.has(name)) {
        return process.env[name] ?? '';
      }
      return '';
    });
    out[key] = resolved;
  }

  return out;
}
