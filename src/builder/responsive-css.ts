import {
  type BreakpointConfig,
  DEFAULT_BREAKPOINTS,
  DEVICES,
  type Device,
  enabledDevices,
  fallbackFor,
  normalizeBreakpointConfig,
} from '@nextcms/builder-core';

export const DEVICE_SUFFIX: Record<Device, string> = {
  widescreen: 'w',
  desktop: 'd',
  laptop: 'l',
  tablet_extra: 'te',
  tablet: 't',
  mobile_extra: 'me',
  mobile: 'm',
};

type VarFamily = {
  selector: string;
  prop: string;
  varPrefix: string;
  defaultValue?: string;
  /** Also fall back to `--varPrefix` (without suffix) for non-responsive values. */
  plainFallback?: boolean;
};

/**
 * Single source list of every responsive CSS variable family used by builder
 * sections, elements, containers, chrome, and overlays.
 */
export const RESPONSIVE_VAR_FAMILIES: readonly VarFamily[] = [
  // Section & element spacing / borders / sizing / typography
  { selector: '.site-root .s-pt', prop: 'padding-top', varPrefix: '--s-pt' },
  { selector: '.site-root .s-pr', prop: 'padding-right', varPrefix: '--s-pr' },
  { selector: '.site-root .s-pb', prop: 'padding-bottom', varPrefix: '--s-pb' },
  { selector: '.site-root .s-pl', prop: 'padding-left', varPrefix: '--s-pl' },
  { selector: '.site-root .s-bt', prop: 'border-top-width', varPrefix: '--s-bt' },
  { selector: '.site-root .s-br', prop: 'border-right-width', varPrefix: '--s-br' },
  { selector: '.site-root .s-bb', prop: 'border-bottom-width', varPrefix: '--s-bb' },
  { selector: '.site-root .s-bl', prop: 'border-left-width', varPrefix: '--s-bl' },
  { selector: '.site-root .s-fs', prop: 'font-size', varPrefix: '--s-fs' },
  { selector: '.site-root .s-fw', prop: 'font-weight', varPrefix: '--s-fw' },
  { selector: '.site-root .s-ta', prop: 'text-align', varPrefix: '--s-ta' },
  { selector: '.site-root .s-mh', prop: 'min-height', varPrefix: '--s-mh' },
  { selector: '.site-root .s-jc', prop: 'justify-content', varPrefix: '--s-jc' },
  { selector: '.site-root .s-mt', prop: 'margin-top', varPrefix: '--s-mt' },
  { selector: '.site-root .s-mr', prop: 'margin-right', varPrefix: '--s-mr' },
  { selector: '.site-root .s-mb', prop: 'margin-bottom', varPrefix: '--s-mb' },
  { selector: '.site-root .s-ml', prop: 'margin-left', varPrefix: '--s-ml' },
  { selector: '.site-root .s-lh', prop: 'line-height', varPrefix: '--s-lh' },
  { selector: '.site-root .s-ls', prop: 'letter-spacing', varPrefix: '--s-ls' },
  { selector: '.site-root .s-ws', prop: 'word-spacing', varPrefix: '--s-ws' },
  { selector: '.site-root .s-w', prop: 'width', varPrefix: '--s-w' },
  { selector: '.site-root .s-rad', prop: 'border-radius', varPrefix: '--s-rad' },
  { selector: '.site-root .s-tst', prop: '-webkit-text-stroke', varPrefix: '--s-tst', plainFallback: true },
  { selector: '.site-root .s-bg-pos', prop: 'background-position', varPrefix: '--s-bg-pos', plainFallback: true },
  { selector: '.site-root .s-bg-size', prop: 'background-size', varPrefix: '--s-bg-size', plainFallback: true },
  { selector: '.site-root .s-tp', prop: 'font-size', varPrefix: '--s-tp-size' },

  // Container layout (flex / grid)
  { selector: '.site-root .s-c-d', prop: 'display', varPrefix: '--s-c-d', defaultValue: 'flex' },
  { selector: '.site-root .s-c-fd', prop: 'flex-direction', varPrefix: '--s-c-fd', defaultValue: 'row' },
  { selector: '.site-root .s-c-fw', prop: 'flex-wrap', varPrefix: '--s-c-fw', defaultValue: 'nowrap' },
  { selector: '.site-root .s-c-jc', prop: 'justify-content', varPrefix: '--s-c-jc', defaultValue: 'flex-start' },
  { selector: '.site-root .s-c-ai', prop: 'align-items', varPrefix: '--s-c-ai', defaultValue: 'stretch' },
  { selector: '.site-root .s-c-ac', prop: 'align-content', varPrefix: '--s-c-ac', defaultValue: 'flex-start' },
  { selector: '.site-root .s-c-ga', prop: 'gap', varPrefix: '--s-c-ga' },
  { selector: '.site-root .s-c-cga', prop: 'column-gap', varPrefix: '--s-c-cga' },
  { selector: '.site-root .s-c-rga', prop: 'row-gap', varPrefix: '--s-c-rga' },
  { selector: '.site-root .s-c-gtc', prop: 'grid-template-columns', varPrefix: '--s-c-gtc' },
  { selector: '.site-root .s-c-gtr', prop: 'grid-template-rows', varPrefix: '--s-c-gtr' },
  { selector: '.site-root .s-c-gaf', prop: 'grid-auto-flow', varPrefix: '--s-c-gaf', defaultValue: 'row' },
  { selector: '.site-root .s-c-w', prop: 'width', varPrefix: '--s-c-w' },
  { selector: '.site-root .s-c-nw', prop: 'min-width', varPrefix: '--s-c-nw' },
  { selector: '.site-root .s-c-xw', prop: 'max-width', varPrefix: '--s-c-xw' },
  { selector: '.site-root .s-c-h', prop: 'height', varPrefix: '--s-c-h' },
  { selector: '.site-root .s-c-nh', prop: 'min-height', varPrefix: '--s-c-nh' },
  { selector: '.site-root .s-c-xh', prop: 'max-height', varPrefix: '--s-c-xh' },
  { selector: '.site-root .s-c-grw', prop: 'flex-grow', varPrefix: '--s-c-grw' },
  { selector: '.site-root .s-c-grs', prop: 'flex-shrink', varPrefix: '--s-c-grs' },
  { selector: '.site-root .s-c-grb', prop: 'flex-basis', varPrefix: '--s-c-grb' },
  { selector: '.site-root .s-c-box', prop: 'box-sizing', varPrefix: '--s-c-box', defaultValue: 'border-box' },
  { selector: '.site-root .s-c-boxed', prop: 'max-width', varPrefix: '--s-c-bw' },

  // Chrome boxed max-width
  { selector: '.site-root .site-chrome.is-boxed', prop: 'max-width', varPrefix: '--chrome-max-width', defaultValue: '1280px' },

  // Overlay panel (.s-ov-panel — portaled to body, not scoped to .site-root)
  { selector: '.s-ov-panel', prop: 'width', varPrefix: '--ov-w' },
  { selector: '.s-ov-panel', prop: 'max-height', varPrefix: '--ov-mh' },
  { selector: '.s-ov-panel', prop: 'padding', varPrefix: '--ov-p' },
  { selector: '.s-ov-panel', prop: 'border-radius', varPrefix: '--ov-rad' },
];

