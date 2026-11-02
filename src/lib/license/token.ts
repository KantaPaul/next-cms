import { sign, verify } from 'crypto';
import { PRODUCT_ID_NEXT_CMS } from '@/db/schemas/licenses.schema';

export const LICENSE_TOKEN_VERSION = 1;
export const LICENSE_TOKEN_ISSUER = 'next-cms-authority';
export const LICENSE_TOKEN_AUDIENCE = 'next-cms-installation';

export interface LicenseTokenClaims {
  licensePublicId: string;
  productId: typeof PRODUCT_ID_NEXT_CMS;
  installationPublicId: string;
  issuedAt: number; // Unix timestamp in seconds
  expiresAt: number; // Unix timestamp in seconds
  tokenVersion: number;
  issuer: typeof LICENSE_TOKEN_ISSUER;
  audience: typeof LICENSE_TOKEN_AUDIENCE;
  kid: string;
}

export interface LicenseTokenHeader {
  alg: 'Ed25519';
  typ: 'JWT';
  kid: string;
}

export interface SignLicenseTokenParams {
  licensePublicId: string;
  installationPublicId: string;
  expiresInSeconds?: number;
  expiresAt?: number;
  privateKeyPem: string;
  kid?: string;
}

function base64UrlEncode(data: string | Buffer): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return buf.toString('base64url');
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url');
}

/**
 * Signs an Ed25519 license token with standard claims.
 */
export function signLicenseToken(params: SignLicenseTokenParams): string {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt =
    params.expiresAt !== undefined
      ? params.expiresAt
      : now + (params.expiresInSeconds ?? 86400 * 30); // Default 30 days
  const kid = params.kid || 'v1';

  const header: LicenseTokenHeader = {
    alg: 'Ed25519',
    typ: 'JWT',
    kid,
  };

  const claims: LicenseTokenClaims = {
    licensePublicId: params.licensePublicId,
    productId: PRODUCT_ID_NEXT_CMS,
    installationPublicId: params.installationPublicId,
    issuedAt: now,
    expiresAt,
    tokenVersion: LICENSE_TOKEN_VERSION,
    issuer: LICENSE_TOKEN_ISSUER,
    audience: LICENSE_TOKEN_AUDIENCE,
    kid,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = sign(null, Buffer.from(signingInput, 'utf8'), params.privateKeyPem);
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

export type PublicKeyResolver =
  | string
  | { current: string; previous?: string | null }
  | Record<string, string>;

export interface VerifyLicenseTokenOptions {
  expectedInstallationPublicId?: string;
  expectedProductId?: string;
  now?: number; // For testability
}

export type VerifyResult =
  | { valid: true; claims: LicenseTokenClaims; header: LicenseTokenHeader }
  | { valid: false; error: string; claims?: Partial<LicenseTokenClaims> };

/**
 * Verifies an Ed25519 license token. Checks:
 * 1. Compact 3-part structure.
 * 2. Signature match against current or previous public key.
 * 3. Issuer equals 'next-cms-authority'.
 * 4. Audience equals 'next-cms-installation'.
 * 5. Expiration time (not expired).
 * 6. Product ID equals 'next-cms'.
 * 7. Token version equals 1.
 * 8. Installation public ID matches expected if provided.
 */
export function verifyLicenseToken(
  tokenString: string,
  publicKeys: PublicKeyResolver,
  options: VerifyLicenseTokenOptions = {}
): VerifyResult {
  if (!tokenString || typeof tokenString !== 'string') {
    return { valid: false, error: 'Token string is empty or invalid' };
  }

  const parts = tokenString.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token format; expected 3 parts' };
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: LicenseTokenHeader;
  let claims: LicenseTokenClaims;
  let signatureBuf: Buffer;

  try {
    header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8'));
    claims = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'));
    signatureBuf = base64UrlDecode(encodedSignature);
  } catch {
    return { valid: false, error: 'Failed to decode token JSON' };
  }

  if (header.alg !== 'Ed25519') {
    return { valid: false, error: `Unsupported algorithm: ${header.alg}`, claims };
  }

  // Resolve candidate public keys (current first, then previous)
  const candidateKeys: string[] = [];
  if (typeof publicKeys === 'string') {
    candidateKeys.push(publicKeys);
  } else if ('current' in publicKeys) {
    if (publicKeys.current) candidateKeys.push(publicKeys.current);
    if (publicKeys.previous) candidateKeys.push(publicKeys.previous);
  } else {
    // Record / map by kid
    if (header.kid && publicKeys[header.kid]) {
      candidateKeys.push(publicKeys[header.kid]);
    }
    // Also add all other keys as fallback
    for (const [k, v] of Object.entries(publicKeys)) {
      if (k !== header.kid && v && !candidateKeys.includes(v)) {
        candidateKeys.push(v);
      }
    }
  }

  if (candidateKeys.length === 0) {
    return { valid: false, error: 'No verification public keys available', claims };
  }

  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8');
  let signatureValid = false;

  for (const candidateKey of candidateKeys) {
    try {
      if (verify(null, signingInput, candidateKey, signatureBuf)) {
        signatureValid = true;
        break;
      }
    } catch {
      // Key format or verification error, try next candidate key
      continue;
    }
  }

  if (!signatureValid) {
    return { valid: false, error: 'Invalid token signature', claims };
  }

  // Check issuer
  if (claims.issuer !== LICENSE_TOKEN_ISSUER) {
    return {
      valid: false,
      error: `Invalid issuer: expected ${LICENSE_TOKEN_ISSUER}, got ${claims.issuer}`,
      claims,
    };
  }

  // Check audience
  if (claims.audience !== LICENSE_TOKEN_AUDIENCE) {
    return {
      valid: false,
      error: `Invalid audience: expected ${LICENSE_TOKEN_AUDIENCE}, got ${claims.audience}`,
      claims,
    };
  }

  // Check product
  const expectedProduct = options.expectedProductId ?? PRODUCT_ID_NEXT_CMS;
  if (claims.productId !== expectedProduct) {
    return {
      valid: false,
      error: `Invalid product ID: expected ${expectedProduct}, got ${claims.productId}`,
      claims,
    };
  }

  // Check token version
  if (claims.tokenVersion !== LICENSE_TOKEN_VERSION) {
    return {
      valid: false,
      error: `Unsupported token version: ${claims.tokenVersion}`,
      claims,
    };
  }

  // Check installation ID if requested
  if (
    options.expectedInstallationPublicId &&
    claims.installationPublicId !== options.expectedInstallationPublicId
  ) {
    return {
      valid: false,
      error: `Installation ID mismatch: expected ${options.expectedInstallationPublicId}, got ${claims.installationPublicId}`,
      claims,
    };
  }

  // Check expiration
  const currentTimestamp = options.now !== undefined ? options.now : Math.floor(Date.now() / 1000);
  if (claims.expiresAt && claims.expiresAt < currentTimestamp) {
    return {
      valid: false,
      error: `Token expired at ${new Date(claims.expiresAt * 1000).toISOString()}`,
      claims,
    };
  }

  return {
    valid: true,
    claims,
    header,
  };
}
