import 'server-only';
import {
  type BreakpointConfig,
  type BuilderDocument,
  collectDynamicRefs,
  type NodeId,
  toDocument,
} from '@nextcms/builder-core';
import { migrateCollectionItems } from '@/builder/collection-item-migrate';
import { editorSetup } from '@/builder/definitions';
import type { SerializedPluginFormAction } from '@/builder/fields/plugin-editor-context';
import { loadDocumentData } from '@/builder/loaders';
import type { PostView } from '@/builder/post-template';
import { documentIssues } from '@/builder/validate-document';
import { hiddenBlocksFor } from '@/config/block-manager';
import { PLUGIN_BLOCK_OWNER } from '@/plugins/client-blocks';
import { SERVER_PLUGINS_BY_ID } from '@/plugins/generated/server-registry';
import { applyFilters } from '@/server/plugins/hooks';
import { pluginsService } from '@/server/plugins/plugins.service';
import { collectionBlocksService } from '@/server/services/collection-blocks.service';
import { collectionsService } from '@/server/services/collections.service';
import {
  type DynamicRefItem,
  type DynamicRefOptions,
  dynamicRefsService,
} from '@/server/services/dynamic-refs.service';
import { adminSiteId } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';

export type EditorData = {
  document: BuilderDocument;
  /** Breakpoint settings from site_settings. */
  breakpoints: BreakpointConfig;
  /** Block data (blog posts, videos, global blocks) shown on the canvas, never stored. */
  loaded: Record<NodeId, Record<string, unknown>>;
  /** Problems found in the stored document (R797). */
  issues: string[];
  /** Pages and posts for "Specific Page/Blog Post" bindings: picker and preview. */
  dynamicRefs: DynamicRefOptions;
  /** Collection entry context for template pages. */
  collectionEntry?: any;
  /** Collection-scoped blocks for the insert panel presets. */
  collectionBlocks?: { id: string; name: string }[];
  /** Block manager: block types left out of this editor's insert panel. */
  hiddenBlocks: string[];
  /** Enabled plugin ids for this site. */
  enabledPluginIds: string[];
  /** Block types owned by disabled plugins (`blockType -> pluginName`). */
  disabledPluginBlocks: Record<string, string>;
  /** Enabled plugin-contributed form actions for ContactForm. */
  pluginFormActions: SerializedPluginFormAction[];
};

/** Adds records the document already points at that fell outside the option list. */
function withPicked(
  options: DynamicRefItem[],
  picked: Record<string, DynamicRefItem>
): DynamicRefItem[] {
  const known = new Set(options.map(item => item.id));
  return [...options, ...Object.values(picked).filter(item => !known.has(item.id))];
}

/** Everything the new editor needs on load, in one server pass (R744). */
export async function loadEditorData({
  content,
  kind,
  language,
  themeTokens,
  post,
  collectionEntry,
  collectionId,
}: {
  content: unknown;
  kind: string;
  language: string;
  themeTokens: unknown;
  post?: PostView;
  collectionEntry?: any;
  collectionId?: string;
}): Promise<EditorData> {
  const document = migrateCollectionItems(toDocument(content));
  const setup = editorSetup(kind);
  const resolvedCollectionId =
    collectionId ||
    collectionEntry?.collection?.id ||
    collectionEntry?.collectionId;
  const siteId = await adminSiteId();
  const [
    loaded,
    options,
    picked,
    settings,
    collectionBlocks,
    collectionRow,
    enabledPluginSet,
    rawFormActions,
  ] = await Promise.all([
    loadDocumentData(document, {
      language,
      themeTokens,
      post,
      collectionEntry,
      editor: true,
    }),
    dynamicRefsService.options(),
    dynamicRefsService.load(collectDynamicRefs(document)),
    siteSettingsService.get(),
    resolvedCollectionId && (kind === 'entry' || kind === 'entry-template')
      ? collectionBlocksService.options(resolvedCollectionId).catch(() => [])
      : Promise.resolve([]),
    resolvedCollectionId &&
    (kind === 'entry' ||
      kind === 'entry-template' ||
      kind === 'collection-block')
      ? collectionsService.get(resolvedCollectionId).catch(() => null)
      : Promise.resolve(null),
    pluginsService.getEnabledIds(siteId),
    applyFilters('form.actions', [], { siteId }),
  ]);

  const disabledPluginBlocks: Record<string, string> = {};
  for (const [blockType, pluginId] of Object.entries(PLUGIN_BLOCK_OWNER)) {
    if (!enabledPluginSet.has(pluginId)) {
      disabledPluginBlocks[blockType] =
        SERVER_PLUGINS_BY_ID[pluginId]?.name ?? pluginId;
    }
  }

  const pluginFormActions: SerializedPluginFormAction[] = rawFormActions.map(
    a => ({
      id: a.id,
      label: a.label,
      pluginId: a.pluginId ?? a.id,
      fields: a.fields,
    })
  );

  return {
    document,
    breakpoints: settings.breakpoints,
    loaded,
    issues: documentIssues(document, setup.definitions),
    hiddenBlocks: hiddenBlocksFor(
      settings.blockSettings,
      kind,
      Array.from(
        new Set([
          ...setup.groups.flatMap(group => group.types),
          ...Object.keys(setup.schemas),
        ])
      ),
      collectionRow?.blockSettings
    ),
    enabledPluginIds: Array.from(enabledPluginSet),
    disabledPluginBlocks,
    pluginFormActions,
    dynamicRefs: {
      pages: withPicked(options.pages, picked.pageRef),
      posts: withPicked(options.posts, picked.postRef),
    },
    collectionEntry,
    collectionBlocks,
  };
}
