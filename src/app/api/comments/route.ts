import { commentsService } from '@/server/services/comments.service';

/** Visitor comment submission from the Comments block. Saved as pending. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const result = await commentsService.submit(formData, {
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true });
}
