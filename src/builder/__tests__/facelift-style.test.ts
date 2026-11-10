/**
 * Public-site face-lift: style resolver fixes and theme token output.
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/facelift-style.test.ts
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { cardClass } from '../blocks/section';
import { readingMinutes } from '../blocks/blog';
import { animationSchema, sectionSettingsSchema } from '../schemas/style.schema';
import { siteModeScript } from '../site-mode';
import { resolveElementStyle, resolveSectionStyle } from '../style';
import { themeStyle } from '../theme';
import { QUIET_EDITORIAL_THEME } from '../theme-presets';

describe('border style and radius', () => {
  it('section border emits s-bd-<style>, which site.css defines', () => {
    const r = resolveSectionStyle({
      border: {
        style: 'dashed',
        width: { desktop: { top: 1, right: 1, bottom: 1, left: 1 } },
      },
    });
    assert.ok(r.outerClasses.includes('s-bd-dashed'));
    assert.ok(!r.outerClasses.includes('s-bd'));
  });

  it('element border emits s-bd-<style>', () => {
    const r = resolveElementStyle({ border: { style: 'solid' } });
    assert.ok(r.classes.includes('s-bd-solid'));
  });

  it('radius uses s-rad / --s-rad-*, not s-br (right border width)', () => {
    const r = resolveSectionStyle({ border: { radius: { desktop: 12 } } });
    assert.ok(r.outerClasses.includes('s-rad'));
    assert.ok(!r.outerClasses.includes('s-br'));
    assert.equal((r.style as Record<string, string>)['--s-rad-d'], '12px');
    // Inherited by tablet and mobile instead of collapsing to 0.
    assert.equal((r.style as Record<string, string>)['--s-rad-t'], '12px');
    assert.equal((r.style as Record<string, string>)['--s-rad-m'], '12px');
    assert.equal((r.style as Record<string, string>)['--s-br-d'], undefined);
  });

  it('a right border width keeps s-br alongside the radius', () => {
    const r = resolveElementStyle({
      border: {
        style: 'solid',
        width: { desktop: { right: 2 } },
        radius: { desktop: 8 },
      },
    });
    assert.ok(r.classes.includes('s-br'));
    assert.ok(r.classes.includes('s-rad'));
    assert.equal((r.style as Record<string, string>)['--s-br-d'], '2px');
    assert.equal((r.style as Record<string, string>)['--s-rad-d'], '8px');
  });
});

describe('section filters', () => {
  it('reads a flat filter and a hover filter', () => {
    const r = resolveSectionStyle({
      filter: { grayscale: 100 },
      hover: { filter: { grayscale: 0 } },
    });
    assert.ok(r.outerClasses.includes('s-filter'));
    assert.ok(r.outerClasses.includes('s-hfl'));
  });

  it('accepts the legacy { normal, hover } shape saved by the old control', () => {
    const r = resolveSectionStyle({
      filter: { normal: { blur: 2 }, hover: { blur: 0, brightness: 120 } },
    } as never);
    assert.match((r.style as Record<string, string>)['--s-filter'] ?? '', /blur\(2px\)/);
    assert.ok(r.outerClasses.includes('s-hfl'));
  });
});

describe('animation schema', () => {
  it('accepts the milliseconds the motion control saves', () => {
    assert.ok(
      animationSchema.safeParse({ duration: 600, delay: 150, stagger: 80 })
        .success
    );
  });
  it('rejects out-of-range values', () => {
    assert.ok(!animationSchema.safeParse({ duration: 9000 }).success);
    assert.ok(!animationSchema.safeParse({ stagger: 5000 }).success);
  });
});

describe('new style controls', () => {
  it('typography preset points at the theme preset vars', () => {
    const r = resolveElementStyle({ typography: { preset: 'h2' } });
    assert.ok(r.classes.includes('s-tp'));
    assert.equal((r.style as Record<string, string>)['--s-tp-font'], 'var(--site-type-h2-font)');
    assert.match((r.style as Record<string, string>)['--s-tp-size-m'] ?? '', /--site-type-h2-size-m/);
  });

  it('typography preset ids are sanitised', () => {
    const r = resolveElementStyle({
      typography: { preset: 'h2);color:red' },
    });
    assert.equal((r.style as Record<string, string>)['--s-tp-font'], 'var(--site-type-h2colorred-font)');
  });

  it('backdrop blur and hover scale / opacity', () => {
    const r = resolveSectionStyle({
      backdropBlur: 12,
      hover: { scale: 1.02, opacity: 0.8 },
    });
    assert.ok(r.outerClasses.includes('s-backdrop'));
    assert.equal((r.style as Record<string, string>)['--s-blur'], '12px');
    assert.ok(r.outerClasses.includes('s-hscale'));
    assert.equal((r.style as Record<string, string>)['--s-h-scale'], '1.02');
    assert.ok(r.outerClasses.includes('s-hop'));
  });

  it('schema accepts the new section settings', () => {
    assert.ok(
      sectionSettingsSchema.safeParse({
        backdropBlur: 20,
        typography: { preset: 'eyebrow' },
        hover: { scale: 1.05 },
      }).success
    );
  });

  it('card "default" keeps a block’s original classes', () => {
    assert.equal(cardClass({}, 'legacy-classes'), 'legacy-classes');
    assert.match(cardClass({ cardVariant: 'glass' }), /s-card-glass/);
    assert.match(cardClass({ cardHover: true }), /s-hover-lift/);
  });
});

describe('theme tokens', () => {
  it('emits dark palette, heading font and button radius', () => {
    const vars = themeStyle(QUIET_EDITORIAL_THEME) as Record<string, string>;
    assert.equal(vars['--site-color-background'], '#fef9f1');
    assert.equal(vars['--site-color-background-dark'], '#0e1513');
    assert.equal(vars['--site-color-surface-alt'], '#f2ede6');
    assert.match(vars['--site-font-heading'], /Newsreader/);
    assert.equal(vars['--site-btn-radius'], '9999px');
    // Primary is derived in CSS so dark mode can swap it.
    assert.equal(vars['--site-primary'], undefined);
  });

  it('emits per-device preset sizes', () => {
    const vars = themeStyle(QUIET_EDITORIAL_THEME) as Record<string, string>;
    assert.equal(vars['--site-type-h1-size'], '3rem');
    assert.equal(vars['--site-type-h1-size-t'], '2.5rem');
    assert.equal(vars['--site-type-h1-size-m'], '2.125rem');
    assert.equal(vars['--site-type-body-size-m'], '1rem');
  });

  it('ignores heading fonts outside the curated list', () => {
    const vars = themeStyle({
      ...QUIET_EDITORIAL_THEME,
      headingFont: "x'; background:url(//evil)",
    }) as Record<string, string>;
    assert.ok(!vars['--site-font-heading'].includes('evil'));
  });

  it('ignores non-hex dark colours', () => {
    const vars = themeStyle({
      ...QUIET_EDITORIAL_THEME,
      colorsDark: { background: 'red;}' },
    }) as Record<string, string>;
    assert.equal(vars['--site-color-background-dark'], undefined);
  });
});

describe('helpers', () => {
  it('reading time', () => {
    assert.equal(readingMinutes(''), 0);
    assert.equal(readingMinutes('<p>one two</p>'), 1);
    assert.equal(readingMinutes(`<p>${'word '.repeat(880)}</p>`), 4);
  });

  it('site mode script only embeds the mode keyword', () => {
    const js = siteModeScript('system');
    assert.match(js, /"system"==='system'/);
    assert.match(js, /data-site-mode/);
  });
});

describe('header column widths', () => {
  it('builds a grid template from per-column widths', async () => {
    const { headerGridTemplate } = await import('../blocks/header-grid');
    assert.equal(
      headerGridTemplate([{ width: 'auto' }, { width: 'fill' }, { width: 'auto' }]),
      'auto minmax(0,1fr) auto'
    );
    assert.equal(
      headerGridTemplate([{ width: 'custom', size: '240px' }, { width: 'custom', size: '2fr' }]),
      '240px 2fr'
    );
  });

  it('drops invalid custom sizes', async () => {
    const { headerGridTemplate } = await import('../blocks/header-grid');
    assert.equal(
      headerGridTemplate([{ width: 'custom', size: '1px);background:red' }, { width: 'custom', size: '' }]),
      'minmax(0,1fr) minmax(0,1fr)'
    );
  });
});

describe('query loop built-in filters', () => {
  it('maps prefixed props back to filter options with defaults', async () => {
    const { unprefixFilterOptions, prefixedFilterKey } = await import(
      '../definitions/query-filter-fields'
    );
    assert.equal(prefixedFilterKey('showKeyword'), 'filterShowKeyword');
    const opts = unprefixFilterOptions({ filterShowTags: false, filterCategoryStyle: 'chips' });
    assert.equal(opts.showTags, false);
    assert.equal(opts.categoryStyle, 'chips');
    assert.equal(opts.showKeyword, true);
    assert.equal(opts.applyButtonLabel, 'Apply filters');
  });
});

describe('single page extras', () => {
  it('adds previous / next before related posts, once', async () => {
    const { defaultPostTemplate, withSingleExtras } = await import('../post-template');
    const bare = { root: { props: {} }, content: [{ type: 'PostContent', props: { id: 'a' } }, { type: 'RelatedPosts', props: { id: 'b' } }], zones: {} };
    const out = withSingleExtras(bare as never, { postNavigation: 'auto', share: false, bookmark: false });
    assert.deepEqual(out.content.map(n => n.type), ['PostContent', 'PostNavigation', 'RelatedPosts']);
    // Templates that already place it keep their own.
    const tpl = defaultPostTemplate();
    assert.equal(withSingleExtras(tpl, { postNavigation: 'auto', share: false, bookmark: false }), tpl);
    assert.equal(withSingleExtras(bare as never, { postNavigation: 'off', share: false, bookmark: false }), bare);
  });

  it('adds comments only when switched on', async () => {
    const { withSingleExtras } = await import('../post-template');
    const bare = { root: { props: {} }, content: [], zones: { 'x:y': [{ type: 'PostNavigation', props: { id: 'n' } }] } };
    assert.deepEqual(
      withSingleExtras(bare as never, { postNavigation: 'auto', comments: true, share: false, bookmark: false }).content.map(n => n.type),
      ['Comments']
    );
    assert.equal(withSingleExtras(bare as never, { postNavigation: 'auto', comments: false, share: false, bookmark: false }), bare);
  });

  it('adds one share + bookmark row after the article body', async () => {
    const { withSingleExtras } = await import('../post-template');
    const bare = { root: { props: {} }, content: [{ type: 'PostTitle', props: { id: 't' } }, { type: 'PostContent', props: { id: 'c' } }, { type: 'RelatedPosts', props: { id: 'r' } }], zones: {} };
    const out = withSingleExtras(bare as never, { postNavigation: 'off' });
    assert.deepEqual(out.content.map(n => n.type), ['PostTitle', 'PostContent', 'ShareButtons', 'RelatedPosts']);
    const row = out.content[2].props as Record<string, unknown>;
    assert.equal(row.networks, 'default');
    assert.equal(row.showBookmark, true);
  });

  it('only adds what the template is missing', async () => {
    const { withSingleExtras } = await import('../post-template');
    const withShare = { root: { props: {} }, content: [{ type: 'PostContent', props: { id: 'c' } }, { type: 'ShareButtons', props: { id: 's' } }], zones: {} };
    const out = withSingleExtras(withShare as never, { postNavigation: 'off' });
    const added = out.content.filter(n => n.props.id === 'ShareButtons-auto');
    assert.equal(added.length, 1);
    assert.equal((added[0].props as Record<string, unknown>).networks, 'none');
    const both = { root: { props: {} }, content: [{ type: 'ShareButtons', props: { id: 's', showBookmark: true } }], zones: {} };
    assert.equal(withSingleExtras(both as never, { postNavigation: 'off' }), both);
    assert.equal(withSingleExtras(withShare as never, { postNavigation: 'off', bookmark: false }), withShare);
  });
});

describe('comment rules', () => {
  const post = { id: 'p1', published: true, allowComments: true };
  const base = { post, commentsEnabled: true, parent: null, recentFromIp: 0 };
  const ok = { honeypot: false, turnstileOk: true };

  it('accepts a comment as pending', async () => {
    const { decideComment } = await import('@/server/services/comments.rules');
    assert.deepEqual(decideComment({ postId: 'p1' }, base, ok), { ok: true, status: 'pending' });
  });

  it('rejects closed posts and site-wide off', async () => {
    const { decideComment } = await import('@/server/services/comments.rules');
    assert.equal(decideComment({ postId: 'p1' }, { ...base, post: { ...post, allowComments: false } }, ok).ok, false);
    assert.equal(decideComment({ postId: 'p1' }, { ...base, commentsEnabled: false }, ok).ok, false);
    assert.equal(decideComment({ postId: 'p1' }, { ...base, post: null }, ok).ok, false);
  });

  it('supports multi-nested replies on approved comments of the same post', async () => {
    const { decideComment } = await import('@/server/services/comments.rules');
    const top = { postId: 'p1', parentId: null, status: 'approved' };
    assert.equal(decideComment({ postId: 'p1', parentId: 'c1' }, { ...base, parent: top }, ok).ok, true);
    const reply = { ...top, parentId: 'c0' };
    assert.equal(decideComment({ postId: 'p1', parentId: 'c2' }, { ...base, parent: reply }, ok).ok, true);
    assert.equal(decideComment({ postId: 'p1', parentId: 'c2' }, { ...base, parent: { ...reply, status: 'pending' } }, ok).ok, false);
    assert.equal(decideComment({ postId: 'p1', parentId: 'c1' }, { ...base, parent: { ...top, postId: 'other' } }, ok).ok, false);
  });

  it('supports collection entry targets and replies via collectionEntryId', async () => {
    const { commentInputSchema, decideComment } = await import('@/server/services/comments.rules');
    const parsed = commentInputSchema.parse({
      postId: 'e1',
      targetKind: 'entry',
      authorName: 'Sam',
      authorEmail: 'sam@example.com',
      body: 'Great showcase item!',
    });
    assert.equal(parsed.targetKind, 'entry');

    const top = { postId: null, collectionEntryId: 'e1', parentId: null, status: 'approved' };
    assert.equal(
      decideComment({ postId: 'e1', targetKind: 'entry', parentId: 'c1' }, { ...base, post: { id: 'e1', published: true, allowComments: true }, parent: top }, ok).ok,
      true
    );
    assert.equal(
      decideComment({ postId: 'e1', targetKind: 'entry', parentId: 'c1' }, { ...base, post: { id: 'e1', published: true, allowComments: true }, parent: { ...top, collectionEntryId: 'other' } }, ok).ok,
      false
    );
  });

  it('marks honeypot spam and rate-limits the sixth comment', async () => {
    const { decideComment, COMMENT_RATE_LIMIT } = await import('@/server/services/comments.rules');
    assert.deepEqual(decideComment({ postId: 'p1' }, base, { honeypot: true, turnstileOk: false }), { ok: true, status: 'spam' });
    const limited = decideComment({ postId: 'p1' }, { ...base, recentFromIp: COMMENT_RATE_LIMIT }, ok);
    assert.equal(limited.ok, false);
    assert.equal(!limited.ok && limited.status, 429);
  });

  it('auto-approves comments from site admins/moderators unless flagged as honeypot spam', async () => {
    const { decideComment, COMMENT_RATE_LIMIT } = await import('@/server/services/comments.rules');
    assert.deepEqual(
      decideComment({ postId: 'p1' }, { ...base, recentFromIp: COMMENT_RATE_LIMIT }, { ...ok, autoApprove: true }),
      { ok: true, status: 'approved' }
    );
    assert.deepEqual(
      decideComment({ postId: 'p1' }, base, { honeypot: true, turnstileOk: false, autoApprove: true }),
      { ok: true, status: 'spam' }
    );
  });
});

describe('comment reactions', () => {
  const comment = { status: 'approved', voterHash: 'v-author', ipHash: 'ip-author' };

  it('allows other visitors to react', async () => {
    const { decideReaction } = await import('@/server/services/comments.rules');
    assert.deepEqual(decideReaction(comment, { voterHash: 'v-other', ipHash: 'ip-other' }, true), { ok: true });
  });

  it('blocks liking or disliking your own comment', async () => {
    const { decideReaction } = await import('@/server/services/comments.rules');
    const sameCookie = decideReaction(comment, { voterHash: 'v-author', ipHash: 'ip-other' }, true);
    assert.equal(sameCookie.ok, false);
    assert.equal(!sameCookie.ok && sameCookie.status, 403);
    // Clearing cookies doesn't help: same network as the comment.
    assert.equal(decideReaction(comment, { voterHash: 'v-new', ipHash: 'ip-author' }, true).ok, false);
    // Logged-in user cannot react to their own comment/reply even with a different cookie/IP.
    const userComment = {
      status: 'approved',
      voterHash: null,
      ipHash: null,
      userId: 'user-1',
      authorEmail: 'admin@example.com',
    };
    const byUserId = decideReaction(
      userComment,
      { voterHash: 'v-other', ipHash: 'ip-other', userId: 'user-1', userEmail: 'other@example.com' },
      true
    );
    assert.equal(byUserId.ok, false);
    assert.equal(!byUserId.ok && byUserId.status, 403);
    const byEmail = decideReaction(
      userComment,
      { voterHash: 'v-other', ipHash: 'ip-other', userId: 'user-2', userEmail: 'ADMIN@EXAMPLE.COM' },
      true
    );
    assert.equal(byEmail.ok, false);
    assert.equal(!byEmail.ok && byEmail.status, 403);
  });

  it('rejects unapproved comments and closed posts', async () => {
    const { decideReaction } = await import('@/server/services/comments.rules');
    const r = { voterHash: 'v-other', ipHash: 'ip-other' };
    assert.equal(decideReaction({ ...comment, status: 'pending' }, r, true).ok, false);
    assert.equal(decideReaction(null, r, true).ok, false);
    assert.equal(decideReaction(comment, r, false).ok, false);
  });
});

describe('bookmark alignment and long comment body', () => {
  it('supports right alignment on BookmarkButtonBlock and BookmarkButton', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { BookmarkButtonBlock } = await import('../definitions/native');
    const { BookmarkButton } = await import('../blocks/post-extras');
    const { ConsentProvider } = await import('@/components/site/consent-provider');
    const { SAMPLE_POST } = await import('../post-template');

    const alignField = BookmarkButtonBlock.fields?.align;
    assert.equal(alignField?.type, 'radio');
    assert.ok(
      alignField?.type === 'radio' &&
        alignField.options.some(o => o.value === 'right' && o.label === 'Right')
    );

    const html = renderToStaticMarkup(
      createElement(ConsentProvider, {
        settings: null,
        initialCookie: null,
        children: createElement(BookmarkButton, {
          post: SAMPLE_POST,
          align: 'right',
        }),
      })
    );
    assert.ok(html.includes('justify-end'));
  });

  it('clamps CommentBody for visitors and shows full paragraphs in editing mode', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { CommentBody } = await import('../blocks/comments-client');

    const longText = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const liveHtml = renderToStaticMarkup(
      createElement(CommentBody, { text: longText })
    );
    assert.ok(liveHtml.includes('line-clamp-5'));

    const editHtml = renderToStaticMarkup(
      createElement(CommentBody, { text: longText, editing: true })
    );
    assert.ok(!editHtml.includes('line-clamp-5'));
    assert.ok(editHtml.includes('First paragraph.'));
    assert.ok(editHtml.includes('Second paragraph.'));
  });

  it('renders multi-nested comment threads and counts all nested replies', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { Comments } = await import('../blocks/comments');
    const { SAMPLE_POST } = await import('../post-template');

    const now = new Date('2026-01-16T10:00:00Z').toISOString();
    const html = renderToStaticMarkup(
      createElement(Comments, {
        post: SAMPLE_POST,
        showForm: false,
        comments: [
          {
            id: 'c1',
            authorName: 'Level 0',
            authorUrl: null,
            isStaff: false,
            body: 'Root comment',
            createdAt: now,
            replies: [
              {
                id: 'c2',
                authorName: 'Level 1',
                authorUrl: null,
                isStaff: false,
                body: 'First reply',
                createdAt: now,
                replies: [
                  {
                    id: 'c3',
                    authorName: 'Level 2',
                    authorUrl: null,
                    isStaff: true,
                    body: 'Nested reply',
                    createdAt: now,
                    replies: [],
                  },
                ],
              },
            ],
          },
        ],
      })
    );

    assert.ok(html.includes('(3)'));
    assert.ok(html.includes('Root comment'));
    assert.ok(html.includes('First reply'));
    assert.ok(html.includes('Nested reply'));
  });
});
