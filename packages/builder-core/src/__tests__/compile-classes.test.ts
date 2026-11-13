import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_BREAKPOINTS } from '../fields';
import { compileStyleClasses } from '../compile-classes';
import type { StyleClass } from '../style-classes';

const now = '2026-01-01T00:00:00Z';

function cls(overrides: Partial<StyleClass>): StyleClass {
  return {
    id: 'x',
    siteId: 's1',
    name: 'x',
    kind: 'class',
    variants: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const fixture: StyleClass[] = [
  {
    id: 'tag-h1',
    siteId: 's1',
    name: 'h1',
    kind: 'tag',
    tag: 'h1',
    variants: { desktop: { fontSize: '2rem', color: '#0f172a' } },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'cls-card',
    siteId: 's1',
    name: 'card',
    kind: 'class',
    variants: {
      desktop: { backgroundColor: '#ffffff', borderRadius: '8px' },
      'tablet:hover': { backgroundColor: '#f8fafc' },
    },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'cls-btn',
    siteId: 's1',
    name: 'btn',
    kind: 'class',
    variants: {
      desktop: { color: '#4f46e5' },
      'mobile:hover:before': { content: '"hello"', color: '#dc2626' },
    },
    createdAt: now,
    updatedAt: now,
  },
];

describe('compileStyleClasses', () => {
  it('emits camelCase declarations as kebab-case CSS', () => {
    const css = compileStyleClasses({
      classes: [cls({ id: 'a', name: 'pad', variants: { desktop: { fontSize: '1rem' } } })],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.equal(css, ':where(.site-root) .c-pad{font-size:1rem;}');
  });

  it('emits tag styles before base classes', () => {
    const css = compileStyleClasses({ classes: fixture, breakpoints: DEFAULT_BREAKPOINTS });
    const tagIndex = css.indexOf(':where(.site-root) h1{');
    const cardIndex = css.indexOf(':where(.site-root) .c-card{');
    assert.ok(tagIndex >= 0);
    assert.ok(cardIndex >= 0);
    assert.ok(tagIndex < cardIndex);
  });

  it('wraps responsive variants in cascading media queries (same as block props)', () => {
    const css = compileStyleClasses({ classes: fixture, breakpoints: DEFAULT_BREAKPOINTS });
    assert.ok(
      css.includes('@media (max-width:1023px){:where(.site-root) .c-card:hover{background-color:#f8fafc;}}')
    );
    assert.ok(!css.includes('min-width:768px'));
  });

  it('emits hover state and ::before with content', () => {
    const css = compileStyleClasses({ classes: fixture, breakpoints: DEFAULT_BREAKPOINTS });
    assert.ok(css.includes(':where(.site-root) .c-btn:hover::before{color:#dc2626;content:"hello";}'));
  });

  it('skips variants on disabled devices', () => {
    const css = compileStyleClasses({
      classes: [
        cls({ id: 'a', name: 'a', variants: { desktop: { color: '#000' }, laptop: { color: '#f00' } } }),
      ],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.ok(css.includes(':where(.site-root) .c-a{color:#000;}'));
    assert.ok(!css.includes('laptop'));
    assert.ok(!css.includes('color:#f00'));
  });

  it('drops injection strings', () => {
    const css = compileStyleClasses({
      classes: [
        cls({
          id: 'a',
          name: 'a',
          variants: {
            desktop: { fontFamily: 'x; body{color:red}', backgroundColor: 'javascript:alert(1)' },
          },
        }),
      ],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.equal(css, '');
  });

  it('only emits used class ids when usedClassIds is set', () => {
    const css = compileStyleClasses({
      classes: fixture,
      usedClassIds: new Set(['cls-btn']),
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.ok(css.includes(':where(.site-root) .c-btn{color:#4f46e5;}'));
    assert.ok(!css.includes('.c-card'));
    assert.ok(!css.includes('c-h1'));
  });

  it('produces a stable snapshot for the 3-class fixture', () => {
    const css = compileStyleClasses({ classes: fixture, breakpoints: DEFAULT_BREAKPOINTS });
    assert.equal(
      css,
      ':where(.site-root) h1{color:#0f172a;font-size:2rem;}' +
        ':where(.site-root) .c-btn{color:#4f46e5;}' +
        ':where(.site-root) .c-card{background-color:#ffffff;border-radius:8px;}\n' +
        '@media (max-width:1023px){:where(.site-root) .c-card:hover{background-color:#f8fafc;}}\n' +
        '@media (max-width:767px){:where(.site-root) .c-btn:hover::before{color:#dc2626;content:"hello";}}'
    );
  });

  it('supports container query wrapping', () => {
    const css = compileStyleClasses({
      classes: [cls({ id: 'a', name: 'a', variants: { desktop: { color: '#000' } } })],
      breakpoints: DEFAULT_BREAKPOINTS,
      query: 'container',
    });
    assert.equal(css, ':where(.site-root) .c-a{color:#000;}');
  });

  it('skips variants with unknown or unsafe states', () => {
    const css = compileStyleClasses({
      classes: [
        cls({
          id: 'a',
          name: 'card',
          variants: {
            desktop: { color: '#000' },
            'desktop:bogus': { color: '#f00' },
            'desktop:nth-child(1),body *,a(1)': { display: 'none' },
          },
        }),
      ],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.equal(css, ':where(.site-root) .c-card{color:#000;}');
    assert.ok(!css.includes('body'));
  });

  it('drops content outside ::before and ::after', () => {
    const css = compileStyleClasses({
      classes: [
        cls({
          id: 'a',
          name: 'a',
          variants: { 'desktop:placeholder': { color: '#999', content: '"x"' } },
        }),
      ],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.equal(css, ':where(.site-root) .c-a::placeholder{color:#999;}');
  });

  it('lets a tablet value cascade to phones, with mobile overriding after it', () => {
    const css = compileStyleClasses({
      classes: [
        cls({
          id: 'a',
          name: 'a',
          variants: { mobile: { color: '#00f' }, tablet: { color: '#0f0' }, desktop: { color: '#000' } },
        }),
      ],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.equal(
      css,
      ':where(.site-root) .c-a{color:#000;}\n' +
        '@media (max-width:1023px){:where(.site-root) .c-a{color:#0f0;}}\n' +
        '@media (max-width:767px){:where(.site-root) .c-a{color:#00f;}}'
    );
  });

  it('orders breakpoints by cascade, not by query text, for custom widths', () => {
    const breakpoints = DEFAULT_BREAKPOINTS.map(bp =>
      bp.device === 'tablet' ? { ...bp, width: 999 } : bp.device === 'mobile' ? { ...bp, width: 480 } : bp.device === 'widescreen' ? { ...bp, enabled: true } : bp
    );
    const css = compileStyleClasses({
      classes: [
        cls({
          id: 'a',
          name: 'a',
          variants: { mobile: { color: '#3' }, widescreen: { color: '#1' }, tablet: { color: '#2' } },
        }),
      ],
      breakpoints,
    });
    const order = ['min-width:2400px', 'max-width:999px', 'max-width:480px'].map(q => css.indexOf(q));
    assert.ok(order.every(i => i >= 0), css);
    assert.deepEqual([...order].sort((x, y) => x - y), order);
  });

  it('compiles a combo class as base + combo, after base classes', () => {
    const css = compileStyleClasses({
      classes: [
        cls({ id: 'combo', name: 'is-large', comboOf: 'btn', variants: { desktop: { padding: '24px' } } }),
        cls({ id: 'btn', name: 'button', variants: { desktop: { padding: '12px' } } }),
      ],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.equal(css, ':where(.site-root) .c-button{padding:12px;}:where(.site-root) .c-is-large:where(.c-button){padding:24px;}');
  });

  it('skips a combo whose base is missing or is itself a combo', () => {
    const css = compileStyleClasses({
      classes: [
        cls({ id: 'orphan', name: 'orphan', comboOf: 'gone', variants: { desktop: { color: '#f00' } } }),
        cls({ id: 'b', name: 'b', variants: { desktop: { color: '#000' } } }),
        cls({ id: 'c1', name: 'c1', comboOf: 'b', variants: { desktop: { color: '#111' } } }),
        cls({ id: 'c2', name: 'c2', comboOf: 'c1', variants: { desktop: { color: '#222' } } }),
      ],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.equal(css, ':where(.site-root) .c-b{color:#000;}:where(.site-root) .c-c1:where(.c-b){color:#111;}');
  });

  it('emits a used combo even when only its id is in usedClassIds', () => {
    const classes = [
      cls({ id: 'btn', name: 'button', variants: { desktop: { padding: '12px' } } }),
      cls({ id: 'combo', name: 'is-large', comboOf: 'btn', variants: { desktop: { padding: '24px' } } }),
    ];
    const css = compileStyleClasses({ classes, usedClassIds: new Set(['combo']), breakpoints: DEFAULT_BREAKPOINTS });
    assert.equal(css, ':where(.site-root) .c-is-large:where(.c-button){padding:24px;}');
  });

  it('drops classes and tags whose names are unsafe in a selector', () => {
    const css = compileStyleClasses({
      classes: [
        cls({ id: 'a', name: 'x{}body', variants: { desktop: { color: '#f00' } } }),
        cls({ id: 't', name: 't', kind: 'tag', tag: 'h1,body', variants: { desktop: { color: '#f00' } } }),
        cls({ id: 'ok', name: 'ok', variants: { desktop: { color: '#000' } } }),
      ],
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    assert.equal(css, ':where(.site-root) .c-ok{color:#000;}');
  });

  it('wraps container queries without doubling parentheses', () => {
    const css = compileStyleClasses({
      classes: [cls({ id: 'a', name: 'a', variants: { tablet: { color: '#000' } } })],
      breakpoints: DEFAULT_BREAKPOINTS,
      query: 'container',
    });
    assert.equal(css, '@container canvas (max-width:1023px){:where(.site-root) .c-a{color:#000;}}');
  });
});