const THEME_TYPE_PRESETS = [
  'display',
  'h1',
  'h2',
  'h3',
  'h4',
  'lead',
  'body',
  'eyebrow',
  'caption',
  'meta',
  'button',
] as const;

function varChain(
  varPrefix: string,
  chain: Device[],
  finalFallback?: string
): string {
  const names = chain.map(d =>
    varPrefix.startsWith('--site-type-') && d === 'desktop'
      ? varPrefix
      : `${varPrefix}-${DEVICE_SUFFIX[d]}`
  );
  let expr = finalFallback ?? '';
  for (let i = names.length - 1; i >= 0; i--) {
    expr = expr ? `var(${names[i]}, ${expr})` : `var(${names[i]})`;
  }
  return expr;
}

function buildRulesForChain(
  chain: Device[],
  device: Device
): string {
  const lines: string[] = [];

  for (const fam of RESPONSIVE_VAR_FAMILIES) {
    const fallback = fam.plainFallback
      ? fam.defaultValue
        ? `var(${fam.varPrefix}, ${fam.defaultValue})`
        : `var(${fam.varPrefix})`
      : fam.defaultValue;
    lines.push(`${fam.selector}{${fam.prop}:${varChain(fam.varPrefix, chain, fallback)};}`);
  }

  for (const id of THEME_TYPE_PRESETS) {
    lines.push(
      `.site-root .s-type-${id}{font-size:${varChain(`--site-type-${id}-size`, chain)};}`
    );
  }

  const isMobileBand = device === 'mobile' || device === 'mobile_extra';
  lines.push(
    `.site-root .s-display-title{font-size:${varChain('--site-type-display-size', chain, isMobileBand ? '2.25rem' : '3.75rem')};}`,
    `.site-root .s-section-title{font-size:${varChain('--site-type-h2-size', chain, isMobileBand ? '1.875rem' : '2.25rem')};}`,
    `.site-root .s-post-title{font-size:${varChain('--site-type-h1-size', chain, isMobileBand ? '2.25rem' : '3rem')};}`
  );

  // Header column grid templates
  const sfx = DEVICE_SUFFIX[device];
  if (device === 'desktop') {
    lines.push(
      `.site-root .s-hcols,.site-root .s-hcols-lg,.site-root .s-hcols-always{grid-template-columns:var(--hc-cols,minmax(0,1fr));}`
    );
  } else if (device === 'widescreen') {
    lines.push(
      `.site-root .s-hcols,.site-root .s-hcols-lg,.site-root .s-hcols-always{grid-template-columns:var(--hc-cols-w,var(--hc-cols,minmax(0,1fr)));}`
    );
  } else if (device === 'laptop' || device === 'tablet_extra') {
    lines.push(
      `.site-root .s-hcols,.site-root .s-hcols-lg,.site-root .s-hcols-always{grid-template-columns:var(--hc-cols-${sfx},var(--hc-cols,minmax(0,1fr)));}`
    );
  } else if (device === 'tablet') {
    lines.push(
      `.site-root .s-hcols,.site-root .s-hcols-always{grid-template-columns:var(--hc-cols-md,var(--hc-cols,minmax(0,1fr)));}`,
      `.site-root .s-hcols-lg{grid-template-columns:var(--hc-cols-md,minmax(0,1fr));}`
    );
  } else if (device === 'mobile_extra') {
    lines.push(
      `.site-root .s-hcols,.site-root .s-hcols-lg{grid-template-columns:var(--hc-cols-me,var(--hc-cols-sm,minmax(0,1fr)));}`,
      `.site-root .s-hcols-always{grid-template-columns:var(--hc-cols-me,var(--hc-cols-sm,var(--hc-cols,minmax(0,1fr))));}`
    );
  } else {
    lines.push(
      `.site-root .s-hcols,.site-root .s-hcols-lg{grid-template-columns:var(--hc-cols-sm,minmax(0,1fr));}`,
      `.site-root .s-hcols-always{grid-template-columns:var(--hc-cols-sm,var(--hc-cols,minmax(0,1fr)));}`
    );
  }

  return lines.join('');
}

