import 'server-only';
import { createHash } from 'node:crypto';
import { hitRateWindow } from '@/server/lib/rate-window';

const MINUTE_MS = 60_000;

function envLimit(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

/**
 * Per-minute limits for External API traffic. Override with env vars, e.g.
 * `EXTERNAL_API_HOST_RATE_LIMIT=300`.
 */
export const externalApiLimits = {
  /** Real upstream requests to one API host (cache hits never count). */
  perHost: () => envLimit('EXTERNAL_API_HOST_RATE_LIMIT', 120),
  /** Public listing action calls from one visitor IP. */
  perVisitorIp: () => envLimit('EXTERNAL_API_VISITOR_RATE_LIMIT', 120),
  /** Inspector "fetch keys" calls from one admin. */
  perInspectUser: () => envLimit('EXTERNAL_API_INSPECT_RATE_LIMIT', 30),
};

/** The message visitors and editors see when a limit is reached. */
export const EXTERNAL_API_RATE_LIMITED = 'External API is busy right now. Please try again in a minute.';

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/** IPs are hashed so the limiter table never stores a visitor's address. */
function hashed(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/**
 * Counts one upstream request to the endpoint's host. Shared by every page,
 * block and the inspector, so one popular page cannot hammer an API.
 */
export async function allowExternalApiHostCall(endpointUrl: string): Promise<boolean> {
  const host = hostOf(endpointUrl);
  if (!host) return true;
  const result = await hitRateWindow(`extapi:host:${host}`, externalApiLimits.perHost(), MINUTE_MS);
  return result.allowed;
}

/** Counts one call to the public listing action from a visitor IP. */
export async function allowVisitorListingCall(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return true;
  const result = await hitRateWindow(
    `extapi:visitor:${hashed(ip)}`,
    externalApiLimits.perVisitorIp(),
    MINUTE_MS
  );
  return result.allowed;
}

/** Counts one inspector fetch by an admin. */
export async function allowInspectCall(userId: string): Promise<boolean> {
  const result = await hitRateWindow(
    `extapi:inspect:${userId}`,
    externalApiLimits.perInspectUser(),
    MINUTE_MS
  );
  return result.allowed;
}
