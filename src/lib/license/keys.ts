import { createHash, randomBytes } from 'crypto';
import { LICENSE_KEY_PREFIX } from '@/db/schemas/licenses.schema';

/**
 * Computes sha256 hash of a license key.
 * Only the hash is ever stored in the database.
 */
export function hashLicenseKey(key: string): string {
  return createHash('sha256').update(key.trim()).digest('hex');
}

export interface GeneratedLicenseKey {
  key: string;
  keyHash: string;
  keyPrefix: string;
}

/**
 * Generates a cryptographically strong license key with prefix `ncms_lic_`.
 * Returns plaintext key (to show once to admin/buyer), its SHA-256 hash, and prefix.
 */
export function generateLicenseKey(prefix = LICENSE_KEY_PREFIX): GeneratedLicenseKey {
  // 24 bytes base64url gives 32 url-safe alphanumeric chars
  const entropy = randomBytes(24).toString('base64url');
  const key = `${prefix}${entropy}`;
  const keyHash = hashLicenseKey(key);

  return {
    key,
    keyHash,
    keyPrefix: prefix,
  };
}
