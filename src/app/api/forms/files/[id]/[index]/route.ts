import { PERMISSIONS } from '@/config/permissions';
import { requirePermission } from '@/server/services/require-permission';
import { formsService } from '@/server/services/forms.service';
import { storage } from '@/server/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  if (!allowed) {
    return new Response('Forbidden', { status: 403 });
  }

  const { id, index: rawIndex } = await params;
  const index = Number.parseInt(rawIndex, 10);
  if (Number.isNaN(index) || index < 0) {
    return new Response('Invalid file index', { status: 400 });
  }

  const submission = await formsService.get(id);
  if (!submission) {
    return new Response('Submission not found', { status: 404 });
  }

  const file = submission.files?.[index];
  if (!file) {
    return new Response('File not found in submission', { status: 404 });
  }

  const buffer = await storage().read(file.key);
  if (!buffer) {
    return new Response('Stored file not found', { status: 404 });
  }

  const safeFileName = encodeURIComponent(file.name);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': file.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFileName}"; filename*=UTF-8''${safeFileName}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache',
    },
  });
}
