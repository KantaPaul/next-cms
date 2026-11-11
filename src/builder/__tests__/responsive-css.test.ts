import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type BreakpointConfig,
  DEFAULT_BREAKPOINTS,
} from '@nextcms/builder-core';
import { buildResponsiveCss, DEVICE_SUFFIX } from '../responsive-css';
import { hideOnClasses, resolveHideOn } from '../style';
import { breakpointsSchema } from '@/app/(admin)/dashboard/(shell)/settings/_modules/settings.schemas';

function customConfig(
  overrides: Partial<Record<string, { enabled?: boolean; width?: number }>>
): BreakpointConfig {
  return DEFAULT_BREAKPOINTS.map(entry => ({
    ...entry,
    ...(overrides[entry.device] ?? {}),
  }));
}

describe('buildResponsiveCss', () => {
  it('matches legacy 768/1024 media boundaries and fallback chains on default config', () => {
    const css = buildResponsiveCss(DEFAULT_BREAKPOINTS);
    // Tablet (<= 1023) & Mobile (<= 767)
    assert.match(css, /@media \(max-width:1023px\)/);
    assert.match(css, /@media \(max-width:767px\)/);
    assert.doesNotMatch(css, /max-width:1366px/);
    assert.doesNotMatch(css, /min-width:2400px/);

    // Mobile falls back through tablet -> desktop
    const mobileBlock = css.slice(css.indexOf('@media (max-width:767px){'));
    assert.ok(
      mobileBlock.includes('.site-root .s-fs{font-size:var(--s-fs-m, var(--s-fs-t, var(--s-fs-d)));}')
    );
    // Tablet falls back to desktop without disabled laptop/tablet_extra
    const tabletBlock = css.slice(css.indexOf('@media (max-width:1023px){'));
    assert.ok(
      tabletBlock.includes('.site-root .s-fs{font-size:var(--s-fs-t, var(--s-fs-d));}')
    );
    // Semantic Tailwind-replacement classes align with default 768/1024 edges
    assert.ok(css.includes('@media (min-width:768px){') && css.slice(css.indexOf('@media (min-width:768px){')).includes(':where(.site-root) .s-tab-cols-2'));
    assert.ok(css.includes('@media (min-width:1024px){') && css.slice(css.indexOf('@media (min-width:1024px){')).includes(':where(.site-root) .s-desk-cols-3'));
    // @property prevents outer section bleed into nested elements
    assert.ok(css.includes("@property --s-fs-d{syntax:'*';inherits:false;}"));
    assert.ok(!css.includes('--s-fs-l'));
  });

  it('includes enabled extra breakpoints and excludes disabled ones', () => {
    const withAll = customConfig({
      widescreen: { enabled: true, width: 2400 },
      laptop: { enabled: true, width: 1366 },
      tablet_extra: { enabled: true, width: 1200 },
      mobile_extra: { enabled: true, width: 880 },
    });
    const css = buildResponsiveCss(withAll);
    assert.ok(css.includes('@media (min-width:2400px){') && css.slice(css.indexOf('@media (min-width:2400px){')).includes('.site-root .s-fs{font-size:var(--s-fs-w, var(--s-fs-d));}'));
    assert.ok(css.includes('@media (max-width:1366px){') && css.slice(css.indexOf('@media (max-width:1366px){')).includes('.site-root .s-fs{font-size:var(--s-fs-l, var(--s-fs-d));}'));
    assert.ok(css.includes('@media (max-width:1200px){') && css.slice(css.indexOf('@media (max-width:1200px){')).includes('.site-root .s-fs{font-size:var(--s-fs-te, var(--s-fs-l, var(--s-fs-d)));}'));
    assert.ok(css.includes('@media (max-width:880px){') && css.slice(css.indexOf('@media (max-width:880px){')).includes('.site-root .s-fs{font-size:var(--s-fs-me, var(--s-fs-t, var(--s-fs-te, var(--s-fs-l, var(--s-fs-d)))));}'));
    assert.ok(css.includes(`.site-root .s-hide-${DEVICE_SUFFIX.laptop}{display:none;}`));
    assert.ok(css.includes(`.site-root .s-hide-${DEVICE_SUFFIX.mobile_extra}{display:none;}`));

    // Turn laptop back off -> its media query and fallback vanish
    const laptopOff = customConfig({
      laptop: { enabled: false },
      mobile_extra: { enabled: true, width: 880 },
    });
    const cssOff = buildResponsiveCss(laptopOff);
    assert.doesNotMatch(cssOff, /max-width:1366px/);
    assert.doesNotMatch(cssOff, /--s-fs-l/);
    assert.match(cssOff, /max-width:880px/);
  });

  it('updates semantic block and hideOn rules when tablet width changes', () => {
    const custom = customConfig({ tablet: { width: 900 } });
    const css = buildResponsiveCss(custom);
    assert.match(css, /@media \(max-width:900px\)/);
    assert.ok(css.includes('@media (min-width:901px){') && css.slice(css.indexOf('@media (min-width:901px){')).includes(':where(.site-root) .s-desk-cols-3'));
    assert.ok(
      css.includes('@media (min-width:768px) and (max-width:900px){') &&
        css.slice(css.indexOf('@media (min-width:768px) and (max-width:900px){')).includes('.site-root .s-hide-t{display:none;}')
    );
  });
});

describe('section hideOn migration', () => {
  it('reads legacy hideOn* booleans when hideOn array is absent', () => {
    assert.deepEqual(
      resolveHideOn({ hideOnMobile: true, hideOnTablet: false, hideOnDesktop: true }),
      ['desktop', 'mobile']
    );
    assert.deepEqual(
      hideOnClasses({ hideOnTablet: true }, false),
      ['s-hide-t']
    );
    assert.deepEqual(
      hideOnClasses({ hideOnTablet: true }, true),
      ['s-dim-t']
    );
  });

  it('prefers generic hideOn array over legacy booleans', () => {
    const s = {
      hideOn: ['laptop', 'mobile_extra'] as const,
      hideOnMobile: true,
    };
    assert.deepEqual(resolveHideOn({ ...s, hideOn: [...s.hideOn] }), [
      'laptop',
      'mobile_extra',
    ]);
    assert.deepEqual(hideOnClasses({ ...s, hideOn: [...s.hideOn] }), [
      's-hide-l',
      's-hide-me',
    ]);
  });
});

describe('breakpointsSchema validation', () => {
  it('accepts default config and rejects unordered or duplicate widths', () => {
    assert.equal(breakpointsSchema.safeParse(DEFAULT_BREAKPOINTS).success, true);
    const badOrder = customConfig({ tablet: { width: 700 }, mobile: { width: 767 } });
    assert.equal(breakpointsSchema.safeParse(badOrder).success, false);
    const dupWidth = customConfig({ tablet_extra: { width: 1023 }, tablet: { width: 1023 } });
    assert.equal(breakpointsSchema.safeParse(dupWidth).success, false);
  });
});
