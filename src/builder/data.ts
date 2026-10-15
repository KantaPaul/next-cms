import type { EditorTypeType } from '@/db/schemas/shared.schema';

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
export const normalizeContent = (editorType: EditorTypeType, content: unknown) => {
  if (editorType === 'builder') return isBuilderData(content) ? content : emptyBuilderData();
  return typeof content === 'string' ? content : '';
};

export const createBlockId = (type: string) =>
  `${type}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
