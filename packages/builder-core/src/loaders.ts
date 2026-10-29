/**
 * Server data loaders per block type (R685 / ENG-06), replacing Puck
 * `resolveAllData`. Each loader gets the node's props and a host-defined
 * context, and returns a prop patch merged before render.
 */

import type { BuilderDocument, BuilderNode, NodeId } from './document';

/** Host-defined request context (site, locale, preview, search params, …). */
export type LoaderContext = Record<string, unknown>;

/** Returns a shallow prop patch merged onto the node's existing props. */
export type BlockLoader<Ctx extends LoaderContext = LoaderContext> = (
  props: Record<string, unknown>,
  ctx: Ctx
) => Promise<Record<string, unknown>>;

export type LoaderRegistry<Ctx extends LoaderContext = LoaderContext> = {
  register(type: string, loader: BlockLoader<Ctx>): void;
  get(type: string): BlockLoader<Ctx> | undefined;
  types(): string[];
  /** Runs the loaders for every node and returns a new, resolved document. */
  resolve(doc: BuilderDocument, ctx: Ctx): Promise<BuilderDocument>;
};

export type LoaderRegistryOptions = {
  /** Called when a loader throws; the node keeps its original props. */
  onError?: (error: unknown, node: BuilderNode) => void;
};

export function createLoaderRegistry<Ctx extends LoaderContext = LoaderContext>(
  initial: Record<string, BlockLoader<Ctx>> = {},
  options: LoaderRegistryOptions = {}
): LoaderRegistry<Ctx> {
  const loaders: Record<string, BlockLoader<Ctx>> = { ...initial };

  return {
    register: (type, loader) => {
      loaders[type] = loader;
    },
    get: type => loaders[type],
    types: () => Object.keys(loaders),
    resolve: async (doc, ctx) => {
      const nodeIds = Object.keys(doc.nodes) as NodeId[];
      if (nodeIds.length === 0) return doc;

      const patches = await Promise.all(
        nodeIds.map(async id => {
          const node = doc.nodes[id];
          const loader = node && loaders[node.type];
          if (!loader) return null;
          try {
            return { id, patch: await loader(node.props, ctx) };
          } catch (error) {
            options.onError?.(error, node);
            return null;
          }
        })
      );

      const nodes = { ...doc.nodes };
      for (const entry of patches) {
        const node = entry && nodes[entry.id];
        if (!entry || !node) continue;
        nodes[entry.id] = { ...node, props: { ...node.props, ...entry.patch } };
      }
      return { ...doc, nodes };
    },
  };
}
