import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  type LoadedPluginPair,
  renderClientRegistry,
  renderPermissionsRegistry,
  renderServerRegistry,
  resolvePluginFiles,
  validateLoadedPlugins,
} from './lib/plugins-sync-core';

export async function syncPlugins(
  repoRoot: string = process.cwd()
): Promise<{ count: number; permissionsCount: number }> {
  const configPath = path.join(repoRoot, 'nextcms.plugins.ts');
  const pkgJsonPath = path.join(repoRoot, 'package.json');
  const generatedDir = path.join(repoRoot, 'src/plugins/generated');

  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as {
    version?: string;
  };
  const cmsVersion = pkg.version ?? '0.1.0';

  let configured: string[] = [];
  if (existsSync(configPath)) {
    const mod = await import(pathToFileURL(configPath).href);
    configured = Array.isArray(mod.default) ? mod.default : [];
  }

  const loaded: LoadedPluginPair[] = [];
  for (const specifier of configured) {
    const resolved = resolvePluginFiles(specifier, repoRoot, generatedDir);
    const serverMod = await import(pathToFileURL(resolved.serverFile).href);
    const clientMod = resolved.clientFile
      ? await import(pathToFileURL(resolved.clientFile).href)
      : null;

    loaded.push({
      specifier,
      server: serverMod.default,
      client: clientMod?.default ?? null,
      serverImport: resolved.serverImport,
      clientImport: resolved.clientImport,
    });
  }

  const { permissions } = validateLoadedPlugins(loaded, cmsVersion);

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(
    path.join(generatedDir, 'server-registry.ts'),
    renderServerRegistry(loaded),
    'utf8'
  );
  writeFileSync(
    path.join(generatedDir, 'client-registry.ts'),
    renderClientRegistry(loaded),
    'utf8'
  );
  writeFileSync(
    path.join(generatedDir, 'permissions.ts'),
    renderPermissionsRegistry(permissions),
    'utf8'
  );

  return { count: loaded.length, permissionsCount: permissions.length };
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]).endsWith(path.join('scripts', 'plugins-sync.ts'));

if (isCli) {
  syncPlugins()
    .then(res => {
      console.log(
        `[plugins:sync] Synced ${res.count} plugin(s), ${res.permissionsCount} plugin permission(s).`
      );
    })
    .catch(err => {
      console.error('[plugins:sync] Failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