function bandMediaQuery(
  device: Device,
  config: BreakpointConfig
): string | null {
  const byDevice = new Map(config.map(e => [e.device, e]));
  const enabled = enabledDevices(config);
  if (!enabled.includes(device)) return null;

  if (device === 'widescreen') {
    return `(min-width:${byDevice.get('widescreen')!.width}px)`;
  }

  const idx = DEVICES.indexOf(device);
  let smallerWidth: number | null = null;
  for (let i = idx + 1; i < DEVICES.length; i++) {
    const d = DEVICES[i];
    if (enabled.includes(d)) {
      smallerWidth = byDevice.get(d)!.width;
      break;
    }
  }

  if (device === 'desktop') {
    const hasWs = enabled.includes('widescreen');
    const parts: string[] = [];
    if (smallerWidth !== null) parts.push(`(min-width:${smallerWidth + 1}px)`);
    if (hasWs) parts.push(`(max-width:${byDevice.get('widescreen')!.width - 1}px)`);
    return parts.length > 0 ? parts.join(' and ') : null;
  }

  const maxW = byDevice.get(device)!.width;
  if (smallerWidth !== null) {
    return `(min-width:${smallerWidth + 1}px) and (max-width:${maxW}px)`;
  }
  return `(max-width:${maxW}px)`;
}

