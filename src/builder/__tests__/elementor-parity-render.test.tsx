/**
 * Render-level checks for the Elementor-parity widgets: real breadcrumbs,
 * hydration-safe countdown, site-theme colors, font escaping and Google Fonts
 * filtering, background parallax, and custom CSS ids that never leak into saves.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Breadcrumbs } from '../blocks/breadcrumbs';
import { Countdown } from '../blocks/countdown-client';
import { Section } from '../blocks/section';
import { TableOfContents } from '../blocks/toc-client';
import { FlipBox } from '../blocks/flip-box';
import { buildCustomFontsCss, isCuratedGoogleFont } from '../fonts';
import { fontStylesheetUrl } from '../theme';
import { cmsTransformProps } from '../renderer';

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(el);

describe('Breadcrumbs', () => {
  it('shows the real page title and publishes it as JSON-LD', () => {
    const out = html(createElement(Breadcrumbs, { page: { title: 'Pricing' } }));
    assert.match(out, /Pricing/);
    assert.doesNotMatch(out, /Current Page|Parent Page/);
    assert.match(out, /"@type":"BreadcrumbList"/);
  });

  it('shows a sample trail without context and publishes no JSON-LD for it', () => {
    const out = html(createElement(Breadcrumbs, {}));
    assert.match(out, /Current Page/);
    assert.doesNotMatch(out, /application\/ld\+json/);
  });

  it('escapes < in JSON-LD so a title cannot close the script tag', () => {
    const out = html(
      createElement(Breadcrumbs, { page: { title: '</script><img src=x>' } })
    );
    const script = out.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1] ?? '';
    assert.ok(script.length > 0);
    assert.doesNotMatch(script, /<\/script|<img/);
  });

  it('gets the page from render metadata on pages and the post on posts', () => {
    const node = { id: 'b1', type: 'Breadcrumbs', props: {} } as never;
    const onPage = cmsTransformProps({ page: { title: 'About' } }, 'page')(node, {});
    assert.deepEqual(onPage.page, { title: 'About' });
    const noPost = cmsTransformProps({}, 'post')(node, {});
    assert.equal(noPost.post, undefined, 'never the sample post');
  });
});

describe('Countdown', () => {
  it('renders stable placeholders on the server so hydration matches', () => {
    const a = html(createElement(Countdown, { type: 'due_date', dueDate: '2099-01-01' }));
    const b = html(createElement(Countdown, { type: 'due_date', dueDate: '2099-01-01' }));
    assert.equal(a, b);
    assert.match(a, /--/);
  });
});

describe('Site theme colors', () => {
  it('new widgets use site tokens, not admin dark: classes', () => {
    const toc = html(createElement(TableOfContents, {}));
    const flip = html(createElement(FlipBox, {}));
    for (const out of [toc, flip]) {
      assert.doesNotMatch(out, /\bdark:/);
      assert.doesNotMatch(out, /text-foreground|bg-white\b|steel-\d/);
    }
  });
});

describe('Custom fonts', () => {
  it('escapes font values and maps ttf/otf formats', () => {
    const css = buildCustomFontsCss([
      {
        family: "Evil'</style><script>",
        weights: [
          { weight: '400;color:red', mediaKey: '/media/a.ttf' },
          { weight: '700', style: 'italic', mediaKey: '/media/b.otf' },
        ],
      },
    ]);
    assert.doesNotMatch(css, /<|>|color:red/);
    assert.match(css, /format\('truetype'\)/);
    assert.match(css, /format\('opentype'\)/);
    assert.match(css, /font-weight: 400;/);
    assert.match(css, /font-style: italic;/);
  });

  it('never asks Google Fonts for an uploaded font found in page content', () => {
    assert.equal(isCuratedGoogleFont('My Upload'), false);
    assert.equal(isCuratedGoogleFont('Inter'), true);
    const url = fontStylesheetUrl({} as never, ['My Upload', 'Inter']) ?? '';
    assert.doesNotMatch(decodeURIComponent(url), /My Upload/);
  });
});

describe('Section', () => {
  it('background parallax moves the image to its own layer', () => {
    const out = html(
      createElement(
        Section,
        {
          section: {
            fill: { type: 'image', image: 'https://example.com/a.jpg', parallax: true },
          },
          children: 'x',
        }
      )
    );
    assert.match(out, /data-bg-parallax/);
    assert.match(out, /isolate/);
    // Only the layer carries the image; the section itself paints none.
    assert.equal(out.match(/example\.com\/a\.jpg/g)?.length, 1);
  });
});
