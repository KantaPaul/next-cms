import { NextResponse } from 'next/server';
import { privacyService } from '@/server/services/privacy.service';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlResponse(title: string, message: string, status: number) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; display: grid; min-height: 100vh; place-items: center; padding: 1.5rem; }
    .card { max-width: 28rem; width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
    p { font-size: 0.95rem; line-height: 1.5; color: #475569; margin: 0 0 1.25rem; }
    a { color: #4f46e5; text-decoration: none; font-weight: 500; font-size: 0.9rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <a href="/">Return to home page</a>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const wantsJson = request.headers
    .get('accept')
    ?.includes('application/json');

  const result = await privacyService.confirmToken(token);
  if (!result.ok) {
    const message =
      result.error === 'expired'
        ? 'This confirmation link has expired. Please submit a new privacy request.'
        : 'This confirmation link is invalid.';
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: result.error, message }, { status: 400 });
    }
    return htmlResponse('Confirmation failed', message, 400);
  }

  const label =
    result.request.type === 'erase' ? 'data erasure' : 'data export';
  const message = result.alreadyConfirmed
    ? `Your ${label} request for ${result.request.email} was already confirmed and is queued for review.`
    : `Thank you. Your ${label} request for ${result.request.email} has been confirmed and logged for processing.`;

  if (wantsJson) {
    return NextResponse.json({
      ok: true,
      alreadyConfirmed: result.alreadyConfirmed,
      request: {
        id: result.request.id,
        email: result.request.email,
        type: result.request.type,
        status: result.request.status,
      },
    });
  }

  return htmlResponse('Privacy request confirmed', message, 200);
}
