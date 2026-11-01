import type { BuilderPageProps } from '../pages/[id]/builder/_components/builder-adapters';
import { loadEditorData } from './load-editor';
import { NewEditor } from './new-editor';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Which editor chrome to show (B15 E6): `?shell=new` or `?shell=legacy` wins,
 * else NEXT_PUBLIC_EDITOR_UI_SHELL=1 makes the shared shell the default.
 */
function chromeFor(param: string | string[] | undefined): 'legacy' | 'shared' {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === 'new') return 'shared';
  if (value === 'legacy') return 'legacy';
  return process.env.NEXT_PUBLIC_EDITOR_UI_SHELL === '1' ? 'shared' : 'legacy';
}

/**
 * Which layout to show: `?layout=single` or `?layout=split`.
 * Defaults to the single-panel layout unless `split` is explicitly requested.
 */
function layoutFor(param: string | string[] | undefined): 'single' | 'split' {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === 'split') return 'split';
  if (value === 'single') return 'single';
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_USE_SINGLE_PANEL === '0') {
    return 'split';
  }
  return 'single';
}

export async function BuilderOrNewEditor({
  searchParams,
  draftVersion,
  ...props
}: BuilderPageProps & { searchParams: SearchParams; draftVersion?: number }) {
  const [data, params] = await Promise.all([
    loadEditorData({
      content: props.page.content,
      kind: props.kind ?? 'page',
      language: props.page.language,
      themeTokens: props.themeTokens,
      post: props.post,
    }),
    searchParams,
  ]);
  return (
    <NewEditor
      {...props}
      {...data}
      draftVersion={draftVersion}
      shell={chromeFor(params.shell)}
      layout={layoutFor(params.layout)}
    />
  );
}
