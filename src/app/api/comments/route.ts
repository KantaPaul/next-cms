import { commentVisitor, withVisitorCookie } from '@/lib/comment-visitor';
import { commentsService } from '@/server/services/comments.service';

/** Visitor comment submission from the Comments block. Saved as pending. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const visitor = commentVisitor(request);
  const result = await commentsService.submit(formData, {
    ip: visitor.ip,
    voterKey: visitor.voterKey,
    userAgent: request.headers.get('user-agent') ?? '',
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return withVisitorCookie(Response.json({ ok: true }), visitor);
}