function buildBlockLayoutCss(
  mobileWidth: number,
  tabletWidth: number
): string {
  const aboveMob = mobileWidth + 1;
  const aboveTab = tabletWidth + 1;

  const root = ':where(.site-root)';

  const mobileOnly = [
    `${root} .s-mob-justify-start{justify-content:flex-start;}`,
    `${root} .s-mob-justify-center{justify-content:center;}`,
    `${root} .s-mob-justify-end{justify-content:flex-end;}`,
    `${root} .s-mob-text-left{text-align:left;}`,
    `${root} .s-mob-text-center{text-align:center;}`,
    `${root} .s-mob-text-right{text-align:right;}`,
    `${root} .s-mob-self-start{align-self:flex-start;}`,
    `${root} .s-mob-self-center{align-self:center;}`,
    `${root} .s-mob-self-end{align-self:flex-end;}`,
  ].join('');

  const tabletOnly = [
    `${root} .s-tabonly-justify-start{justify-content:flex-start;}`,
    `${root} .s-tabonly-justify-center{justify-content:center;}`,
    `${root} .s-tabonly-justify-end{justify-content:flex-end;}`,
    `${root} .s-tabonly-text-left{text-align:left;}`,
    `${root} .s-tabonly-text-center{text-align:center;}`,
    `${root} .s-tabonly-text-right{text-align:right;}`,
    `${root} .s-tabonly-self-start{align-self:flex-start;}`,
    `${root} .s-tabonly-self-center{align-self:center;}`,
    `${root} .s-tabonly-self-end{align-self:flex-end;}`,
  ].join('');

  const aboveMobile = [
    `${root} .s-tab-hidden{display:none;}`,
    `${root} .s-tab-flex{display:flex;}`,
    `${root} .s-tab-flex-row{flex-direction:row;}`,
    `${root} .s-tab-items-start{align-items:flex-start;}`,
    `${root} .s-tab-justify-between{justify-content:space-between;}`,
    `${root} .s-tab-block{display:block;}`,
    `${root} .s-tab-cols-1{grid-template-columns:repeat(1,minmax(0,1fr));}`,
    `${root} .s-tab-cols-2{grid-template-columns:repeat(2,minmax(0,1fr));}`,
    `${root} .s-tab-cols-3{grid-template-columns:repeat(3,minmax(0,1fr));}`,
    `${root} .s-tab-cols-4{grid-template-columns:repeat(4,minmax(0,1fr));}`,
    `${root} .s-tab-cols-5{grid-template-columns:repeat(5,minmax(0,1fr));}`,
    `${root} .s-tab-cols-6{grid-template-columns:repeat(6,minmax(0,1fr));}`,
    `${root} .s-tab-cols-2-1{grid-template-columns:2fr 1fr;}`,
    `${root} .s-tab-cols-1-2{grid-template-columns:1fr 2fr;}`,
    `${root} .s-tab-ccols-1{columns:1;}`,
    `${root} .s-tab-ccols-2{columns:2;}`,
    `${root} .s-tab-ccols-3{columns:3;}`,
    `${root} .s-tab-text-lg{font-size:1.125rem;line-height:1.75rem;}`,
    `${root} .s-tab-text-xl{font-size:1.25rem;line-height:1.75rem;}`,
    `${root} .s-tab-text-2xl{font-size:1.5rem;line-height:2rem;}`,
    `${root} .s-tab-text-3xl{font-size:1.875rem;line-height:2.25rem;}`,
    `${root} .s-tab-text-4xl{font-size:2.25rem;line-height:2.5rem;}`,
    `${root} .s-tab-text-5xl{font-size:3rem;line-height:1;}`,
    `${root} .s-tab-p-6{padding:1.5rem;}`,
    `${root} .s-tab-p-8{padding:2rem;}`,
    `${root} .s-tab-p-10{padding:2.5rem;}`,
    `${root} .s-tab-py-10{padding-top:2.5rem;padding-bottom:2.5rem;}`,
    `${root} .s-tab-py-20{padding-top:5rem;padding-bottom:5rem;}`,
    `${root} .s-tab-py-28{padding-top:7rem;padding-bottom:7rem;}`,
    `${root} .s-tab-px-8{padding-left:2rem;padding-right:2rem;}`,
    `${root} .s-tab-px-16{padding-left:4rem;padding-right:4rem;}`,
    `${root} .s-tab-mb-14{margin-bottom:3.5rem;}`,
    `${root} .s-tab-gap-4{gap:1rem;}`,
    `${root} .s-tab-gap-8{gap:2rem;}`,
    `${root} .s-tab-w-96{width:24rem;}`,
  ].join('');

  const aboveTablet = [
    `${root} .s-desk-hidden{display:none;}`,
    `${root} .s-desk-block{display:block;}`,
    `${root} .s-desk-flex-row{flex-direction:row;}`,
    `${root} .s-desk-cols-1{grid-template-columns:repeat(1,minmax(0,1fr));}`,
    `${root} .s-desk-cols-2{grid-template-columns:repeat(2,minmax(0,1fr));}`,
    `${root} .s-desk-cols-3{grid-template-columns:repeat(3,minmax(0,1fr));}`,
    `${root} .s-desk-cols-4{grid-template-columns:repeat(4,minmax(0,1fr));}`,
    `${root} .s-desk-cols-5{grid-template-columns:repeat(5,minmax(0,1fr));}`,
    `${root} .s-desk-cols-6{grid-template-columns:repeat(6,minmax(0,1fr));}`,
    `${root} .s-desk-cols-sidebar-l{grid-template-columns:18rem minmax(0,1fr);}`,
    `${root} .s-desk-cols-sidebar-r{grid-template-columns:minmax(0,1fr) 18rem;}`,
    `${root} .s-desk-ccols-1{columns:1;}`,
    `${root} .s-desk-ccols-2{columns:2;}`,
    `${root} .s-desk-ccols-3{columns:3;}`,
    `${root} .s-desk-ccols-4{columns:4;}`,
    `${root} .s-desk-px-8{padding-left:2rem;padding-right:2rem;}`,
    `${root} .s-desk-w-7-12{width:58.333333%;}`,
    `${root} .s-desk-w-q4{width:calc(25% - 18px);}`,
    `${root} .s-desk-w-q3{width:calc(33.333% - 16px);}`,
    `${root} .s-desk-aspect-auto{aspect-ratio:auto;}`,
    `${root} .s-desk-min-h-22{min-height:22rem;}`,
    `${root} .s-desk-order-2{order:2;}`,
    `${root} .s-desk-sticky{position:sticky;}`,
    `${root} .s-desk-top-24{top:6rem;}`,
    `${root} .s-desk-justify-start{justify-content:flex-start;}`,
    `${root} .s-desk-justify-center{justify-content:center;}`,
    `${root} .s-desk-justify-end{justify-content:flex-end;}`,
    `${root} .s-desk-text-left{text-align:left;}`,
    `${root} .s-desk-text-center{text-align:center;}`,
    `${root} .s-desk-text-right{text-align:right;}`,
    `${root} .s-desk-self-start{align-self:flex-start;}`,
    `${root} .s-desk-self-center{align-self:center;}`,
    `${root} .s-desk-self-end{align-self:flex-end;}`,
    `${root} .s-desk-spv-1{--slides-per-view:1;}`,
    `${root} .s-desk-spv-2{--slides-per-view:2;}`,
    `${root} .s-desk-spv-3{--slides-per-view:3;}`,
    `${root} .s-desk-spv-4{--slides-per-view:4;}`,
    `${root} .s-desk-spv-5{--slides-per-view:5;}`,
    `${root} .s-desk-spv-6{--slides-per-view:6;}`,
  ].join('');

  return [
    `@media (max-width:${mobileWidth}px){${mobileOnly}}`,
    `@media (min-width:${aboveMob}px) and (max-width:${tabletWidth}px){${tabletOnly}}`,
    `@media (min-width:${aboveMob}px){${aboveMobile}}`,
    `@media (min-width:${aboveTab}px){${aboveTablet}}`,
  ].join('');
}

