'use client';

import type { BuilderNode, NodeId } from '@nextcms/builder-core';
import type { EditorStore } from '@nextcms/builder-react';
import { useEffect, useRef, useState } from 'react';
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

/** Props that change what a loader returns; slots and styling don't. */
function queryKey(node: BuilderNode): string {
  const { section: _s, elements: _e, animation: _a, ...rest } = node.props;
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
  language: string
) {
  const [loaded, setLoaded] = useState(initial);
  const keys = useRef<Record<NodeId, string>>({});
  const timers = useRef<Record<NodeId, ReturnType<typeof setTimeout>>>({});
  const requests = useRef<Record<NodeId, number>>({});

  useEffect(() => {
    setLoaded(initial);
    // Nodes loaded on the server count as current.
    keys.current = {};
    for (const node of Object.values(store.getState().doc.nodes)) {
      if (LIVE_TYPES.has(node.type) && initial[node.id]) {
        keys.current[node.id] = queryKey(node);
      }
    }
  }, [store, initial]);

  useEffect(() => {
    const check = () => {
      const nodes = store.getState().doc.nodes;
      for (const node of Object.values(nodes)) {
        if (!LIVE_TYPES.has(node.type)) continue;
        const key = queryKey(node);
        if (keys.current[node.id] === key) continue;
        keys.current[node.id] = key;
        clearTimeout(timers.current[node.id]);
        timers.current[node.id] = setTimeout(() => {
          const ticket = (requests.current[node.id] ?? 0) + 1;
          requests.current[node.id] = ticket;
          void reloadNodeData({
            type: node.type as 'LoopGrid',
            props: node.props,
            language,
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
  }, [store, language]);

  return loaded;
}
