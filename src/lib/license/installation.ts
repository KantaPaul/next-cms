import { generateKeyPairSync, randomBytes, randomUUID, sign, verify } from 'crypto';

export interface KeyPairPem {
  publicKeyPem: string;
  privateKeyPem: string;
}

/**
 * Generates an Ed25519 key pair for an installation or authority.
 * Private key: PKCS#8 PEM format.
 * Public key: SPKI PEM format.
 *
 * NOTE: The private key must NEVER be committed to source control or exposed to the client.
 * Store it in server environment variables (e.g., LICENSE_INSTALLATION_PRIVATE_KEY or LICENSE_SIGNING_PRIVATE_KEY)
 * or in a secure server-only location outside the repository.
 */
export function generateEd25519KeyPair(): KeyPairPem {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

/**
 * Generates a public ID for an installation deployment (e.g., `inst_12345678...`).
 */
export function generateInstallationPublicId(): string {
  return `inst_${randomBytes(16).toString('hex')}`;
}

/**
 * Generates a cryptographic nonce for replay protection.
 */
export function generateNonce(): string {
  return randomUUID();
}

/**
 * Signs an installation request payload using the installation's private key.
 * Serializes the payload canonically (sorted keys) before signing to ensure deterministic hashing.
 */
export function signInstallationRequest(
  payload: Record<string, unknown>,
  privateKeyPem: string
): { signature: string; timestamp: number; nonce: string } {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();

  const dataToSign = canonicalSerialize({
    ...payload,
    timestamp,
    nonce,
  });

  const signature = sign(null, Buffer.from(dataToSign, 'utf8'), privateKeyPem).toString(
    'base64url'
  );

  return {
    signature,
    timestamp,
    nonce,
  };
}

/**
 * Verifies that a signed request came from the owner of publicKeyPem
 * and was signed within an acceptable clock skew window (default 300s = 5m).
 */
export function verifyInstallationRequest({
  payload,
  signature,
  timestamp,
  nonce,
  publicKeyPem,
  maxSkewSeconds = 300,
  now = Math.floor(Date.now() / 1000),
}: {
  payload: Record<string, unknown>;
  signature: string;
  timestamp: number;
  nonce: string;
  publicKeyPem: string;
  maxSkewSeconds?: number;
  now?: number;
}): { valid: boolean; error?: string } {
  if (Math.abs(now - timestamp) > maxSkewSeconds) {
    return {
      valid: false,
      error: `Request timestamp out of window (skew: ${Math.abs(now - timestamp)}s > ${maxSkewSeconds}s)`,
    };
  }

  const dataToSign = canonicalSerialize({
    ...payload,
    timestamp,
    nonce,
  });

  try {
    const signatureBuf = Buffer.from(signature, 'base64url');
    const isValid = verify(null, Buffer.from(dataToSign, 'utf8'), publicKeyPem, signatureBuf);
    return {
      valid: isValid,
      error: isValid ? undefined : 'Invalid signature for installation request',
    };
  } catch (err) {
    return {
      valid: false,
      error: `Verification error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Deterministically serializes an object with sorted keys for reproducible signing.
 */
function canonicalSerialize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalSerialize).join(',')}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map(k => `${JSON.stringify(k)}:${canonicalSerialize((obj as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}
