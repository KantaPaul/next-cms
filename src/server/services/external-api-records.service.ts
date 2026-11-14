import 'server-only';
import type { ResolvedSite } from '@/server/services/site-context';
import {
  externalApisService,
  presetToApiConfig,
} from '@/server/services/external-apis.service';
import { listingQueryService } from '@/server/services/listing-query.service';

/** One API record for "External API Item" bindings: the item's raw JSON. */
export type ExternalApiRecordMap = Record<string, Record<string, unknown>>;

const MAX_PRESETS_PER_RENDER = 10;

async function firstItem(
  preset: NonNullable<Awaited<ReturnType<typeof externalApisService.getByIdForRuntime>>>,
  site: ResolvedSite,
  matchId?: string
): Promise<Record<string, unknown> | null> {
  const fieldId = preset.fieldId || 'id';
  const result = await listingQueryService.resolve(
    {
      source: 'external-api',
      limit: 1,
      ...(matchId
        ? { filters: [{ field: `ext:${fieldId}`, operator: 'in', value: [matchId] }] }
        : {}),
      apiConfig: presetToApiConfig(preset),
    },
    {
      site,
      secrets: preset.secrets ?? {},
      // Headers come from the saved, Admin-managed preset.
      allowEnvPlaceholders: true,
    }
  );
  const item = result.items[0];
  if (!item) return null;
  return { ...(item.raw ?? {}), __itemId: item.id };
}

export const externalApiRecordsService = {
  /**
   * The record each preset's bindings show, by preset id. Which record: the
   * `itemId` from the URL (Loop Grid "single page" links add `?itemId=`),
   * else the preset's selected item, else the first record. Presets of other
   * sites are not found; failing APIs are left out (bindings show fallback).
   */
  load: async (
    presetIds: string[],
    site: ResolvedSite,
    itemId?: string
  ): Promise<ExternalApiRecordMap> => {
    const ids = [...new Set(presetIds.filter(Boolean))].slice(0, MAX_PRESETS_PER_RENDER);
    const entries = await Promise.all(
      ids.map(async id => {
        try {
          const preset = await externalApisService.getByIdForRuntime(id, site.id);
          if (!preset) return null;
          const candidates = [itemId, preset.selectedItemId ?? undefined].filter(
            (v): v is string => typeof v === 'string' && v.trim() !== ''
          );
          for (const candidate of candidates) {
            const match = await firstItem(preset, site, candidate.trim());
            if (match) return [id, match] as const;
          }
          const first = await firstItem(preset, site);
          return first ? ([id, first] as const) : null;
        } catch (error) {
          console.error('[external-api-records] could not load preset', id, error);
          return null;
        }
      })
    );
    return Object.fromEntries(entries.filter(e => e !== null)) as ExternalApiRecordMap;
  },
};
