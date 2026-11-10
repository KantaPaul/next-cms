import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import {
  isMaskedSecret,
  maskSecretValue,
  type PluginSettingField,
} from '@nextcms/plugin-sdk';

const ENC_PREFIX = 'enc:v1:';
const DEV_FALLBACK_SEED = 'nextcms-dev-plugin-secret-do-not-use-in-prod';

let warnedDevFallback = false;

function resolveSecretMaterial(override?: string): string {
  const raw =
    override ??
    process.env.PLUGIN_SECRET_KEY ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;
  if (raw && raw.trim()) {
    return raw.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Plugin secret encryption requires PLUGIN_SECRET_KEY or AUTH_SECRET in production.'
    );
  }
  if (!warnedDevFallback) {
    warnedDevFallback = true;
    console.warn(
      '[plugins/secrets] PLUGIN_SECRET_KEY and AUTH_SECRET are unset; using development-only fallback key.'
    );
  }
  return DEV_FALLBACK_SEED;
}

function deriveKey(override?: string): Buffer {
  return createHash('sha256')
    .update(`nextcms-plugin-secret:${resolveSecretMaterial(override)}`)
    .digest();
}

export function isEncryptedPluginSecret(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

/** Encrypts a plaintext secret using AES-256-GCM. */
export function encryptPluginSecret(
  plaintext: string,
  secretOverride?: string
): string {
  if (!plaintext) return '';
  if (isEncryptedPluginSecret(plaintext)) return plaintext;
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
export function decryptPluginSecret(
  stored: unknown,
  secretOverride?: string
): string | undefined {
  if (typeof stored !== 'string' || !stored) return undefined;
  if (!isEncryptedPluginSecret(stored)) return stored;
  const parts = stored.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) return undefined;
  const [ivHex, tagHex, dataHex] = parts;
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
}

/**
 * Prepares settings for persistence: preserves existing encrypted secrets when
 * the UI submits the mask sentinel, and encrypts newly entered secret values.
 */
export function encryptPluginSettings(
  nextPlain: Record<string, unknown>,
  fields: Record<string, PluginSettingField> = {},
  existingStored: Record<string, unknown> = {},
  secretOverride?: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...nextPlain };
  for (const [key, meta] of Object.entries(fields)) {
    if (!meta.secret) continue;
    const incoming = out[key];
    if (incoming === undefined) {
      if (existingStored[key] !== undefined) out[key] = existingStored[key];
      continue;
    }
    if (isMaskedSecret(incoming)) {
      if (existingStored[key] !== undefined) {
        out[key] = existingStored[key];
      } else {
        delete out[key];
      }
      continue;
    }
    if (typeof incoming === 'string') {
      const trimmed = incoming.trim();
      if (!trimmed) {
        delete out[key];
      } else {
        out[key] = encryptPluginSecret(trimmed, secretOverride);
      }
    }
  }
  return out;
}

/** Decrypts secret fields for server-side plugin execution (`ctx.settings`). */
export function decryptPluginSettings(
  stored: Record<string, unknown> = {},
  fields: Record<string, PluginSettingField> = {},
  secretOverride?: string
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, meta] of Object.entries(fields)) {
    if (meta.defaultValue !== undefined) {
      out[key] = meta.defaultValue;
    }
  }
  for (const [key, val] of Object.entries(stored)) {
    if (fields[key]?.secret || isEncryptedPluginSecret(val)) {
      const decrypted = decryptPluginSecret(val, secretOverride);
      if (decrypted !== undefined) out[key] = decrypted;
    } else if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

/** Masks secret fields before sending plugin settings to any client/browser boundary. */
export function maskPluginSettingsForClient(
  stored: Record<string, unknown> = {},
  fields: Record<string, PluginSettingField> = {}
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, meta] of Object.entries(fields)) {
    if (meta.defaultValue !== undefined && !meta.secret) {
      out[key] = meta.defaultValue;
    }
  }
  for (const [key, val] of Object.entries(stored)) {
    if (fields[key]?.secret || isEncryptedPluginSecret(val)) {
      out[key] = val ? maskSecretValue(String(val)) : '';
    } else {
      out[key] = val;
    }
  }
  return out;
}

/** Removes secret fields and encrypted blobs from a `plugins` row for backups. */
export function scrubPluginRow(
  row: Record<string, unknown>,
  secretKeysByPlugin?: Record<string, Set<string>>
): Record<string, unknown> {
  const settings =
    row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
      ? { ...(row.settings as Record<string, unknown>) }
      : {};
  const pluginId = typeof row.pluginId === 'string' ? row.pluginId : '';
  const secretKeys = secretKeysByPlugin?.[pluginId];
  for (const [key, val] of Object.entries(settings)) {
    if (secretKeys?.has(key) || isEncryptedPluginSecret(val)) {
      delete settings[key];
    }
  }
  return { ...row, settings };
}
