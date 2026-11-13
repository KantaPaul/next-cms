/**
 * Lets a Query Filter adapt to the loop it filters.
 *
 * A filter in External API mode needs the same API as its target Query Loop
 * or Loop Grid to build its options. Rather than configuring the API twice,
 * a filter with no API of its own inherits the target loop's settings.
 *
 * Pure and client-safe: used by the server render (via the loader context),
 * the editor's live reload, and the inspector's key picker.
 */

/** Block types a Query Filter can target. */
export const LOOP_BLOCK_TYPES = new Set(['QueryLoop', 'LoopGrid']);

/** The API settings a filter takes from its target loop. */
const INHERITED_API_KEYS = [
  'apiPresetId',
  'apiEndpointUrl',
  'apiMethod',
  'apiBody',
  'apiHeaders',
  'apiQueryParams',
  'apiDataFilters',
  'apiItemsPath',
  'apiTotalPath',
  'apiFieldId',
  'apiFieldTitle',
  'apiCacheTtlSeconds',
  'apiTimeoutMs',
] as const;

/**
 * Set on inherited props when the loop gets its API from its Loop Item
 * template, so the filter loader can resolve the same preset.
 */
export const INHERITED_TEMPLATE_KEY = '__loopTemplateId';

export type LoopBlockRef = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** True when the props name an API of their own (preset or endpoint). */
export function hasOwnExternalApi(props: Record<string, unknown>): boolean {
  return Boolean(text(props.apiPresetId) || text(props.apiEndpointUrl));
}

/** Loop blocks in a document's node map, in map order. */
export function collectLoopBlocks(
  nodes: Record<string, { id: string; type: string; props: Record<string, unknown> }>
): LoopBlockRef[] {
  return Object.values(nodes)
    .filter(node => LOOP_BLOCK_TYPES.has(node.type))
    .map(node => ({ id: node.id, type: node.type, props: node.props }));
}

/**
 * The loop a filter controls.
 *
 * With a `targetLoopId`: the loop with that `loopId`, preferring the filter's
 * source. Without one (the External API filter hides the field), it is found
 * automatically: the loop using the same saved External API, else a loop
 * with a blank `loopId`, else the only loop with the filter's source.
 */
export function findTargetLoop(
  loops: LoopBlockRef[],
  filterProps: Record<string, unknown>
): LoopBlockRef | undefined {
  const targetId = text(filterProps.targetLoopId);
  const source = text(filterProps.source);
  if (targetId) {
    const matches = loops.filter(loop => text(loop.props.loopId) === targetId);
    return matches.find(loop => text(loop.props.source) === source) ?? matches[0];
  }

  const sameSource = loops.filter(loop => text(loop.props.source) === source);
  const presetId = text(filterProps.apiPresetId);
  if (presetId) {
    const byPreset = sameSource.find(loop => text(loop.props.apiPresetId) === presetId);
    if (byPreset) return byPreset;
  }
  const blank = (loop: LoopBlockRef) => !text(loop.props.loopId);
  return (
    sameSource.find(blank) ??
    (sameSource.length === 1 ? sameSource[0] : undefined) ??
    loops.find(blank)
  );
}

/**
 * The URL namespace a filter writes to: its own `targetLoopId`, or the
 * `loopId` of the loop it was linked to automatically.
 */
export function effectiveTargetLoopId(
  filterProps: Record<string, unknown>,
  loop: LoopBlockRef | undefined
): string {
  return text(filterProps.targetLoopId) || (loop ? text(loop.props.loopId) : '');
}

/**
 * Filter props ready for its loader: the target loop's API filled in (when
 * the filter has none) and `targetLoopId` set to the linked loop's ID.
 */
export function resolveFilterProps(
  filterProps: Record<string, unknown>,
  loops: LoopBlockRef[]
): Record<string, unknown> {
  const loop = findTargetLoop(loops, filterProps);
  const props = inheritTargetLoopApi(filterProps, loop);
  const targetLoopId = effectiveTargetLoopId(filterProps, loop);
  return targetLoopId === text(filterProps.targetLoopId)
    ? props
    : { ...props, targetLoopId };
}

/**
 * The filter's props with the target loop's API settings filled in. A filter
 * that has its own API, or is not in External API mode, is returned as is.
 */
export function inheritTargetLoopApi(
  filterProps: Record<string, unknown>,
  loop: LoopBlockRef | undefined
): Record<string, unknown> {
  if (filterProps.source !== 'external-api') return filterProps;
  if (hasOwnExternalApi(filterProps)) return filterProps;
  if (!loop || loop.props.source !== 'external-api') return filterProps;

  const inherited: Record<string, unknown> = {};
  for (const key of INHERITED_API_KEYS) {
    if (loop.props[key] !== undefined) inherited[key] = loop.props[key];
  }
  if (!hasOwnExternalApi(loop.props) && text(loop.props.templateId)) {
    inherited[INHERITED_TEMPLATE_KEY] = text(loop.props.templateId);
  }
  return { ...filterProps, ...inherited };
}
