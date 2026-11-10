import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanWordPressHtml,
  stripGutenbergComments,
  transformShortcodes,
} from '../html';

describe('WordPress HTML clean-up & URL rewriting', () => {
  it('strips Gutenberg block comments', () => {
    const input = `<!-- wp:paragraph {"align":"center"} -->\n<p>Hello world</p>\n<!-- /wp:paragraph -->`;
    assert.equal(stripGutenbergComments(input).trim(), '<p>Hello world</p>');
  });

  it('converts [caption] and [embed] shortcodes and drops unknown shortcodes', () => {
    const input = `[caption id="1" width="600"]<img src="https://old.com/img.jpg" alt="Pic" /> Nice view[/caption]
[embed]https://www.youtube.com/watch?v=dQw4w9WgXcQ[/embed]
[vc_row][vc_column]Kept text[/vc_column][/vc_row]
[contact-form-7 id="99"]`;

    const out = transformShortcodes(input);
    assert.ok(out.includes('<figure><img src="https://old.com/img.jpg" alt="Pic" /><figcaption>Nice view</figcaption></figure>'));
    assert.ok(out.includes('https://www.youtube.com/embed/dQw4w9WgXcQ'));
    assert.ok(out.includes('Kept text'));
    assert.equal(out.includes('vc_row'), false);
    assert.equal(out.includes('contact-form-7'), false);
  });

  it('rewrites media URLs (including thumbnail suffixes) and internal links including ?p=ID', () => {
    const maps = {
      oldSiteUrl: 'https://old.example.com',
      urlMap: new Map([
        ['https://old.example.com/wp-content/uploads/2024/05/hero.jpg', '/media/wp-import/hero.jpg'],
        ['https://old.example.com/about/', '/about'],
        ['/about', '/about'],
      ]),
      idMap: new Map([['101', '/blog/hello-world']]),
    };

    const raw = `<!-- wp:paragraph -->
<p>Read <a href="https://old.example.com/about/">About</a> and <a href="https://old.example.com/?p=101">Post</a>.</p>
<!-- /wp:paragraph -->
<img src="https://old.example.com/wp-content/uploads/2024/05/hero-800x600.jpg" alt="Hero" />
<script>alert(1)</script>`;

    const cleaned = cleanWordPressHtml(raw, maps);
    assert.ok(cleaned.includes('href="/about"'));
    assert.ok(cleaned.includes('href="/blog/hello-world"'));
    assert.ok(cleaned.includes('src="/media/wp-import/hero.jpg"'));
    assert.equal(cleaned.includes('<script>'), false);
    assert.equal(cleaned.includes('wp:paragraph'), false);
  });
});
