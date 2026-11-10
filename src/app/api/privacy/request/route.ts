import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env.mjs';
import { clientIp } from '@/server/lib/client-ip';
import { privacyService } from '@/server/services/privacy.service';
import { siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';

const requestSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(200),
  type: z.enum(['export', 'erase']),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 }
    );
  }

  const [site, settings, jar] = await Promise.all([
    siteContext.publicSite(),
    siteSettingsService.getPublic(),
    cookies(),
  ]);

  const visitorId = jar.get('cms_vid')?.value ?? null;
  const reqUrl = new URL(request.url);
  const baseUrl =
    settings.siteUrl?.trim() ||
    `${reqUrl.protocol}//${request.headers.get('host') || reqUrl.host}` ||
    env.SITE_URL;

  const res = await privacyService.requestConfirmation({
    siteId: site.id,
    siteName: settings.siteName || site.name,
    email: parsed.data.email,
    type: parsed.data.type,
    visitorId,
    ip: clientIp(request.headers),
    baseUrl,
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }

  return NextResponse.json({
    ok: true,
    message:
      'If that email address is valid, we sent a confirmation link (valid for 24 hours).',
  });
}
