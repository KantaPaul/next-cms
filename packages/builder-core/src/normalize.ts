import type { BuilderDocument, BuilderNode, NodeId } from './document';
import { isDynamicBinding } from './dynamic';
import { type ThemeTokens, resolveTokenValue } from './theme';

/**
 * Migration and normalization for builder documents (R428 / BLD-36).
 *
 * Normalizes documents by safely keeping static legacy values, ensuring valid
 * property structures, and gracefully handling missing dynamic or token references.
 */
export function normalizeProps(
  props: Record<string, unknown>,
  theme?: ThemeTokens
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (isDynamicBinding(value)) {
      // Validate dynamic binding structure
      result[key] = {
        $dynamic: String(value.$dynamic || 'page'),
        ...(value.path ? { path: String(value.path) } : {}),
        ...(value.fallback !== undefined ? { fallback: String(value.fallback) } : {}),
        ...(value.transform ? { transform: value.transform } : {}),
      };
    } else if (typeof value === 'string' && value.startsWith('token:')) {
      // Token reference - ensure safe fallback exists
      const resolved = resolveTokenValue(value, theme);
      result[key] = value;
      // Also cache safe fallback property
      result[`_${key}_fallback`] = resolved;
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => {
        if (item && typeof item === 'object') {
          return normalizeProps(item as Record<string, unknown>, theme);
        }
        return item;
      });
    } else if (typeof value === 'object') {
      result[key] = normalizeProps(value as Record<string, unknown>, theme);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function normalizeBuilderDocument(
  doc: BuilderDocument,
  options: { theme?: ThemeTokens } = {}
): BuilderDocument {
  if (!doc || !doc.nodes) {
    return doc;
  }

  const normalizedNodes: Record<NodeId, BuilderNode> = {};

  for (const [id, node] of Object.entries(doc.nodes)) {
    if (!node) continue;
    normalizedNodes[id] = {
      ...node,
      props: normalizeProps(node.props || {}, options.theme),
    };
  }

  return {
    ...doc,
    nodes: normalizedNodes,
  };
}
