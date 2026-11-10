import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  type ClientPluginDefinition,
  type PluginPermissionDef,
  satisfiesCmsVersion,
  type ServerPluginDefinition,
} from '@nextcms/plugin-sdk';

export type ResolvedPluginFiles = {
  specifier: string;
  serverFile: string;
  serverImport: string;
  clientFile: string | null;
  clientImport: string | null;
};

export type LoadedPluginPair = {
  specifier: string;
  server: ServerPluginDefinition<any>;
  client: ClientPluginDefinition | null;
  serverImport: string;
  clientImport: string | null;
};

const SERVER_CANDIDATES = [
  'plugin.server.ts',
  'plugin.server.tsx',
  'plugin.server.mts',
  'plugin.server.js',
  'plugin.server.mjs',
  'dist/plugin.server.js',
];

const CLIENT_CANDIDATES = [
  'plugin.client.tsx',
  'plugin.client.ts',
  'plugin.client.jsx',
  'plugin.client.js',
  'plugin.client.mjs',
  'dist/plugin.client.js',
];

function stripTsExtension(filePath: string): string {
  return filePath.replace(/\.(?:tsx?|jsx?|mts)$/, '');
}

function toPosixRelativeImport(fromDir: string, targetFile: string): string {
  const rel = path.relative(fromDir, stripTsExtension(targetFile));
  const posix = rel.split(path.sep).join('/');
  return posix.startsWith('.') ? posix : `./${posix}`;
}

function isLocalSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('/')
  );
}

/** Resolves a local path or npm package specifier into its server & client entry files. */
export function resolvePluginFiles(
  specifier: string,
  repoRoot: string,
  generatedDir: string
): ResolvedPluginFiles {
  let pluginDir: string;
  if (isLocalSpecifier(specifier)) {
    pluginDir = path.resolve(repoRoot, specifier);
  } else {
    const req = createRequire(path.join(repoRoot, 'package.json'));
    const pkgJson = req.resolve(`${specifier}/package.json`);
    pluginDir = path.dirname(pkgJson);
  }

  if (!existsSync(pluginDir)) {
    throw new Error(`Plugin "${specifier}" directory not found at ${pluginDir}`);
  }

  const serverRel = SERVER_CANDIDATES.find(c =>
    existsSync(path.join(pluginDir, c))
  );
  if (!serverRel) {
    throw new Error(
      `Plugin "${specifier}" is missing plugin.server.ts (checked ${SERVER_CANDIDATES.join(', ')})`
    );
  }
  const serverFile = path.join(pluginDir, serverRel);

  const clientRel = CLIENT_CANDIDATES.find(c =>
    existsSync(path.join(pluginDir, c))
  );
  const clientFile = clientRel ? path.join(pluginDir, clientRel) : null;

  const serverImport = isLocalSpecifier(specifier)
    ? toPosixRelativeImport(generatedDir, serverFile)
    : `${specifier}/server`;
  const clientImport = clientFile
    ? isLocalSpecifier(specifier)
      ? toPosixRelativeImport(generatedDir, clientFile)
      : `${specifier}/client`
    : null;

  return {
    specifier,
    serverFile,
    serverImport,
    clientFile,
    clientImport,
  };
}

