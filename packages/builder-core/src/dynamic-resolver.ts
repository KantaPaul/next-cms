import type { BuilderDocument, BuilderNode, NodeId } from './document';
import {
  type DynamicBinding,
  type DynamicTransform,
  isDynamicBinding,
} from './dynamic';

/**
 * Request/rendering context for resolving dynamic bindings (R416 / BLD-24).
 * Scoped by site and language for tenant isolation.
 */
export interface DynamicContext {
  siteId?: string;
  language?: string;
  page?: Record<string, unknown>;
  post?: Record<string, unknown>;
  site?: Record<string, unknown>;
  author?: Record<string, unknown>;
  custom?: Record<string, unknown>;
  [key: string]: unknown;
}

const DISALLOWED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/** Safely retrieves a nested value by dot path, blocking prototype access. */
export function getPathValue(
  target: unknown,
  path?: string
): unknown {
  if (!target || typeof target !== 'object' || !path) return undefined;
  const segments = path.split('.');
  let current: any = target;

  for (const seg of segments) {
    if (!current || typeof current !== 'object' || DISALLOWED_KEYS.has(seg)) {
      return undefined;
    }
    current = current[seg];
  }

  return current;
}

const DANGEROUS_URL_PROTOCOL = /^(javascript|data|vbscript):/i;
const SAFE_URL_PREFIX = /^(https?:|\/|mailto:|tel:|#)/i;

/** Sanitizes URL values to prevent script injection via dynamic bindings. */
export function sanitizeDynamicUrl(url: string, fallback = ''): string {
  const trimmed = url.trim();
  if (DANGEROUS_URL_PROTOCOL.test(trimmed)) {
    return fallback;
  }
  if (trimmed === '' || SAFE_URL_PREFIX.test(trimmed)) {
    return trimmed;
  }
  // Relative or protocol-less URL
  return trimmed;
}

/** Applies approved text transforms to a resolved string value. */
export function applyTransform(value: string, transform?: DynamicTransform): string {
  if (!transform) return value;
  switch (transform) {
    case 'uppercase':
      return value.toUpperCase();
    case 'lowercase':
      return value.toLowerCase();
    case 'titlecase':
      return value.replace(/\b\w/g, char => char.toUpperCase());
    case 'slug':
      return value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    case 'date': {
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) return value;
      return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    default:
      return value;
  }
}

const MAX_RESOLUTION_DEPTH = 2;

/**
 * Resolves a dynamic binding reference to its concrete value in context (R416, R417).
 * Missing or null values fall back to `binding.fallback` or empty string.
 */
export function resolveDynamicValue(
  value: unknown,
  context: DynamicContext,
  depth = 0
): unknown {
  if (!isDynamicBinding(value)) {
    return value;
  }

  if (depth >= MAX_RESOLUTION_DEPTH) {
    return value.fallback ?? '';
  }

  const { $dynamic: source, path, fallback, transform } = value;
  const sourceData = context[source];

  let resolved: unknown;
  if (sourceData && typeof sourceData === 'object') {
    resolved = path ? getPathValue(sourceData, path) : sourceData;
  } else if (source === 'custom' && context.custom) {
    resolved = path ? getPathValue(context.custom, path) : undefined;
  }

  if (resolved === undefined || resolved === null || resolved === '') {
    resolved = fallback !== undefined ? fallback : '';
  }

  // Handle potential nested dynamic reference safely
  if (isDynamicBinding(resolved)) {
    resolved = resolveDynamicValue(resolved, context, depth + 1);
  }

  if (typeof resolved === 'string') {
    // Sanitize if looks like a dangerous URL protocol
    if (DANGEROUS_URL_PROTOCOL.test(resolved)) {
      resolved = sanitizeDynamicUrl(resolved, fallback ?? '');
    }
    resolved = applyTransform(resolved as string, transform);
  }

  return resolved;
}

/** Recursively resolves dynamic bindings in a props object. */
export function resolveDynamicProps(
  props: Record<string, unknown>,
  context: DynamicContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (isDynamicBinding(value)) {
      result[key] = resolveDynamicValue(value, context);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => {
        if (isDynamicBinding(item)) {
          return resolveDynamicValue(item, context);
        }
        if (item && typeof item === 'object') {
          return resolveDynamicProps(item as Record<string, unknown>, context);
        }
        return item;
      });
    } else if (value && typeof value === 'object' && !isDynamicBinding(value)) {
      result[key] = resolveDynamicProps(value as Record<string, unknown>, context);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Resolves all dynamic bindings across all nodes in a BuilderDocument (R418 / BLD-26).
 */
export function resolveDynamicDocument(
  doc: BuilderDocument,
  context: DynamicContext
): BuilderDocument {
  const resolvedNodes: Record<NodeId, BuilderNode> = {};

  for (const [id, node] of Object.entries(doc.nodes)) {
    resolvedNodes[id] = {
      ...node,
      props: resolveDynamicProps(node.props, context),
    };
  }

  return {
    ...doc,
    nodes: resolvedNodes,
  };
}
