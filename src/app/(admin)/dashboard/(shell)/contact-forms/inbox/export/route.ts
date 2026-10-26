import { PERMISSIONS } from '@/config/permissions';
import { requirePermission } from '@/server/services/require-permission';
import { formsService } from '@/server/services/forms.service';

export async function GET(request: Request) {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  if (!allowed) return new Response('Forbidden', { status: 403 });
  const status = new URL(request.url).searchParams.get('status') ?? undefined;
  const filter =
    status === 'new' || status === 'read' || status === 'archived' ? status : undefined;
  const csv = await formsService.toCsv(filter);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="form-submissions.csv"',
    },
  });
}
