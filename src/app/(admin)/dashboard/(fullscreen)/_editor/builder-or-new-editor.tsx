import type { BuilderPageProps } from '../pages/[id]/builder/_components/builder-adapters';
import { BuilderLoader } from '../pages/[id]/builder/_components/builder-loader';
import { loadEditorData } from './load-editor';
import { NewEditor } from './new-editor';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The Puck builder, or the new editor with `?editor=new`, for any builder
 * kind. Both take the same props; the new editor also loads block data and
 * checks the stored document on the server (R699, R744, R797).
 */
export async function BuilderOrNewEditor({
  searchParams,
  draftVersion,
  ...props
}: BuilderPageProps & { searchParams: SearchParams; draftVersion?: number }) {
  const { editor } = await searchParams;
  if (editor !== 'new') return <BuilderLoader {...props} />;
  const data = await loadEditorData({
    content: props.page.content,
    kind: props.kind ?? 'page',
    language: props.page.language,
    themeTokens: props.themeTokens,
    post: props.post,
  });
  return <NewEditor {...props} {...data} draftVersion={draftVersion} />;
}
