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

/**
 * Loads every node of one block type in a single call (R752 / DAT-16), so a
 * page with N instances of the same type makes one query instead of N. Gets
 * every matching node's id and props; returns each node's prop patch, keyed
 * by id (a node with no entry in the result keeps its original props).
 */
export type BatchBlockLoader<Ctx extends LoaderContext = LoaderContext> = (
  nodes: { id: NodeId; props: Record<string, unknown> }[],
  ctx: Ctx
) => Promise<Record<NodeId, Record<string, unknown>>>;

export type LoaderRegistry<Ctx extends LoaderContext = LoaderContext> = {
  register(type: string, loader: BlockLoader<Ctx>): void;
  /** Registers a batch loader (R752 / DAT-16): one call for every node of this type. */
  registerBatch(type: string, loader: BatchBlockLoader<Ctx>): void;
  get(type: string): BlockLoader<Ctx> | undefined;
  getBatch(type: string): BatchBlockLoader<Ctx> | undefined;
  types(): string[];
  /**
   * Runs the loaders for every node and returns each node's prop patch, for
   * an editor that shows loaded data without storing it in the document.
   */
  load(
    doc: BuilderDocument,
    ctx: Ctx
  ): Promise<Record<NodeId, Record<string, unknown>>>;
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
  const batchLoaders: Record<string, BatchBlockLoader<Ctx>> = {};

  const registry: LoaderRegistry<Ctx> = {
    register: (type, loader) => {
      loaders[type] = loader;
    },
    registerBatch: (type, loader) => {
      batchLoaders[type] = loader;
    },
    get: type => loaders[type],
    getBatch: type => batchLoaders[type],
    types: () => Object.keys(loaders).concat(Object.keys(batchLoaders)),
    load: async (doc, ctx) => {
      const byType = new Map<
        string,
        { id: NodeId; props: Record<string, unknown> }[]
      >();
      for (const id of Object.keys(doc.nodes) as NodeId[]) {
        const node = doc.nodes[id];
        if (!node || (!loaders[node.type] && !batchLoaders[node.type]))
          continue;
        const group = byType.get(node.type) ?? [];
        group.push({ id, props: node.props });
        byType.set(node.type, group);
      }

      const patches: Record<NodeId, Record<string, unknown>> = {};

      await Promise.all(
        Array.from(byType.entries()).map(async ([type, nodes]) => {
          const batchLoader = batchLoaders[type];
          if (batchLoader) {
            try {
              Object.assign(patches, await batchLoader(nodes, ctx));
            } catch (error) {
              const node = doc.nodes[nodes[0].id];
              if (node) options.onError?.(error, node);
            }
            return;
          }
          const loader = loaders[type];
          await Promise.all(
            nodes.map(async ({ id }) => {
              const node = doc.nodes[id];
              if (!node) return;
              try {
                patches[id] = await loader(node.props, ctx);
              } catch (error) {
                options.onError?.(error, node);
              }
            })
          );
        })
      );

      return patches;
    },
    resolve: async (doc, ctx) => {
      const patches = await registry.load(doc, ctx);
      if (Object.keys(patches).length === 0) return doc;
      const nodes = { ...doc.nodes };
      for (const [id, patch] of Object.entries(patches)) {
        const node = nodes[id];
        if (node) nodes[id] = { ...node, props: { ...node.props, ...patch } };
      }
      return { ...doc, nodes };
    },
  };
  return registry;
}
