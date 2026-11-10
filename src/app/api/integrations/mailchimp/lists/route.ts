import { PERMISSIONS } from '@/config/permissions';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { getMailchimpLists } from '@/server/integrations/mailchimp';

export async function GET() {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  if (!allowed) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await siteSettingsService.get();
  const apiKey = settings.integrations?.mailchimp?.apiKey?.trim();

  if (!apiKey) {
    return Response.json({ lists: [] });
  }

  try {
    const lists = await getMailchimpLists(apiKey);
    return Response.json({ lists });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch lists' },
      { status: 500 }
    );
  }
}