/**
 * Generates the site's complete responsive CSS stylesheet from its breakpoint config.
 */
export function buildResponsiveCss(
  rawConfig: BreakpointConfig = DEFAULT_BREAKPOINTS
): string {
  const config = normalizeBreakpointConfig(rawConfig);
  const enabled = enabledDevices(config);
  const byDevice = new Map(config.map(e => [e.device, e]));
  const parts: string[] = [];

  // Prevent `--s-*` / `--s-c-*` inline vars on an outer section from bleeding
  // into nested elements that don't set a value for that breakpoint.
  for (const fam of RESPONSIVE_VAR_FAMILIES) {
    if (!fam.varPrefix.startsWith('--s-')) continue;
    for (const d of enabled) {
      const sfx = DEVICE_SUFFIX[d];
      parts.push(`@property ${fam.varPrefix}-${sfx}{syntax:'*';inherits:false;}`);
    }
  }

  // 1. Base rules (desktop)
  parts.push(buildRulesForChain(['desktop'], 'desktop'));

  // 2. Widescreen (min-width)
  if (enabled.includes('widescreen')) {
    const w = byDevice.get('widescreen')!.width;
    parts.push(`@media (min-width:${w}px){${buildRulesForChain(fallbackFor('widescreen', config), 'widescreen')}}`);
  }

  // 3. Smaller breakpoints, largest to smallest (max-width)
  for (const d of ['laptop', 'tablet_extra', 'tablet', 'mobile_extra', 'mobile'] as const) {
    if (!enabled.includes(d)) continue;
    const w = byDevice.get(d)!.width;
    parts.push(`@media (max-width:${w}px){${buildRulesForChain(fallbackFor(d, config), d)}}`);
  }

  // 4. Header mobile-menu swap rules
  const mobileW = byDevice.get('mobile')!.width;
  const tabletW = byDevice.get('tablet')!.width;
  parts.push(
    `@media (max-width: ${mobileW}.98px){.site-root [data-header-bar]:has([data-mobile-menu]) [data-nav-menu='horizontal']{display:none;}}`,
    `@media (max-width: ${tabletW}.98px){.site-root [data-header-bar]:has([data-mobile-menu='tablet']) [data-nav-menu='horizontal']{display:none;}}`
  );

  // 5. Per-device visibility (hideOn / dim in editor)
  for (const d of enabled) {
    const mq = bandMediaQuery(d, config);
    const sfx = DEVICE_SUFFIX[d];
    const body = `.site-root .s-hide-${sfx}{display:none;}.site-root .s-dim-${sfx}{opacity:0.3;}`;
    parts.push(mq ? `@media ${mq}{${body}}` : body);
  }

  // 6. Semantic block layout rules
  parts.push(buildBlockLayoutCss(mobileW, tabletW));

  return parts.join('\n');
}

const cssCache = new Map<string, string>();

/** Cached version of `buildResponsiveCss` keyed by normalized config JSON. */
export function getResponsiveCss(
  rawConfig: BreakpointConfig = DEFAULT_BREAKPOINTS
): string {
  const normalized = normalizeBreakpointConfig(rawConfig);
  const key = JSON.stringify(normalized);
  let cached = cssCache.get(key);
  if (!cached) {
    cached = buildResponsiveCss(normalized);
    if (cssCache.size > 32) cssCache.clear();
    cssCache.set(key, cached);
  }
  return cached;
}
