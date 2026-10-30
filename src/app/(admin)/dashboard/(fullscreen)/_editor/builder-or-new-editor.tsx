import type { BuilderPageProps } from '../pages/[id]/builder/_components/builder-adapters';
import { loadEditorData } from './load-editor';
import { NewEditor } from './new-editor';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function BuilderOrNewEditor({
  searchParams: _searchParams,
  draftVersion,
  ...props
}: BuilderPageProps & { searchParams: SearchParams; draftVersion?: number }) {
  const data = await loadEditorData({
    content: props.page.content,
    kind: props.kind ?? 'page',
    language: props.page.language,
    themeTokens: props.themeTokens,
    post: props.post,
  });
  return <NewEditor {...props} {...data} draftVersion={draftVersion} />;
}