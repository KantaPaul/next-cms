import { formsService } from '@/server/services/forms.service';

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await formsService.submit(formData);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true, id: result.id });
}
