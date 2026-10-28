import type { Metadata } from 'next';
import { PAGES } from '@/config/pages';
import { searchIndex } from '@/server/services/search.service';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  const results = query ? await searchIndex.search({ q: query }) : [];
  const site = await siteContext.publicSite();
  const siteSlug = siteSlugPrefix(site);

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Search</h1>
      <form action="/search" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search pages and posts"
          className="s-input"
        />
        <button type="submit" className="s-btn s-btn-primary">
          Search
        </button>
      </form>
      {query && results.length === 0 && <p className="s-muted">No matches.</p>}
      <ul className="grid gap-4">
        {results.map(result => (
          <li key={`${result.kind}-${result.path}`}>
            <a href={result.path} className="font-medium hover:underline">
              {result.title}
            </a>
            <p className="s-muted text-sm">{result.path}</p>
            {result.snippet && <p className="text-sm">{result.snippet}</p>}
          </li>
        ))}
      </ul>
      <p className="s-muted text-sm">
        <a href={PAGES.SITE.page('', 'en', true, 'en', siteSlug)}>Back home</a>
      </p>
    </main>
  );
}
