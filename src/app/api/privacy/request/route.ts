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
  // Configured URLs only. The Host header is client-controlled: building the
  // emailed link from it would let an attacker send a victim a real
  // confirmation email whose link (and token) points at the attacker's site.
  const baseUrl = settings.siteUrl?.trim() || env.SITE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Privacy requests are not available yet.' },
      { status: 503 }
    );
  }

  let res: Awaited<ReturnType<typeof privacyService.requestConfirmation>>;
  try {
    res = await privacyService.requestConfirmation({
      siteId: site.id,
      siteName: settings.siteName || site.name,
      email: parsed.data.email,
      type: parsed.data.type,
      visitorId,
      ip: clientIp(request.headers),
      baseUrl,
    });
  } catch {
    // e.g. no signing secret configured in production
    return NextResponse.json(
      { error: 'Privacy requests are not available yet.' },
      { status: 503 }
    );
  }

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }

  return NextResponse.json({
    ok: true,
    message:
      'If that email address is valid, we sent a confirmation link (valid for 24 hours).',
  });
}
