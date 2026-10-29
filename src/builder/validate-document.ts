/**
 * Checks a builder document once, when it is saved (R741 / DAT-05): sound
 * structure, size limits, known block types, and valid props for blocks with
 * a schema. Rendering still sanitizes too; this keeps bad data from being
 * stored in the first place.
 */

import {
  type BlockDefinition,
  type BuilderDocument,
  documentProblems,
  validateProps,
} from '@nextcms/builder-core';
import { pageDefinitions } from './definitions';

/** Largest document accepted, as JSON. */
export const MAX_DOCUMENT_BYTES = 2_000_000;
/** Most blocks on one page. */
export const MAX_NODES = 5_000;

export function documentIssues(
  doc: BuilderDocument,
  definitions: Record<string, BlockDefinition> = pageDefinitions
): string[] {
  const issues = documentProblems(doc);
  const nodes = Object.values(doc.nodes);
  if (nodes.length > MAX_NODES) issues.push(`more than ${MAX_NODES} blocks`);
  const bytes = new TextEncoder().encode(JSON.stringify(doc)).length;
  if (bytes > MAX_DOCUMENT_BYTES) issues.push(`larger than ${Math.round(MAX_DOCUMENT_BYTES / 1_000_000)} MB`);
  for (const node of nodes) {
    const definition = definitions[node.type];
    if (!definition) {
      issues.push(`unknown block type ${node.type}`);
      continue;
    }
    const result = validateProps(definition, node.props);
    if (!result.ok) issues.push(`${definition.label}: ${result.issues[0]}`);
  }
  return issues;
}
