import { createHash } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { consentLogs } from '@/db/schema';
import {
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_COOKIE_NAME,
  normalizeConsentCategories,
  parseConsentCookie,
} from '@/lib/consent';
import { siteContext } from '@/server/services/site-context';
import {
  checkPublicCors,
  handlePublicCorsOptions,
} from '@/server/lib/public-cors-site';
import { siteSettingsService } from '@/server/services/site-settings.service';

export async function OPTIONS(request: Request) {
  return handlePublicCorsOptions(request);
}

const payloadSchema = z.object({
  categories: z.object({
    necessary: z.boolean().optional(),
    functional: z.boolean(),
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
  version: z.number().int().min(1).max(9999).optional(),
  receiptId: z.string().max(100).optional(),
});

function hashConsentVisitorKey(rawKey: string): string {
  return createHash('sha256').update(`consent:${rawKey}`).digest('hex');
}

export async function POST(request: Request) {
  const cors = await checkPublicCors(request);
  if (!cors.allowed) {
    return NextResponse.json(
      { ok: false, error: cors.reason ?? 'Forbidden' },
      { status: 403 }
    );
  }
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400, headers: cors.headers }
    );
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid_payload' },
      { status: 400, headers: cors.headers }
    );
  }

  const [site, settings, jar] = await Promise.all([
    siteContext.publicSite(),
    siteSettingsService.getPublic(),
    cookies(),
  ]);

  const existingCookie = parseConsentCookie(
    jar.get(CONSENT_COOKIE_NAME)?.value
  );
  const receiptId =
    parsed.data.receiptId?.trim() || existingCookie?.r || createId();
  const visitorHash = hashConsentVisitorKey(receiptId);
  const categories = normalizeConsentCategories(parsed.data.categories);
  const version = parsed.data.version ?? settings.consent.version ?? 1;
  const mode = settings.consent.mode ?? 'opt-in';

  await db.insert(consentLogs).values({
    siteId: site.id,
    visitorHash,
    categories,
    version,
    mode,
  });

  const choice = {
    v: version,
    d: new Date().toISOString(),
    r: receiptId,
    c: categories,
  };

  const res = NextResponse.json(
    {
      ok: true,
      categories,
      version,
    },
    { headers: cors.headers }
  );

  res.cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(choice), {
    path: '/',
    maxAge: CONSENT_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}
