import { after } from 'next/server';
import { formsService } from '@/server/services/forms.service';

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const formData = await request.formData();
  const result = await formsService.submit(formData, { ip });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (result.afterAction) {
    after(result.afterAction);
  }

  return Response.json({
    ok: true,
    id: result.id,
    redirectTo: result.redirectTo,
  });
}
