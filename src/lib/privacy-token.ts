import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';

export type PrivacyTokenPayload = {
  jti: string;
  siteId: string;
  email: string;
  type: 'export' | 'erase';
  visitorId: string | null;
  exp: number;
};

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSigningSecret(): string {
  return (
    process.env.PRIVACY_SIGNING_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CRON_SECRET ||
    process.env.DATABASE_URL ||
    'next-cms-privacy-dev-secret'
  );
}

export function hashPrivacyToken(token: string): string {
  return createHash('sha256').update(`privacy-token:${token}`).digest('hex');
}

export function createPrivacyConfirmationToken(
  input: {
    siteId: string;
    email: string;
    type: 'export' | 'erase';
    visitorId?: string | null;
  },
  options?: { nowMs?: number; ttlMs?: number; secret?: string }
): string {
  const now = options?.nowMs ?? Date.now();
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
  const payload: PrivacyTokenPayload = {
    jti: createId(),
    siteId: input.siteId,
    email: input.email.trim().toLowerCase(),
    type: input.type,
    visitorId: input.visitorId ?? null,
    exp: now + ttl,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', options?.secret ?? getSigningSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function verifyPrivacyConfirmationToken(
  token: string,
  options?: { nowMs?: number; secret?: string }
):
  | { ok: true; payload: PrivacyTokenPayload }
  | { ok: false; error: 'invalid' | 'expired' } {
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'invalid' };
  }
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) {
    return { ok: false, error: 'invalid' };
  }
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = createHmac(
    'sha256',
    options?.secret ?? getSigningSecret()
  )
    .update(body)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, error: 'invalid' };
  }

  let parsed: PrivacyTokenPayload;
  try {
    parsed = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    ) as PrivacyTokenPayload;
  } catch {
    return { ok: false, error: 'invalid' };
  }

  if (
    !parsed ||
    typeof parsed.email !== 'string' ||
    (parsed.type !== 'export' && parsed.type !== 'erase') ||
    typeof parsed.siteId !== 'string' ||
    typeof parsed.exp !== 'number'
  ) {
    return { ok: false, error: 'invalid' };
  }

  const now = options?.nowMs ?? Date.now();
  if (now > parsed.exp) {
    return { ok: false, error: 'expired' };
  }

  return { ok: true, payload: parsed };
}
