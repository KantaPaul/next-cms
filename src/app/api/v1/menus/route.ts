import { MENU_LOCATION } from '@/db/schemas/shared.schema';
import { apiHandler, apiOptions, enumParam } from '@/server/api/v1';
import { contentApiService } from '@/server/services/content-api.service';

export const dynamic = 'force-dynamic';

const toItem = (item: {
  id: string;
  label: string;
  url: string;
  target: string;
  badge: string | null;
  order: number;
}) => ({
  id: item.id,
  label: item.label,
  url: item.url,
  target: item.target,
  badge: item.badge,
  order: item.order,
});

export const GET = apiHandler(async (_request, { url }) => {
  const location = enumParam(url, 'location', MENU_LOCATION);
  const menus = await contentApiService.listMenus(location);
  return {
    data: menus.map(menu => ({
      id: menu.id,
      title: menu.title,
      location: menu.location,
      items: menu.items.map(item => ({
        ...toItem(item),
        children: item.children.map(toItem),
      })),
    })),
  };
});

export const OPTIONS = apiOptions;
