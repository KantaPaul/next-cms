import 'server-only';
import {
  readMediaFieldConfig,
  readTextFieldMode,
  readUrlFieldMode,
} from '@/config/post-types';
import type { collectionFields } from '@/db/schema';
import { collectionsService } from '@/server/services/collections.service';
import type { EntryFieldConfig } from '../components/entry-data-fields';

/** Field rows → entry form configs, with select choices and relation options. */
export async function toEntryFieldConfigs(
  fields: (typeof collectionFields.$inferSelect)[]
): Promise<EntryFieldConfig[]> {
  return Promise.all(
    fields.map(async f => {
      const config = (f.config ?? {}) as {
        choices?: unknown;
        collectionId?: unknown;
      };
      const base: EntryFieldConfig = {
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
      };
      if (f.type === 'media') {
        const mediaMeta = readMediaFieldConfig(f.config);
        if (mediaMeta.multiple) base.multiple = true;
        if (mediaMeta.isFeatured) base.isFeatured = true;
      }
      if (f.type === 'text') {
        base.textMode = readTextFieldMode(f.config);
      }
      if (f.type === 'url') {
        base.urlMode = readUrlFieldMode(f.config);
      }
      if (f.type === 'select' && Array.isArray(config.choices)) {
        base.choices = config.choices.map(String);
      }
      if (f.type === 'relation' && typeof config.collectionId === 'string') {
        base.options = await collectionsService
          .listEntryOptions(config.collectionId)
          .catch(() => []);
      }
      return base;
    })
  );
}
