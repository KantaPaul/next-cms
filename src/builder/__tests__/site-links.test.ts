import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { BuilderDocument } from '@nextcms/builder-core';
import { contentHref } from '@/lib/utils/site-href';
import { prefixDocumentLinks, prefixHtmlLinks } from '../site-links';

describe('contentHref', () => {
  it('prefixes root-relative links', () => {
    assert.equal(contentHref('/about', 'main'), '/main/about');
    assert.equal(contentHref('/', 'main'), '/main');
    assert.equal(contentHref('/blog/post?x=1#top', 'main'), '/main/blog/post?x=1#top');
  });

  it('does nothing without a slug (host routing)', () => {
    assert.equal(contentHref('/about'), '/about');
  });

  it('leaves external, relative, hash, and already-prefixed links alone', () => {
    for (const href of ['https://x.com/a', '//x.com/a', 'mailto:a@b.c', '#top', 'about', '/main', '/main/about']) {
      assert.equal(contentHref(href, 'main'), href);
    }
  });

  it('leaves app routes and files alone', () => {
    for (const href of ['/api/media/a.png', '/dashboard', '/login', '/docs/user-guide.pdf', '/robots.txt']) {
      assert.equal(contentHref(href, 'main'), href);
    }
  });
});

describe('prefixDocumentLinks', () => {
  const doc = {
    version: 1,
    root: { props: {} },
    rootSlot: ['a', 'b', 'c'],
    nodes: {
      a: { id: 'a', type: 'Hero', props: { title: '/not-a-link', primaryButtonLink: '/contact', imageUrl: 'https://img.test/a.jpg' }, slots: {} },
      b: { id: 'b', type: 'RichText', props: { content: '<p><a href="/pricing">Pricing</a> <a href=\'https://x.com\'>X</a></p>' }, slots: {} },
      c: { id: 'c', type: 'NavMenu', props: { menu: { items: [{ label: 'Blog', url: '/blog', children: [{ url: '/blog/a' }] }] } }, slots: {} },
    },
  } as unknown as BuilderDocument;

  const out = prefixDocumentLinks(doc, 'main');
  const props = (id: string) => out.nodes[id].props as Record<string, any>;

  it('prefixes link props but not other strings', () => {
    assert.equal(props('a').primaryButtonLink, '/main/contact');
    assert.equal(props('a').title, '/not-a-link');
    assert.equal(props('a').imageUrl, 'https://img.test/a.jpg');
  });

  it('prefixes internal hrefs inside rich text', () => {
    assert.equal(props('b').content, '<p><a href="/main/pricing">Pricing</a> <a href=\'https://x.com\'>X</a></p>');
  });

  it('prefixes nested menu items loaded into props', () => {
    assert.equal(props('c').menu.items[0].url, '/main/blog');
    assert.equal(props('c').menu.items[0].children[0].url, '/main/blog/a');
  });

  it('does not change the input document', () => {
    assert.equal((doc.nodes.a.props as any).primaryButtonLink, '/contact');
  });
});

describe('prefixHtmlLinks', () => {
  it('prefixes internal hrefs and keeps the rest of the markup', () => {
    assert.equal(
      prefixHtmlLinks('<a href="/components">C</a> <a href="/docs/user-guide.pdf">PDF</a>', 'main'),
      '<a href="/main/components">C</a> <a href="/docs/user-guide.pdf">PDF</a>'
    );
  });
});
