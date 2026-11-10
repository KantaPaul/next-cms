import 'server-only';
import type {
  PluginContext,
  PluginRouteDef,
  PluginRouteRequest,
  ServerPluginDefinition,
} from '@nextcms/plugin-sdk';
import { PERMISSIONS, type PermissionKey } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { SERVER_PLUGINS_BY_ID } from '@/plugins/generated/server-registry';
import { accessService } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { siteContext } from '@/server/services/site-context';
import { buildPluginContext } from './context';
import { pluginsService } from './plugins.service';

export function matchPluginRoute<TSettings extends Record<string, unknown>>(
  routes: PluginRouteDef<TSettings>[],
  method: string,
  segments: string[]
): { route: PluginRouteDef<TSettings>; params: Record<string, string> } | null {
  const upperMethod = method.toUpperCase();
  const reqSegs = segments.filter(Boolean);

  for (const route of routes) {
    if (route.method.toUpperCase() !== upperMethod) continue;
    const routeSegs = route.path.split('/').filter(Boolean);
    if (routeSegs.length !== reqSegs.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < routeSegs.length; i++) {
      const pattern = routeSegs[i];
      const actual = reqSegs[i];
      if (pattern.startsWith(':')) {
        params[pattern.slice(1)] = decodeURIComponent(actual);
      } else if (pattern !== actual) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }

  return null;
}

export type PluginRouteDispatchDeps = {
  getPlugin: (id: string) => ServerPluginDefinition<any> | undefined;
  resolveSiteId: () => Promise<string>;
  isEnabled: (siteId: string, pluginId: string) => Promise<boolean>;
  getSettings: (siteId: string, pluginId: string) => Promise<Record<string, unknown>>;
  buildContext: (opts: {
    pluginId: string;
    siteId: string;
    settings: Record<string, unknown>;
  }) => Promise<PluginContext>;
  checkAuth: (
    permission: string
  ) => Promise<
    { ok: true; userId: string } | { ok: false; status: 401 | 403; error: string }
  >;
  recordError: (siteId: string, pluginId: string, msg: string) => Promise<void>;
};

const defaultDeps: PluginRouteDispatchDeps = {
  getPlugin: id => SERVER_PLUGINS_BY_ID[id],
  resolveSiteId: async () => (await siteContext.publicSite()).id,
  isEnabled: (siteId, pluginId) => pluginsService.isEnabled(siteId, pluginId),
  getSettings: (siteId, pluginId) =>
    pluginsService.getServerSettings(siteId, pluginId),
  buildContext: opts => buildPluginContext(opts),
  checkAuth: async permission => {
    const session = await validateSession();
    if (!session?.user?.id) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }
    const access = await accessService.getUserAccess(session.user.id);
    if (!accessService.can(access, permission as PermissionKey)) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    return { ok: true, userId: session.user.id };
  },
  recordError: async (siteId, pluginId, msg) => {
    await pluginsService.recordPluginError(siteId, pluginId, msg);
    await auditService
      .log({
        actorId: null,
        action: 'plugin_error',
        targetType: 'plugin',
        targetId: pluginId,
        targetName: pluginId,
        details: msg.slice(0, 1000),
      })
      .catch(() => undefined);
  },
};

export async function dispatchPluginRoute(
  request: Request,
  pluginId: string,
  pathSegments: string[],
  deps: PluginRouteDispatchDeps = defaultDeps
): Promise<Response> {
  const plugin = deps.getPlugin(pluginId);
  if (!plugin || !plugin.routes?.length) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const siteId = await deps.resolveSiteId();
  const enabled = await deps.isEnabled(siteId, pluginId);
  if (!enabled) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const matched = matchPluginRoute(plugin.routes, request.method, pathSegments);
  if (!matched) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const requiredAuth =
    matched.route.auth ??
    plugin.permissions?.[0]?.key ??
    PERMISSIONS.SETTINGS_MANAGE;

  let userId: string | null = null;
  if (requiredAuth !== 'public') {
    const authRes = await deps.checkAuth(requiredAuth);
    if (!authRes.ok) {
      return Response.json(
        { error: authRes.error },
        { status: authRes.status }
      );
    }
    userId = authRes.userId;
  }

  const url = new URL(request.url);
  const pluginReq: PluginRouteRequest = {
    request,
    method: request.method,
    path: `/${pathSegments.join('/')}`,
    params: matched.params,
    query: url.searchParams,
    userId,
  };

  try {
    const settings = await deps.getSettings(siteId, pluginId);
    const ctx = await deps.buildContext({ pluginId, siteId, settings });
    return await matched.route.handler(pluginReq, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[plugin:${pluginId}] route ${request.method} /${pathSegments.join('/')} failed:`,
      err
    );
    await deps.recordError(
      siteId,
      pluginId,
      `Route ${request.method} /${pathSegments.join('/')}: ${message}`
    );
    return Response.json({ error: 'Plugin route failed' }, { status: 500 });
  }
}
