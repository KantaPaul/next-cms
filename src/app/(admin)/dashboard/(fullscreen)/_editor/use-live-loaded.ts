'use client';

import type { BuilderNode, NodeId } from '@nextcms/builder-core';
import type { EditorStore } from '@nextcms/builder-react';
import { useEffect, useRef, useState } from 'react';
import { collectLoopBlocks, resolveFilterProps } from '@/builder/query-filter-target';
import { reloadNodeData } from '@/server/actions/builder-data.actions';

/** Block types whose loaded data follows their props on the canvas. */
const LIVE_TYPES = new Set([
  'LoopGrid',
  'QueryLoop',
  'PostTypeEntries',
  'CollectionBlock',
  'QueryFilter',
]);
const DEBOUNCE_MS = 300;

/**
 * The props a block's loader runs with. A Query Filter with no API of its
 * own takes its target loop's, so editing that loop's API reloads the filter.
 */
function loaderProps(
  node: BuilderNode,
  nodes: Record<NodeId, BuilderNode>
): Record<string, unknown> {
  if (node.type !== 'QueryFilter') return node.props;
  return resolveFilterProps(node.props, collectLoopBlocks(nodes));
}

/** Props that change what a loader returns; slots and styling don't. */
function queryKey(props: Record<string, unknown>): string {
  const { section: _s, elements: _e, animation: _a, ...rest } = props;
  return JSON.stringify(rest);
}

/**
 * Canvas data for loader-backed blocks. Starts from the server pass and
 * re-runs a block's loader (debounced) whenever its query props change or a
 * new one is inserted, so Loop Grids and Query Loops update without a reload.
 */
export function useLiveLoaded(
  store: EditorStore,
  initial: Record<NodeId, Record<string, unknown>>,
  language: string,
  /** Collection entry the canvas renders for, so reloads see its fields and post data. */
  entryId?: string
) {
  const [loaded, setLoaded] = useState(initial);
  const keys = useRef<Record<NodeId, string>>({});
  const timers = useRef<Record<NodeId, ReturnType<typeof setTimeout>>>({});
  const requests = useRef<Record<NodeId, number>>({});

  useEffect(() => {
    setLoaded(initial);
    // Nodes loaded on the server count as current.
    keys.current = {};
    const nodes = store.getState().doc.nodes;
    for (const node of Object.values(nodes)) {
      if (LIVE_TYPES.has(node.type) && initial[node.id]) {
        keys.current[node.id] = queryKey(loaderProps(node, nodes));
      }
    }
  }, [store, initial]);

  useEffect(() => {
    const check = () => {
      const nodes = store.getState().doc.nodes;
      for (const node of Object.values(nodes)) {
        if (!LIVE_TYPES.has(node.type)) continue;
        const props = loaderProps(node, nodes);
        const key = queryKey(props);
        if (keys.current[node.id] === key) continue;
        keys.current[node.id] = key;
        clearTimeout(timers.current[node.id]);
        timers.current[node.id] = setTimeout(() => {
          const ticket = (requests.current[node.id] ?? 0) + 1;
          requests.current[node.id] = ticket;
          void reloadNodeData({
            type: node.type as 'LoopGrid',
            props,
            language,
            ...(entryId && { entryId }),
          })
            .then(result => {
              // Drop stale answers when a newer request for this node is in flight.
              if (requests.current[node.id] !== ticket) return;
              if (!result || typeof result !== 'object' || !('patch' in result)) {
                return;
              }
              setLoaded(prev => ({ ...prev, [node.id]: result.patch }));
            })
            .catch(() => {});
        }, DEBOUNCE_MS);
      }
    };
    check();
    const unsubscribe = store.subscribe(check);
    const pending = timers.current;
    return () => {
      unsubscribe();
      for (const timer of Object.values(pending)) clearTimeout(timer);
    };
  }, [store, language, entryId]);

  return loaded;
}
