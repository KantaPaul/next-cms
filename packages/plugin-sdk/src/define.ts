import type {
  ClientPluginDefinition,
  ClientPluginInput,
  ServerPluginDefinition,
  ServerPluginInput,
} from './types';

export const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const PLUGIN_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/;
export const SECRET_MASK_PREFIX = '••••';

/** Validates a plugin id (`lowercase-kebab-case`). */
export function validatePluginId(id: string): void {
  if (!id || typeof id !== 'string' || !PLUGIN_ID_PATTERN.test(id)) {
    throw new Error(
      `Invalid plugin id "${String(id)}". Expected lowercase alphanumeric and hyphens (e.g. "mailchimp" or "reading-time").`
    );
  }
}

/** Validates a plugin semver version string. */
export function validatePluginVersion(version: string, pluginId: string): void {
  if (!version || typeof version !== 'string' || !PLUGIN_VERSION_PATTERN.test(version)) {
    throw new Error(
      `Plugin "${pluginId}" has invalid version "${String(version)}". Expected semver like "1.0.0".`
    );
  }
}

type SemVer = [number, number, number];

function parseSemVer(raw: string): SemVer | null {
  const cleaned = raw.trim().replace(/^v/i, '').split(/[-+]/)[0];
  const parts = cleaned.split('.');
  if (parts.length !== 3) return null;
  const nums = parts.map(p => Number.parseInt(p, 10));
  if (nums.some(n => !Number.isFinite(n) || n < 0)) return null;
  return nums as SemVer;
}

function compareSemVer(a: SemVer, b: SemVer): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

/**
 * Checks whether `cmsVersion` satisfies a plugin's `requires` version range.
 * Supports `*`, exact `1.2.3`, comparators (`>=`, `<=`, `>`, `<`, `=`),
 * caret (`^1.2.3`), tilde (`~1.2.3`), and space-separated AND clauses.
 */
export function satisfiesCmsVersion(
  cmsVersion: string,
  range: string | undefined
): boolean {
  if (!range || !range.trim() || range.trim() === '*') return true;
  const current = parseSemVer(cmsVersion);
  if (!current) return false;

  const clauses = range.trim().split(/\s+/);
  for (const clause of clauses) {
    if (clause === '*') continue;
    if (clause.startsWith('^')) {
      const target = parseSemVer(clause.slice(1));
      if (!target) return false;
      if (compareSemVer(current, target) < 0) return false;
      const upper: SemVer =
        target[0] > 0
          ? [target[0] + 1, 0, 0]
          : target[1] > 0
            ? [0, target[1] + 1, 0]
            : [0, 0, target[2] + 1];
      if (compareSemVer(current, upper) >= 0) return false;
      continue;
    }
    if (clause.startsWith('~')) {
      const target = parseSemVer(clause.slice(1));
      if (!target) return false;
      if (compareSemVer(current, target) < 0) return false;
      const upper: SemVer = [target[0], target[1] + 1, 0];
      if (compareSemVer(current, upper) >= 0) return false;
      continue;
    }
    const match = clause.match(/^(>=|<=|>|<|=)?(.+)$/);
    if (!match) return false;
    const op = match[1] ?? '=';
    const target = parseSemVer(match[2]);
    if (!target) return false;
    const cmp = compareSemVer(current, target);
    if (op === '>=' && cmp < 0) return false;
    if (op === '<=' && cmp > 0) return false;
    if (op === '>' && cmp <= 0) return false;
    if (op === '<' && cmp >= 0) return false;
    if (op === '=' && cmp !== 0) return false;
  }
  return true;
}

/** Validates a server plugin definition and returns it typed. */
export function definePlugin<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
>(input: ServerPluginInput<TSettings>): ServerPluginDefinition<TSettings> {
  validatePluginId(input.id);
  if (!input.name || typeof input.name !== 'string') {
    throw new Error(`Plugin "${input.id}" must declare a non-empty name.`);
  }
  validatePluginVersion(input.version, input.id);

  if (input.permissions) {
    for (const perm of input.permissions) {
      if (!perm.key || !perm.key.includes('.') || /\s/.test(perm.key)) {
        throw new Error(
          `Plugin "${input.id}" has invalid permission key "${perm.key}". Expected "resource.action" format.`
        );
      }
      if (!perm.label) {
        throw new Error(
          `Plugin "${input.id}" permission "${perm.key}" must have a label.`
        );
      }
    }
  }

  if (input.routes) {
    const validMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    for (const route of input.routes) {
      if (!validMethods.has(route.method)) {
        throw new Error(
          `Plugin "${input.id}" route "${route.path}" has invalid method "${route.method}".`
        );
      }
      if (!route.path.startsWith('/')) {
        throw new Error(
          `Plugin "${input.id}" route path "${route.path}" must start with "/".`
        );
      }
      if (typeof route.handler !== 'function') {
        throw new Error(
          `Plugin "${input.id}" route "${route.method} ${route.path}" must provide a handler function.`
        );
      }
    }
  }

  if (input.cron) {
    for (const job of input.cron) {
      if (job.every !== 'hourly' && job.every !== 'daily') {
        throw new Error(
          `Plugin "${input.id}" cron job must specify every: "hourly" | "daily".`
        );
      }
      if (typeof job.run !== 'function') {
        throw new Error(`Plugin "${input.id}" cron job must provide a run function.`);
      }
    }
  }

  if (input.formActions) {
    for (const action of input.formActions) {
      if (!action.id || !action.label || typeof action.run !== 'function') {
        throw new Error(
          `Plugin "${input.id}" formAction must declare id, label, and run.`
        );
      }
    }
  }

  return input;
}

/** Validates a client plugin definition (blocks, custom fields, admin pages). */
export function defineClientPlugin(
  input: ClientPluginInput
): ClientPluginDefinition {
  validatePluginId(input.id);

  if (input.blocks) {
    for (const block of input.blocks) {
      if (!block.type.startsWith(`${input.id}/`)) {
        throw new Error(
          `Plugin "${input.id}" block "${block.type}" must be namespaced as "${input.id}/<BlockName>".`
        );
      }
    }
  }

  if (input.adminPages) {
    for (const page of input.adminPages) {
      if (!page.slug || !/^[a-z0-9][a-z0-9-]*$/.test(page.slug)) {
        throw new Error(
          `Plugin "${input.id}" admin page slug "${page.slug}" must be lowercase kebab-case.`
        );
      }
    }
  }

  return input;
}

/** Masks a secret value for safe display in the admin UI (never returns raw secret). */
export function maskSecretValue(value: string | undefined | null): string {
  if (!value) return '';
  return `${SECRET_MASK_PREFIX}${SECRET_MASK_PREFIX}${SECRET_MASK_PREFIX}${SECRET_MASK_PREFIX}`;
}

/** Returns true if the submitted value is an unchanged mask placeholder. */
export function isMaskedSecret(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(SECRET_MASK_PREFIX);
}
