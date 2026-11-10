import { dispatchPluginRoute } from '@/server/plugins/routes';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string; path: string[] }>;
};

async function handle(request: Request, context: RouteContext) {
  const { id, path } = await context.params;
  return dispatchPluginRoute(request, id, path ?? []);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
