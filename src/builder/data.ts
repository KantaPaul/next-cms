import {
  documentToPuck,
  isBuilderDocument,
} from '@nextcms/builder-core';
import type { EditorTypeType } from '@/db/schemas/shared.schema';
import {
  migrateDocumentColumns,
  migratePuckColumns,
} from './migrations/column-blocks';

export type BuilderItem = {
  type: string;
  props: Record<string, unknown> & { id: string };
};

export type BuilderData = {
  root: { props?: Record<string, unknown> };
  content: BuilderItem[];
  zones?: Record<string, BuilderItem[]>;
};

export const emptyBuilderData = (): BuilderData => ({
  root: { props: {} },
  content: [],
  zones: {},
});

export const isBuilderData = (value: unknown): value is BuilderData =>
  !!value &&
  typeof value === 'object' &&
  Array.isArray((value as BuilderData).content) &&
  typeof (value as BuilderData).root === 'object';

export const emptyContentFor = (editorType: EditorTypeType) =>
  editorType === 'builder' ? emptyBuilderData() : '';

/** Normalises stored jsonb into what each editor expects. */
export const normalizeContent = (
  editorType: EditorTypeType,
  content: unknown
) => {
  if (editorType === 'builder') {
    if (isBuilderDocument(content)) {
      return documentToPuck(migrateDocumentColumns(content), {
        slots: 'zones',
        ids: 'always',
      }) as BuilderData;
    }
    return isBuilderData(content)
      ? (migratePuckColumns(content) as BuilderData)
      : emptyBuilderData();
  }
  return typeof content === 'string' ? content : '';
};

export const createBlockId = (type: string) =>
  `${type}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
