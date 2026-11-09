/**
 * Unit tests for Elementor-parity widgets, custom CSS scoping & sanitization,
 * motion effects math, countdown/counter logic, and custom fonts.
 *
 * Run with: pnpm exec tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/elementor-parity.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { builtInComponents, getBlockComponents } from '../blocks/registry';
import { pageBlockGroups } from '../definitions';
import { NATIVE_BLOCKS } from '../definitions/native';
import { sanitizeCss } from '../sanitize';
import { computeCounterStep, formatCounterValue } from '../blocks/counter-client';
import { calculateTimeRemaining, getEvergreenTarget } from '../blocks/countdown-client';
import {
  calculateScrollProgress,
  computeMouseTrackOffset,
  computeParallaxOffset,
  computeScrollTransform,
} from '../motion-effects-client';
import {
  buildCustomFontsCss,
  getAvailableFontFamilies,
  isGoogleFont,
  type CustomFont,
} from '../fonts';

describe('Custom CSS sanitization & selector scoping', () => {
  it('strips </style> tags safely regardless of case or spaces', () => {
    const malicious = 'color: red; </style><script>alert(1)</script>';
    const sanitized = sanitizeCss(malicious);
    assert.ok(!sanitized.includes('</style>'));
    assert.ok(!sanitized.includes('</STYLE>'));
    assert.ok(!sanitized.includes('</ style>'));

    const spaced = 'color: blue; </ style > body { display: none }';
    assert.ok(!sanitizeCss(spaced).includes('</'));
  });

  it('strips @import directives', () => {
    const malicious = '@import url("https://evil.com/leak.css"); selector { color: red; }';
    const sanitized = sanitizeCss(malicious);
    assert.ok(!sanitized.includes('@import'));
    assert.ok(sanitized.includes('selector { color: red; }'));
  });

  it('strips javascript: urls and expressions', () => {
    const malicious = 'background: url(javascript:alert(1)); width: expression(document.body.clientWidth);';
    const sanitized = sanitizeCss(malicious);
    assert.ok(!sanitized.includes('javascript:'));
    assert.ok(!sanitized.includes('expression('));
  });

  it('scopes selector to [data-el="<id>"] without corrupting class names', () => {
    const css = 'selector { outline: 2px solid red; } selector:hover { opacity: 0.8; } .selector-btn { color: green; }';
    const id = 'blk-999';
    const scoped = css.replace(/(^|[^_a-zA-Z0-9-])selector(?=[^_a-zA-Z0-9-]|$)/g, `$1[data-el="${id}"]`);

    assert.ok(scoped.includes('[data-el="blk-999"] { outline: 2px solid red; }'));
    assert.ok(scoped.includes('[data-el="blk-999"]:hover { opacity: 0.8; }'));
    // .selector-btn should remain untouched
    assert.ok(scoped.includes('.selector-btn { color: green; }'));
    assert.ok(!scoped.includes('[data-el="blk-999"]-btn'));
  });
});

describe('Counter pure functions', () => {
  it('formats counter value with prefix, suffix, and separator', () => {
    assert.equal(formatCounterValue(1500, ',', '$', '/mo'), '$1,500/mo');
    assert.equal(formatCounterValue(1500, '', '$', '/mo'), '$1500/mo');
    assert.equal(formatCounterValue(99, '', '', '%'), '99%');
    assert.equal(formatCounterValue(0, ',', '+', ''), '+0');
  });

  it('computes counter step interpolation properly', () => {
    // At t=0 (progress=0), should be start value
    assert.equal(computeCounterStep(0, 100, 0), 0);
    // At t=1 (progress=1), should reach end value
    assert.equal(computeCounterStep(0, 100, 1), 100);
    // Intermediate with easeOutQuad
    const mid = computeCounterStep(0, 100, 0.5);
    assert.ok(mid > 50 && mid < 100);
    // Negative to positive
    assert.equal(computeCounterStep(-50, 50, 1), 50);
  });
});

describe('Countdown pure functions', () => {
  it('calculates time remaining accurately', () => {
    const now = Date.now();
    // 1 day, 2 hours, 3 minutes, 4 seconds from now
    const target = now + (24 * 3600 + 2 * 3600 + 3 * 60 + 4) * 1000;
    const remaining = calculateTimeRemaining(target, now);

    assert.equal(remaining.days, 1);
    assert.equal(remaining.hours, 2);
    assert.equal(remaining.minutes, 3);
    assert.equal(remaining.seconds, 4);
    assert.equal(remaining.isExpired, false);
  });

  it('flags isExpired when target is in the past', () => {
    const now = Date.now();
    const past = now - 5000;
    const remaining = calculateTimeRemaining(past, now);

    assert.equal(remaining.days, 0);
    assert.equal(remaining.hours, 0);
    assert.equal(remaining.minutes, 0);
    assert.equal(remaining.seconds, 0);
    assert.equal(remaining.isExpired, true);
  });

  it('manages evergreen storage target cleanly', () => {
    const store: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };

    const now = Date.now();
    const target1 = getEvergreenTarget('promo_bar', 120000, now, storage);
    assert.equal(target1, now + 120000);
    // Repeated call with later nowMs should retrieve the exact same saved timestamp
    const target2 = getEvergreenTarget('promo_bar', 120000, now + 5000, storage);
    assert.equal(target2, target1);
  });
});

describe('Motion effects math', () => {
  it('calculates scroll progress normalized between 0 and 1', () => {
    // When element top is at viewport bottom (1000), travel = 0 => progress 0
    assert.equal(calculateScrollProgress(1000, 200, 1000), 0);
    // When element has scrolled fully past viewport top (-200), travel = 1200 => progress 1
    assert.equal(calculateScrollProgress(-200, 200, 1000), 1);
    // Clamping
    assert.equal(calculateScrollProgress(2000, 200, 1000), 0);
    assert.equal(calculateScrollProgress(-500, 200, 1000), 1);
  });

  it('computes scroll transform values across progress range', () => {
    const effect = {
      translateY: 100,
      rotate: 45,
      scale: 1.5,
      opacity: 0.5,
    };

    const atMid = computeScrollTransform(effect, 0.5);
    assert.ok(atMid.transform.includes('translateY(0.00px)'));
    assert.ok(atMid.transform.includes('rotate(0.00deg)'));
    assert.ok(atMid.transform.includes('scale(1.000)'));
    assert.equal(atMid.opacity, 1);

    const atEnd = computeScrollTransform(effect, 1);
    assert.ok(atEnd.transform.includes('translateY(100.00px)'));
    assert.ok(atEnd.transform.includes('rotate(45.00deg)'));
    assert.ok(atEnd.transform.includes('scale(1.500)'));
    assert.equal(atEnd.opacity, 0.5);
  });

  it('computes parallax offset with speed and direction', () => {
    // elementTop = 400, viewportHeight = 1000 -> centerDiff = 400 - 500 = -100
    // speed = 2 -> offset = -(-100) * (2 * 0.1) = 20
    const offset = computeParallaxOffset(400, 1000, 2);
    assert.equal(offset, 20);
  });

  it('computes mouse track offset with strength and direction', () => {
    // window 1000x1000, mouse at (600, 400)
    // normX = (0.6 - 0.5) * 2 = 0.2
    // normY = (0.4 - 0.5) * 2 = -0.2
    // strength = 5
    const direct = computeMouseTrackOffset(600, 400, 1000, 1000, 5, 'direct');
    assert.equal(Math.round(direct.x * 100) / 100, 1);
    assert.equal(Math.round(direct.y * 100) / 100, -1);

    const opposite = computeMouseTrackOffset(600, 400, 1000, 1000, 5, 'opposite');
    assert.equal(Math.round(opposite.x * 100) / 100, -1);
    assert.equal(Math.round(opposite.y * 100) / 100, 1);
  });
});

describe('Custom fonts', () => {
  const customFonts: CustomFont[] = [
    {
      family: 'Cabinet Grotesk',
      weights: [
        { weight: '400', style: 'normal', mediaKey: 'fonts/cabinet-regular.woff2' },
        { weight: '700', style: 'normal', mediaKey: 'fonts/cabinet-bold.woff' },
      ],
    },
  ];

  it('builds valid @font-face CSS rules', () => {
    const css = buildCustomFontsCss(customFonts);
    assert.ok(css.includes("font-family: 'Cabinet Grotesk'"));
    assert.ok(css.includes("format('woff2')"));
    assert.ok(css.includes("format('woff')"));
    assert.ok(css.includes('font-weight: 400'));
    assert.ok(css.includes('font-weight: 700'));
    assert.ok(css.includes('font-display: swap'));
  });

  it('merges custom fonts into available font families', () => {
    const families = getAvailableFontFamilies(customFonts);
    assert.ok(families.includes('Cabinet Grotesk'));
    assert.ok(families.includes('Inter'));
    assert.ok(families.includes('System'));
  });

  it('differentiates custom fonts from Google fonts', () => {
    assert.equal(isGoogleFont('Cabinet Grotesk', customFonts), false);
    assert.equal(isGoogleFont('System', customFonts), false);
    assert.equal(isGoogleFont('Inter', customFonts), true);
  });
});

describe('Basic block group & registry integration', () => {
  const basicWidgets = [
    'Icon',
    'IconBox',
    'ImageBox',
    'Counter',
    'ProgressBar',
    'StarRating',
    'Countdown',
    'FlipBox',
    'AnimatedHeadline',
    'PriceList',
    'TableOfContents',
    'Breadcrumbs',
    'TestimonialCarousel',
    'Hotspot',
    'Lottie',
  ];

  it('has Basic block group in pageBlockGroups', () => {
    const basicGroup = pageBlockGroups.find(g => g.title === 'Basic');
    assert.ok(basicGroup, 'Basic group must exist in pageBlockGroups');
    for (const w of basicWidgets) {
      assert.ok(basicGroup.types.includes(w), `Basic group must contain ${w}`);
    }
  });

  it('registers all 15 basic widgets in builtInComponents', () => {
    const components = getBlockComponents();
    for (const w of basicWidgets) {
      assert.ok(components[w as keyof typeof components], `getBlockComponents must register ${w}`);
      assert.ok((builtInComponents as any)[w], `builtInComponents must register ${w}`);
    }
  });

  it('registers all 15 basic widgets in NATIVE_BLOCKS', () => {
    const nativeTypes = new Set(NATIVE_BLOCKS.map(b => b.type));
    for (const w of basicWidgets) {
      assert.ok(nativeTypes.has(w), `NATIVE_BLOCKS must contain ${w}`);
    }
  });
});