/** Validates ids, CMS version requirements, client/server pairing, block namespaces, and duplicates. */
export function validateLoadedPlugins(
  items: LoadedPluginPair[],
  cmsVersion: string,
  reservedBlockTypes: ReadonlySet<string> = new Set()
): { permissions: PluginPermissionDef[] } {
  const seenIds = new Set<string>();
  const seenBlockTypes = new Set<string>(reservedBlockTypes);
  const seenPermissions = new Set<string>();
  const permissions: PluginPermissionDef[] = [];

  for (const item of items) {
    const { server, client, specifier } = item;
    if (!server || typeof server !== 'object' || !server.id) {
      throw new Error(
        `Plugin "${specifier}" plugin.server must default-export definePlugin({...}).`
      );
    }

    if (seenIds.has(server.id)) {
      throw new Error(`Duplicate plugin id "${server.id}" found in nextcms.plugins.ts.`);
    }
    seenIds.add(server.id);

    if (!satisfiesCmsVersion(cmsVersion, server.requires)) {
      throw new Error(
        `Plugin "${server.id}" requires CMS version "${server.requires}", current is "${cmsVersion}".`
      );
    }

    if (client) {
      if (client.id !== server.id) {
        throw new Error(
          `Plugin "${specifier}" id mismatch: server is "${server.id}", client is "${client.id}".`
        );
      }
      for (const block of client.blocks ?? []) {
        if (!block.type.startsWith(`${server.id}/`)) {
          throw new Error(
            `Plugin "${server.id}" block "${block.type}" must be namespaced as "${server.id}/<BlockName>".`
          );
        }
        if (seenBlockTypes.has(block.type)) {
          throw new Error(
            `Duplicate block type "${block.type}" registered by plugin "${server.id}".`
          );
        }
        seenBlockTypes.add(block.type);
      }
    }

    for (const perm of server.permissions ?? []) {
      if (seenPermissions.has(perm.key)) {
        throw new Error(
          `Duplicate permission key "${perm.key}" declared by plugin "${server.id}".`
        );
      }
      seenPermissions.add(perm.key);
      permissions.push(perm);
    }
  }

  return { permissions };
}

function toIdent(index: number, prefix: string): string {
  return `${prefix}_${index}`;
}

export function renderServerRegistry(items: LoadedPluginPair[]): string {
  const imports = items.map(
    (item, i) => `import ${toIdent(i, 'serverPlugin')} from '${item.serverImport}';`
  );
  const list = items.map((_, i) => `  ${toIdent(i, 'serverPlugin')},`).join('\n');
  const mapEntries = items
    .map(
      (item, i) =>
        `  [${JSON.stringify(item.server.id)}]: ${toIdent(i, 'serverPlugin')},`
    )
    .join('\n');

  return [
    '// Auto-generated by `pnpm plugins:sync`. Do not edit manually.',
    "import type { ServerPluginDefinition } from '@nextcms/plugin-sdk';",
    ...imports,
    '',
    'export const SERVER_PLUGINS: ServerPluginDefinition<any>[] = [',
    list,
    '];',
    '',
    'export const SERVER_PLUGINS_BY_ID: Record<string, ServerPluginDefinition<any>> = {',
    mapEntries,
    '};',
    '',
  ]
    .filter(line => line !== undefined)
    .join('\n');
}

export function renderClientRegistry(items: LoadedPluginPair[]): string {
  const withClient = items.filter(
    (item): item is LoadedPluginPair & { clientImport: string } =>
      Boolean(item.client && item.clientImport)
  );
  const imports = withClient.map(
    (item, i) => `import ${toIdent(i, 'clientPlugin')} from '${item.clientImport}';`
  );
  const list = withClient
    .map((_, i) => `  ${toIdent(i, 'clientPlugin')},`)
    .join('\n');
  const mapEntries = withClient
    .map(
      (item, i) =>
        `  [${JSON.stringify(item.server.id)}]: ${toIdent(i, 'clientPlugin')},`
    )
    .join('\n');

  return [
    '// Auto-generated by `pnpm plugins:sync`. Do not edit manually.',
    "import type { ClientPluginDefinition } from '@nextcms/plugin-sdk/client';",
    ...imports,
    '',
    'export const CLIENT_PLUGINS: ClientPluginDefinition[] = [',
    list,
    '];',
    '',
    'export const CLIENT_PLUGINS_BY_ID: Record<string, ClientPluginDefinition> = {',
    mapEntries,
    '};',
    '',
  ].join('\n');
}

export function renderPermissionsRegistry(
  permissions: PluginPermissionDef[]
): string {
  return [
    '// Auto-generated by `pnpm plugins:sync`. Do not edit manually.',
    "import type { PluginPermissionDef } from '@nextcms/plugin-sdk';",
    '',
    `export const PLUGIN_PERMISSIONS: PluginPermissionDef[] = ${JSON.stringify(permissions, null, 2)};`,
    '',
  ].join('\n');
}
