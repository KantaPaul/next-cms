/**
 * Pure rules for persisted style classes (KRK-01), kept free of the database
 * and `server-only` so they can be unit-tested. The service
 * (`style-classes.service.ts`) does the I/O.
 */

/** Cache tag for a site's compiled class CSS. Revalidate it on any class or breakpoint change. */
export const styleClassesTag = (siteId: string) => `style-classes:${siteId}`;

/**
 * Ids of the nodes in a stored builder document that use `classId`.
 *
 * Handles both stored shapes:
 * - BuilderDocument: `{ nodes: { [id]: { id, type, props: { classIds } } } }`
 * - Legacy Puck data: `{ content: [{ type, props: { id, classIds } }], zones }`
 *
 * The node id comes from the node (`id`) or, for Puck data, from `props.id`.
 */
export function collectClassUsage(content: unknown, classId: string): string[] {
  const found = new Set<string>();
  const seen = new WeakSet<object>();

  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const record = value as Record<string, unknown>;
    const props = record.props;
    if (props && typeof props === 'object' && !Array.isArray(props)) {
      const p = props as Record<string, unknown>;
      if (Array.isArray(p.classIds) && p.classIds.includes(classId)) {
        const id = typeof record.id === 'string' ? record.id : typeof p.id === 'string' ? p.id : null;
        if (id) found.add(id);
      }
    }
    for (const key of Object.keys(record)) visit(record[key]);
  };

  visit(content);
  return [...found].sort();
}

/**
 * Elements per class id across stored documents. A node counts once per
 * entry even when it appears in both its draft and published content.
 */
export function countClassUsage(entries: { id: string; content: unknown }[]): Record<string, number> {
  const nodesByClass = new Map<string, Set<string>>();
  const seen = new WeakSet<object>();
  const visit = (entryId: string, value: unknown): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(entryId, item);
      return;
    }
    const record = value as Record<string, unknown>;
    const props = record.props;
    if (props && typeof props === 'object' && !Array.isArray(props)) {
      const p = props as Record<string, unknown>;
      const nodeId = typeof record.id === 'string' ? record.id : typeof p.id === 'string' ? p.id : null;
      if (nodeId && Array.isArray(p.classIds)) {
        for (const classId of p.classIds) {
          if (typeof classId !== 'string' || !classId) continue;
          let nodes = nodesByClass.get(classId);
          if (!nodes) nodesByClass.set(classId, (nodes = new Set()));
          nodes.add(`${entryId}/${nodeId}`);
        }
      }
    }
    for (const key of Object.keys(record)) visit(entryId, record[key]);
  };
  for (const entry of entries) visit(entry.id, entry.content);
  return Object.fromEntries([...nodesByClass].map(([classId, nodes]) => [classId, nodes.size]));
}

/** Postgres unique-violation code. */
const UNIQUE_VIOLATION = '23505';

/** Finds a Postgres error code on an error or its `cause` (drizzle wraps driver errors). */
function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && typeof current === 'object' && depth < 4; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Turns a database error into a message an editor can act on, or rethrows it. */
export function styleClassWriteError(error: unknown, name: string | undefined): Error {
  if (pgErrorCode(error) === UNIQUE_VIOLATION) {
    return new Error(`A class named "${name ?? ''}" already exists on this site.`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Why `base` can't be the base of a new combo class, or null if it can.
 * A base must exist on the same site and be a plain (non-combo) class.
 */
export function comboBaseProblem(
  base: { siteId: string; kind: string; comboOf?: string | null } | undefined,
  siteId: string
): string | null {
  if (!base || base.siteId !== siteId) return 'The base class does not exist on this site.';
  if (base.kind !== 'class') return 'Tag styles cannot have combo classes.';
  if (base.comboOf) return 'A combo class cannot be the base of another combo.';
  return null;
}

/** Message for refusing to delete a class that is still in use. */
export function inUseMessage(elementCount: number, comboCount: number): string | null {
  const parts: string[] = [];
  if (elementCount > 0) parts.push(`${elementCount} element${elementCount === 1 ? '' : 's'}`);
  if (comboCount > 0) parts.push(`${comboCount} combo class${comboCount === 1 ? '' : 'es'}`);
  if (!parts.length) return null;
  return `This class is used by ${parts.join(' and ')}. Delete it anyway to remove it everywhere.`;
}
