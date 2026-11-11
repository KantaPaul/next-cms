import {
  type BuilderDocument,
  type BuilderNode,
  DOCUMENT_VERSION,
} from '@nextcms/builder-core';
import { sanitizeRichText } from '@/builder/sanitize';
import {
  type BorderSettings,
  type ContainerSettings,
  type Device,
  type ElementStyle,
  type Fill,
  type LengthUnit,
  type Responsive,
  type SectionSettings,
  type Sides,
  type SpacingUnit,
  type Typography,
  safeColor,
} from '@/builder/style';
import { documentIssues } from '@/builder/validate-document';
import { cleanWordPressHtml, rewriteImportedUrl, type RewriteUrlMaps } from './html';

export type ElementorElement = {
  id?: string;
  elType?: string;
  widgetType?: string;
  isInner?: boolean;
  settings?: Record<string, unknown>;
  elements?: ElementorElement[];
};

export type ElementorTemplateFile = {
  version?: string;
  title?: string;
  type?: string;
  content?: ElementorElement[];
  elements?: ElementorElement[];
};

export type ElementorConvertResult = {
  document: BuilderDocument;
  fallbackWidgets: string[];
  warnings: string[];
  valid: boolean;
  issues: string[];
  fallbackHtml: string;
};

const VALID_SPACING_UNITS = new Set<SpacingUnit>(['px', 'rem', 'em', '%']);
const VALID_LENGTH_UNITS = new Set<LengthUnit>([
  'px',
  'rem',
  'em',
  '%',
  'vw',
  'vh',
]);
const VALID_FONT_STYLES = new Set(['normal', 'italic', 'oblique']);
const VALID_TRANSFORMS = new Set([
  'none',
  'uppercase',
  'lowercase',
  'capitalize',
]);
const VALID_DECORATIONS = new Set([
  'none',
  'underline',
  'overline',
  'line-through',
]);

const FA_TO_LUCIDE: Record<string, string> = {
  star: 'Star',
  check: 'Check',
  'check-circle': 'CheckCircle2',
  heart: 'Heart',
  rocket: 'Rocket',
  shield: 'Shield',
  'shield-alt': 'ShieldCheck',
  clock: 'Clock',
  envelope: 'Mail',
  mail: 'Mail',
  phone: 'Phone',
  'phone-alt': 'Phone',
  'map-marker': 'MapPin',
  'map-marker-alt': 'MapPin',
  'arrow-right': 'ArrowRight',
  'arrow-left': 'ArrowLeft',
  bolt: 'Zap',
  zap: 'Zap',
  users: 'Users',
  user: 'User',
  cog: 'Settings',
  cogs: 'Settings',
  globe: 'Globe',
  play: 'Play',
  'play-circle': 'PlayCircle',
  lock: 'Lock',
  home: 'Home',
  search: 'Search',
  calendar: 'Calendar',
  camera: 'Camera',
  code: 'Code',
  award: 'Award',
  trophy: 'Trophy',
  sparkles: 'Sparkles',
  lightbulb: 'Lightbulb',
  layers: 'Layers',
  chart: 'BarChart3',
  'chart-bar': 'BarChart3',
  'chart-line': 'TrendingUp',
  fire: 'Flame',
  gift: 'Gift',
  thumbs: 'ThumbsUp',
  'thumbs-up': 'ThumbsUp',
  comments: 'MessageSquare',
  comment: 'MessageCircle',
  book: 'BookOpen',
  download: 'Download',
  upload: 'Upload',
  link: 'Link',
  paper: 'FileText',
  'file-alt': 'FileText',
  shopping: 'ShoppingBag',
  'shopping-cart': 'ShoppingCart',
  credit: 'CreditCard',
  'credit-card': 'CreditCard',
};

function str(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function clampNum(v: unknown, min: number, max: number): number | undefined {
  const n = num(v);
  if (n === undefined) return undefined;
  return Math.min(max, Math.max(min, n));
}

function bool(v: unknown): boolean {
  return v === true || v === 'yes' || v === 'true' || v === '1' || v === 1;
}

function safeUrlValue(
  raw: unknown,
  maps?: RewriteUrlMaps
): string | undefined {
  let rawStr = '';
  if (typeof raw === 'string') rawStr = raw.trim();
  else if (raw && typeof raw === 'object' && 'url' in raw) {
    rawStr = str((raw as { url?: unknown }).url).trim();
  }
  if (!rawStr) return undefined;
  const rewritten = rewriteImportedUrl(rawStr, maps).trim();
  const lower = rewritten.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return undefined;
  }
  return rewritten;
}

function extractLinkProp(
  raw: unknown,
  maps?: RewriteUrlMaps
): string | { url?: string; newTab?: boolean; nofollow?: boolean } | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') return safeUrlValue(raw, maps);
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const url = safeUrlValue(obj.url, maps);
    if (!url) return undefined;
    const newTab = bool(obj.is_external);
    const nofollow = bool(obj.nofollow);
    if (newTab || nofollow) {
      return {
        url,
        ...(newTab ? { newTab: true } : {}),
        ...(nofollow ? { nofollow: true } : {}),
      };
    }
    return url;
  }
  return undefined;
}

function mapAlignment(
  v: unknown
): 'left' | 'center' | 'right' | undefined {
  const s = str(v).toLowerCase();
  if (s === 'left' || s === 'start') return 'left';
  if (s === 'center') return 'center';
  if (s === 'right' || s === 'end') return 'right';
  return undefined;
}

function mapIcon(v: unknown): string {
  let raw = '';
  if (typeof v === 'string') raw = v;
  else if (v && typeof v === 'object' && 'value' in v) {
    raw = str((v as { value?: unknown }).value);
  }
  if (!raw) return 'Sparkles';
  const match = raw.match(/fa-([a-z0-9-]+)/i);
  const key = (match ? match[1] : raw).toLowerCase();
  return FA_TO_LUCIDE[key] ?? 'Sparkles';
}

function parseSides(
  raw: unknown
): { sides?: Sides; unit?: SpacingUnit } {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const top = clampNum(obj.top, 0, 400);
  const right = clampNum(obj.right, 0, 400);
  const bottom = clampNum(obj.bottom, 0, 400);
  const left = clampNum(obj.left, 0, 400);
  const unitRaw = str(obj.unit) as SpacingUnit;
  const unit = VALID_SPACING_UNITS.has(unitRaw) ? unitRaw : 'px';

  const sides: Sides = {};
  if (top !== undefined) sides.top = top;
  if (right !== undefined) sides.right = right;
  if (bottom !== undefined) sides.bottom = bottom;
  if (left !== undefined) sides.left = left;
  if (Object.keys(sides).length === 0) return {};
  return { sides, unit };
}

function parseBorderRadius(
  raw: unknown
): { radius?: { desktop: number }; radiusUnit?: LengthUnit } {
  if (!raw) return {};
  if (typeof raw === 'number') {
    const r = clampNum(raw, 0, 200);
    return r !== undefined ? { radius: { desktop: r }, radiusUnit: 'px' } : {};
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const vals = [obj.top, obj.right, obj.bottom, obj.left]
      .map(v => clampNum(v, 0, 200))
      .filter((v): v is number => v !== undefined);
    if (!vals.length) return {};
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const unitRaw = str(obj.unit) as LengthUnit;
    const radiusUnit = VALID_LENGTH_UNITS.has(unitRaw) ? unitRaw : 'px';
    return { radius: { desktop: avg }, radiusUnit };
  }
  return {};
}

function parseSizeObj(
  raw: unknown,
  min: number,
  max: number
): { size?: number; unit?: LengthUnit } {
  if (typeof raw === 'number') {
    const s = clampNum(raw, min, max);
    return s !== undefined ? { size: s, unit: 'px' } : {};
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const size = clampNum(obj.size, min, max);
    const unitRaw = str(obj.unit) as LengthUnit;
    const unit = VALID_LENGTH_UNITS.has(unitRaw) ? unitRaw : 'px';
    if (size !== undefined) return { size, unit };
  }
  return {};
}

const ELEMENTOR_DEVICE_MAP: ReadonlyArray<{ device: Device; suffix: string }> = [
  { device: 'widescreen', suffix: '_widescreen' },
  { device: 'desktop', suffix: '' },
  { device: 'laptop', suffix: '_laptop' },
  { device: 'tablet_extra', suffix: '_tablet_extra' },
  { device: 'tablet', suffix: '_tablet' },
  { device: 'mobile_extra', suffix: '_mobile_extra' },
  { device: 'mobile', suffix: '_mobile' },
];

function collectResponsiveSizes(
  settings: Record<string, unknown>,
  keys: string[],
  min: number,
  max: number
): { values?: Responsive<number>; unit?: LengthUnit } {
  const values: Responsive<number> = {};
  let unit: LengthUnit | undefined;
  for (const { device, suffix } of ELEMENTOR_DEVICE_MAP) {
    let raw: unknown;
    for (const k of keys) {
      if (settings[`${k}${suffix}`] !== undefined) {
        raw = settings[`${k}${suffix}`];
        break;
      }
    }
    const parsed = parseSizeObj(raw, min, max);
    if (parsed.size !== undefined) {
      values[device] = parsed.size;
      if (device === 'desktop' && parsed.unit) unit = parsed.unit;
      else if (!unit && parsed.unit) unit = parsed.unit;
    }
  }
  return Object.keys(values).length > 0 ? { values, unit } : {};
}

function collectResponsiveSides(
  settings: Record<string, unknown>,
  keys: string[]
): { values?: Responsive<Sides>; unit?: SpacingUnit } {
  const values: Responsive<Sides> = {};
  let unit: SpacingUnit | undefined;
  for (const { device, suffix } of ELEMENTOR_DEVICE_MAP) {
    let raw: unknown;
    for (const k of keys) {
      if (settings[`${k}${suffix}`] !== undefined) {
        raw = settings[`${k}${suffix}`];
        break;
      }
    }
    const parsed = parseSides(raw);
    if (parsed.sides) {
      values[device] = parsed.sides;
      if (device === 'desktop' && parsed.unit) unit = parsed.unit;
      else if (!unit && parsed.unit) unit = parsed.unit;
    }
  }
  return Object.keys(values).length > 0 ? { values, unit } : {};
}

function collectResponsiveEnum<T>(
  settings: Record<string, unknown>,
  key: string,
  mapFn: (v: unknown) => T | undefined
): Responsive<T> | undefined {
  const out: Responsive<T> = {};
  for (const { device, suffix } of ELEMENTOR_DEVICE_MAP) {
    const raw = settings[`${key}${suffix}`];
    if (raw === undefined) continue;
    const mapped = mapFn(raw);
    if (mapped !== undefined) out[device] = mapped;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function extractTypography(
  settings: Record<string, unknown>,
  prefix = 'typography_'
): Typography | undefined {
  const typo: Typography = {};

  const family = str(settings[`${prefix}font_family`]).trim();
  if (family) typo.family = family;

  const fs = collectResponsiveSizes(settings, [`${prefix}font_size`], 0, 200);
  if (fs.values) {
    typo.fontSize = fs.values;
    if (fs.unit && fs.unit !== '%') typo.fontSizeUnit = fs.unit;
  }

  const fw = clampNum(settings[`${prefix}font_weight`], 100, 900);
  if (fw !== undefined) typo.fontWeight = fw;

  const transform = str(settings[`${prefix}text_transform`]).toLowerCase();
  if (VALID_TRANSFORMS.has(transform)) {
    typo.transform = transform as Typography['transform'];
  }

  const fontStyle = str(settings[`${prefix}font_style`]).toLowerCase();
  if (VALID_FONT_STYLES.has(fontStyle)) {
    typo.fontStyle = fontStyle as Typography['fontStyle'];
  }

  const decoration = str(settings[`${prefix}text_decoration`]).toLowerCase();
  if (VALID_DECORATIONS.has(decoration)) {
    typo.decoration = decoration as Typography['decoration'];
  }

  const lh = collectResponsiveSizes(settings, [`${prefix}line_height`], 0, 200);
  if (lh.values) {
    typo.lineHeight = lh.values;
    if (lh.unit) typo.lineHeightUnit = lh.unit;
  }

  const ls = collectResponsiveSizes(settings, [`${prefix}letter_spacing`], -50, 50);
  if (ls.values) {
    typo.letterSpacing = ls.values;
    if (ls.unit) typo.letterSpacingUnit = ls.unit;
  }

  return Object.keys(typo).length > 0 ? typo : undefined;
}

function extractFill(
  settings: Record<string, unknown>,
  maps?: RewriteUrlMaps
): Fill | undefined {
  const bgType = str(settings.background_background);
  const bgColor = safeColor(settings.background_color);
  const bgColorB = safeColor(settings.background_color_b);
  const bgImage = safeUrlValue(settings.background_image, maps);

  if (bgType === 'gradient' && bgColor && bgColorB) {
    const angle = clampNum(
      (settings.background_gradient_angle as Record<string, unknown> | undefined)
        ?.size ?? settings.background_gradient_angle,
      0,
      360
    );
    return {
      type: 'gradient',
      from: bgColor,
      to: bgColorB,
      ...(angle !== undefined ? { angle } : {}),
    };
  }

  if (bgImage) {
    const sizeRaw = str(settings.background_size);
    const repeatRaw = str(settings.background_repeat);
    return {
      type: 'image',
      image: bgImage,
      ...(bgColor ? { color: bgColor } : {}),
      ...(sizeRaw === 'cover' || sizeRaw === 'contain' || sizeRaw === 'auto'
        ? { size: sizeRaw }
        : {}),
      ...(repeatRaw === 'no-repeat' ||
      repeatRaw === 'repeat' ||
      repeatRaw === 'repeat-x' ||
      repeatRaw === 'repeat-y'
        ? { repeat: repeatRaw }
        : {}),
    };
  }

  if (bgColor) {
    return {
      type: 'color',
      color: bgColor,
    };
  }

  return undefined;
}

function extractSectionSettings(
  settings: Record<string, unknown>,
  maps?: RewriteUrlMaps,
  defaultPaddingY: SectionSettings['paddingY'] = 'none'
): SectionSettings {
  const hideOn: Device[] = [];
  for (const { device } of ELEMENTOR_DEVICE_MAP) {
    if (bool(settings[`hide_${device}`])) hideOn.push(device);
  }
  const section: SectionSettings = {
    paddingY: defaultPaddingY,
    background: 'default',
    ...(hideOn.length > 0 ? { hideOn } : {}),
    hideOnMobile: hideOn.includes('mobile'),
    hideOnTablet: hideOn.includes('tablet'),
    hideOnDesktop: hideOn.includes('desktop'),
    anchor: str(settings._element_id || settings.css_id).slice(0, 100),
  };

  const pad = collectResponsiveSides(settings, ['_padding', 'padding']);
  if (pad.values) {
    section.spacing = pad.values;
    if (pad.unit) section.spacingUnit = pad.unit;
  }

  const mar = collectResponsiveSides(settings, ['_margin', 'margin']);
  if (mar.values) {
    section.margin = mar.values;
    if (mar.unit) section.marginUnit = mar.unit;
  }

  const fill = extractFill(settings, maps);
  if (fill) section.fill = fill;

  const br = parseBorderRadius(settings._border_radius ?? settings.border_radius);
  const borderColor = safeColor(settings._border_color ?? settings.border_color);
  const borderStyleRaw = str(settings._border_border ?? settings.border_border);
  const borderWidth = collectResponsiveSides(settings, [
    '_border_width',
    'border_width',
  ]);

  if (br.radius || borderColor || borderWidth.values || (borderStyleRaw && borderStyleRaw !== 'none')) {
    const border: BorderSettings = {};
    if (
      borderStyleRaw === 'solid' ||
      borderStyleRaw === 'dashed' ||
      borderStyleRaw === 'dotted' ||
      borderStyleRaw === 'double' ||
      borderStyleRaw === 'groove'
    ) {
      border.style = borderStyleRaw;
    } else if (borderWidth.values) {
      border.style = 'solid';
    }
    if (borderColor) border.color = borderColor;
    if (borderWidth.values) border.width = borderWidth.values;
    if (br.radius) {
      border.radius = br.radius;
      border.radiusUnit = br.radiusUnit;
    }
    section.border = border;
  }

  const textColor = safeColor(settings.color_text ?? settings.text_color);
  if (textColor) section.textColor = textColor;

  if (str(settings.height) === 'full') {
    section.display = { minHeight: 'screen' };
  } else {
    const minH = parseSizeObj(settings.custom_height ?? settings.min_height, 0, 5000);
    if (minH.size && minH.size >= 400) {
      section.display = { minHeight: 'half' };
    }
  }

  return section;
}

function buildElementStyle(
  opts: {
    color?: unknown;
    bgColor?: unknown;
    typography?: Typography;
    borderRadius?: unknown;
    padding?: unknown;
  } = {}
): ElementStyle | undefined {
  const style: ElementStyle = {};
  const color = safeColor(opts.color);
  if (color) style.color = color;
  const bg = safeColor(opts.bgColor);
  if (bg) style.fill = { type: 'color', color: bg };
  if (opts.typography) style.typography = opts.typography;
  const br = parseBorderRadius(opts.borderRadius);
  if (br.radius) {
    style.border = { radius: br.radius, radiusUnit: br.radiusUnit };
  }
  const pad = parseSides(opts.padding);
  if (pad.sides) {
    style.padding = { desktop: pad.sides };
    style.paddingUnit = pad.unit;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function extractPlainTextFromSettings(settings: Record<string, unknown>): string {
  const parts: string[] = [];
  const preferredKeys = [
    'title',
    'heading',
    'title_text',
    'editor',
    'description',
    'description_text',
    'text',
    'content',
    'html',
    'caption',
    'quote',
    'testimonial_content',
    'button_text',
    'label',
  ];
  for (const key of preferredKeys) {
    const val = settings[key];
    if (typeof val === 'string' && val.trim()) {
      parts.push(val.trim());
    }
  }
  if (!parts.length) {
    for (const [key, val] of Object.entries(settings)) {
      if (
        typeof val === 'string' &&
        val.trim().length > 1 &&
        !key.startsWith('_') &&
        !key.includes('color') &&
        !key.includes('unit') &&
        !key.includes('align') &&
        !key.includes('type') &&
        !key.includes('size')
      ) {
        parts.push(val.trim());
      }
    }
  }
  return parts.join('\n\n');
}

function mapFormFieldType(rawType: string): string {
  const t = rawType.toLowerCase();
  switch (t) {
    case 'text':
    case 'email':
    case 'tel':
    case 'textarea':
    case 'number':
    case 'date':
    case 'url':
    case 'select':
    case 'radio':
    case 'checkbox':
    case 'step':
    case 'hidden':
    case 'acceptance':
      return t;
    case 'upload':
    case 'file':
      return 'file';
    default:
      return 'text';
  }
}

function columnsLayoutFor(count: number): '1-1' | '1-1-1' | '1-1-1-1' {
  if (count <= 2) return '1-1';
  if (count === 3) return '1-1-1';
  return '1-1-1-1';
}

function mapFlexDirection(v: unknown): 'row' | 'row-reverse' | 'column' | 'column-reverse' {
  const s = str(v).toLowerCase();
  if (s === 'row' || s === 'row-reverse' || s === 'column' || s === 'column-reverse') {
    return s;
  }
  return 'column';
}

function mapJustify(
  v: unknown
): 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' {
  const s = str(v).toLowerCase();
  if (s === 'center') return 'center';
  if (s === 'flex-end' || s === 'end') return 'end';
  if (s === 'space-between' || s === 'between') return 'between';
  if (s === 'space-around' || s === 'around') return 'around';
  if (s === 'space-evenly' || s === 'evenly') return 'evenly';
  return 'start';
}

function mapAlignItems(
  v: unknown
): 'start' | 'center' | 'end' | 'stretch' | 'baseline' {
  const s = str(v).toLowerCase();
  if (s === 'flex-start' || s === 'start') return 'start';
  if (s === 'center') return 'center';
  if (s === 'flex-end' || s === 'end') return 'end';
  if (s === 'baseline') return 'baseline';
  return 'stretch';
}

function mapVideoUrl(settings: Record<string, unknown>, maps?: RewriteUrlMaps): string {
  const type = str(settings.video_type).toLowerCase();
  if (type === 'vimeo') return safeUrlValue(settings.vimeo_url, maps) ?? '';
  if (type === 'hosted') {
    return (
      safeUrlValue(settings.hosted_url, maps) ??
      safeUrlValue(settings.external_url, maps) ??
      ''
    );
  }
  return (
    safeUrlValue(settings.youtube_url, maps) ??
    safeUrlValue(settings.vimeo_url, maps) ??
    safeUrlValue(settings.hosted_url, maps) ??
    safeUrlValue(settings.external_url, maps) ??
    ''
  );
}

/**
 * Parses `_elementor_data` (string JSON or array) or a standalone Elementor `.json` export.
 */
export function parseElementorPayload(raw: unknown): {
  title?: string;
  elements: ElementorElement[];
} {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { elements: [] };
    parsed = JSON.parse(trimmed);
  }
  if (Array.isArray(parsed)) {
    return { elements: parsed as ElementorElement[] };
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as ElementorTemplateFile;
    const elements = Array.isArray(obj.content)
      ? obj.content
      : Array.isArray(obj.elements)
        ? obj.elements
        : [];
    return {
      title: typeof obj.title === 'string' ? obj.title : undefined,
      elements,
    };
  }
  return { elements: [] };
}

/**
 * Converts an Elementor element tree into a validated `BuilderDocument`.
 */
export function convertElementorToDocument(
  raw: unknown,
  options: {
    pageTitle?: string;
    urlMaps?: RewriteUrlMaps;
    validate?: (doc: BuilderDocument) => string[];
  } = {}
): ElementorConvertResult {
  const { elements } = parseElementorPayload(raw);
  const nodes: Record<string, BuilderNode> = {};
  const fallbackWidgets: string[] = [];
  const warnings: string[] = [];
  const htmlChunks: string[] = [];
  let seq = 0;

  const nextId = (prefix: string, preferred?: string): string => {
    seq += 1;
    const base = preferred
      ? `${prefix}-${preferred.replace(/[^a-zA-Z0-9_-]/g, '')}`
      : `${prefix}-${seq}`;
    return nodes[base] ? `${base}-${seq}` : base;
  };

  const addNode = (
    type: string,
    props: Record<string, unknown>,
    slots: Record<string, string[]> = {},
    preferredId?: string
  ): string => {
    const id = nextId(type, preferredId);
    nodes[id] = { id, type, props, slots };
    return id;
  };

  const convertWidget = (el: ElementorElement): string => {
    const wt = str(el.widgetType).toLowerCase();
    const s = (el.settings ?? {}) as Record<string, unknown>;
    const section = extractSectionSettings(s, options.urlMaps, 'none');

    switch (wt) {
      case 'heading': {
        const text = str(s.title).trim() || 'Heading';
        const levelRaw = str(s.header_size).toLowerCase();
        const level = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(levelRaw)
          ? levelRaw
          : 'h2';
        const sizeRaw = str(s.size).toLowerCase();
        const size = ['sm', 'md', 'lg', 'xl', '2xl'].includes(sizeRaw)
          ? sizeRaw
          : level === 'h1'
            ? '2xl'
            : level === 'h2'
              ? 'xl'
              : 'lg';
        const alignment = mapAlignment(s.align) ?? 'left';
        const headingStyle = buildElementStyle({
          color: s.title_color,
          typography: extractTypography(s, 'typography_'),
        });
        htmlChunks.push(`<${level}>${sanitizeRichText(text)}</${level}>`);
        return addNode('Heading', {
          text,
          level,
          size,
          alignment,
          section,
          ...(headingStyle ? { elements: { heading: headingStyle } } : {}),
        });
      }

      case 'text-editor': {
        const cleaned = cleanWordPressHtml(str(s.editor), options.urlMaps);
        const content = cleaned || '<p></p>';
        const contentStyle = buildElementStyle({
          color: s.text_color,
          typography: extractTypography(s, 'typography_'),
        });
        htmlChunks.push(content);
        return addNode('RichText', {
          content,
          width: 'normal',
          section,
          ...(contentStyle ? { elements: { content: contentStyle } } : {}),
        });
      }

      case 'image': {
        const url = safeUrlValue(s.image, options.urlMaps) ?? '';
        const imageObj = (s.image && typeof s.image === 'object'
          ? s.image
          : {}) as Record<string, unknown>;
        const alt = str(s.image_alt || imageObj.alt);
        const caption = str(s.caption);
        const link = extractLinkProp(s.link, options.urlMaps);
        const imageStyle = buildElementStyle({
          borderRadius: s.image_border_radius,
        });
        if (url) {
          htmlChunks.push(`<p><img src="${url}" alt="${alt.replace(/"/g, '&quot;')}" /></p>`);
        }
        return addNode('Image', {
          url,
          alt,
          caption,
          aspect: 'auto',
          width: 'normal',
          objectFit: 'cover',
          ...(link ? { link } : {}),
          section,
          ...(imageStyle ? { elements: { image: imageStyle } } : {}),
        });
      }

      case 'image-box': {
        const image = safeUrlValue(s.image, options.urlMaps) ?? '';
        const imageAlt = str(s.image_alt);
        const title = str(s.title_text);
        const description = str(s.description_text);
        const pos = str(s.position).toLowerCase();
        const position = pos === 'left' || pos === 'right' ? pos : 'top';
        const alignment = mapAlignment(s.text_align) ?? 'center';
        const link = extractLinkProp(s.link, options.urlMaps);
        const titleStyle = buildElementStyle({
          color: s.title_color,
          typography: extractTypography(s, 'title_typography_'),
        });
        const descStyle = buildElementStyle({
          color: s.description_color,
          typography: extractTypography(s, 'description_typography_'),
        });
        const elementsMap: Record<string, ElementStyle> = {};
        if (titleStyle) elementsMap.title = titleStyle;
        if (descStyle) elementsMap.description = descStyle;
        if (title || description) {
          htmlChunks.push(`<h3>${sanitizeRichText(title)}</h3><p>${sanitizeRichText(description)}</p>`);
        }
        return addNode('ImageBox', {
          image,
          imageAlt,
          title,
          description,
          position,
          alignment,
          imageSize: 'md',
          ...(link ? { link } : {}),
          section,
          ...(Object.keys(elementsMap).length ? { elements: elementsMap } : {}),
        });
      }

      case 'icon': {
        const icon = mapIcon(s.selected_icon ?? s.icon);
        const viewRaw = str(s.view).toLowerCase();
        const view = viewRaw === 'stacked' || viewRaw === 'framed' ? viewRaw : 'default';
        const shapeRaw = str(s.shape).toLowerCase();
        const shape = shapeRaw === 'square' ? 'square' : 'circle';
        const alignment = mapAlignment(s.align) ?? 'center';
        const link = extractLinkProp(s.link, options.urlMaps);
        const iconStyle = buildElementStyle({ color: s.primary_color });
        return addNode('Icon', {
          icon,
          view,
          shape,
          size: 'md',
          alignment,
          ...(link ? { link } : {}),
          section,
          ...(iconStyle ? { elements: { icon: iconStyle } } : {}),
        });
      }

      case 'icon-box': {
        const icon = mapIcon(s.selected_icon ?? s.icon);
        const title = str(s.title_text);
        const description = str(s.description_text);
        const pos = str(s.position).toLowerCase();
        const position = pos === 'left' || pos === 'right' ? pos : 'top';
        const alignment = mapAlignment(s.text_align) ?? 'center';
        const viewRaw = str(s.view).toLowerCase();
        const view = viewRaw === 'stacked' || viewRaw === 'framed' ? viewRaw : 'default';
        const shapeRaw = str(s.shape).toLowerCase();
        const shape = shapeRaw === 'square' ? 'square' : 'circle';
        const link = extractLinkProp(s.link, options.urlMaps);
        const titleStyle = buildElementStyle({
          color: s.title_color,
          typography: extractTypography(s, 'title_typography_'),
        });
        const descStyle = buildElementStyle({
          color: s.description_color,
          typography: extractTypography(s, 'description_typography_'),
        });
        const iconStyle = buildElementStyle({ color: s.primary_color });
        const elementsMap: Record<string, ElementStyle> = {};
        if (titleStyle) elementsMap.title = titleStyle;
        if (descStyle) elementsMap.description = descStyle;
        if (iconStyle) elementsMap.icon = iconStyle;
        if (title || description) {
          htmlChunks.push(`<h3>${sanitizeRichText(title)}</h3><p>${sanitizeRichText(description)}</p>`);
        }
        return addNode('IconBox', {
          icon,
          title,
          description,
          position,
          alignment,
          size: 'md',
          view,
          shape,
          ...(link ? { link } : {}),
          section,
          ...(Object.keys(elementsMap).length ? { elements: elementsMap } : {}),
        });
      }

      case 'button': {
        const label = str(s.text).trim() || 'Button';
        const link = extractLinkProp(s.link, options.urlMaps) ?? '#';
        const alignment = mapAlignment(s.align) ?? 'left';
        const sizeRaw = str(s.size).toLowerCase();
        const size = sizeRaw === 'sm' || sizeRaw === 'xs'
          ? 'sm'
          : sizeRaw === 'lg' || sizeRaw === 'xl'
            ? 'lg'
            : 'md';
        const buttonType = str(s.button_type).toLowerCase();
        const variant = buttonType === 'info' || buttonType === 'warning'
          ? 'secondary'
          : 'primary';
        const btnStyle = buildElementStyle({
          color: s.button_text_color,
          bgColor: s.background_color,
          typography: extractTypography(s, 'typography_'),
          borderRadius: s.border_radius,
          padding: s.text_padding,
        });
        htmlChunks.push(`<p><a href="${typeof link === 'string' ? link : link.url ?? '#'}">${sanitizeRichText(label)}</a></p>`);
        return addNode('Button', {
          label,
          link,
          alignment,
          variant,
          size,
          section,
          ...(btnStyle ? { elements: { button: btnStyle } } : {}),
        });
      }

      case 'spacer': {
        const sizeObj = parseSizeObj(s.space, 0, 400);
        return addNode('Spacer', {
          height: sizeObj.size ?? 50,
          section,
        });
      }

      case 'divider': {
        const styleRaw = str(s.style).toLowerCase();
        const style =
          styleRaw === 'dashed' || styleRaw === 'dotted' ? styleRaw : 'solid';
        const weight = parseSizeObj(s.weight, 1, 20).size ?? 1;
        const color = safeColor(s.color);
        return addNode('Divider', {
          style,
          thickness: weight,
          ...(color ? { color } : {}),
          spacing: 'md',
          section,
        });
      }

      case 'counter': {
        const start = num(s.starting_number) ?? 0;
        const end = num(s.ending_number) ?? 100;
        const duration = clampNum(s.duration, 100, 10000) ?? 2000;
        const prefix = str(s.prefix);
        const suffix = str(s.suffix);
        const sepRaw = str(s.thousand_separator_char);
        const separator = sepRaw === ',' || sepRaw === '.' || sepRaw === ' ' ? sepRaw : ',';
        const title = str(s.title);
        const numberStyle = buildElementStyle({
          color: s.number_color,
          typography: extractTypography(s, 'typography_number_'),
        });
        const titleStyle = buildElementStyle({
          color: s.title_color,
          typography: extractTypography(s, 'typography_title_'),
        });
        const elementsMap: Record<string, ElementStyle> = {};
        if (numberStyle) elementsMap.number = numberStyle;
        if (titleStyle) elementsMap.title = titleStyle;
        return addNode('Counter', {
          start,
          end,
          duration,
          prefix,
          suffix,
          separator,
          title,
          alignment: 'center',
          section,
          ...(Object.keys(elementsMap).length ? { elements: elementsMap } : {}),
        });
      }

      case 'progress': {
        const title = str(s.title);
        const percentObj = parseSizeObj(s.percent, 0, 100);
        const percent = percentObj.size ?? clampNum(s.percent, 0, 100) ?? 50;
        const innerText = str(s.inner_text);
        const showPercent = s.display_percentage !== 'hide';
        const barStyle = buildElementStyle({ bgColor: s.bar_color });
        const trackStyle = buildElementStyle({ bgColor: s.bar_bg_color });
        const elementsMap: Record<string, ElementStyle> = {};
        if (barStyle) elementsMap.bar = barStyle;
        if (trackStyle) elementsMap.track = trackStyle;
        return addNode('ProgressBar', {
          title,
          percent,
          innerText,
          showPercent,
          height: 16,
          section,
          ...(Object.keys(elementsMap).length ? { elements: elementsMap } : {}),
        });
      }

      case 'star-rating': {
        const scale = num(s.rating_scale) === 10 ? 10 : 5;
        const rating = clampNum(s.rating, 0, scale) ?? 5;
        const title = str(s.title);
        const alignment = mapAlignment(s.align) ?? 'left';
        return addNode('StarRating', {
          rating,
          scale,
          title,
          showScore: true,
          size: 'md',
          alignment,
          section,
        });
      }

      case 'countdown': {
        const type = str(s.countdown_type) === 'evergreen' ? 'evergreen' : 'due_date';
        const dueDate = str(s.due_date) || '2026-12-31T23:59:59';
        const evergreenHours = clampNum(s.evergreen_counter_hours, 0, 1000) ?? 24;
        const evergreenMinutes = clampNum(s.evergreen_counter_minutes, 0, 59) ?? 0;
        const actions = Array.isArray(s.expire_actions)
          ? (s.expire_actions as string[])
          : [];
        const expireAction = actions.includes('redirect')
          ? 'redirect'
          : actions.includes('hide')
            ? 'hide'
            : 'message';
        return addNode('Countdown', {
          type,
          dueDate,
          evergreenHours,
          evergreenMinutes,
          showDays: s.show_days !== '',
          showHours: s.show_hours !== '',
          showMinutes: s.show_minutes !== '',
          showSeconds: s.show_seconds !== '',
          expireAction,
          expireMessage: str(s.message_after_expire) || 'This offer has expired.',
          redirectUrl: safeUrlValue(s.expire_redirect_url, options.urlMaps),
          alignment: 'center',
          section,
        });
      }

      case 'flip-box': {
        const eff = str(s.flip_effect).toLowerCase();
        const dirRaw = str(s.flip_direction).toLowerCase();
        const direction =
          dirRaw === 'right'
            ? 'flip-right'
            : dirRaw === 'up'
              ? 'flip-up'
              : dirRaw === 'down'
                ? 'flip-down'
                : eff === 'flip'
                  ? 'flip-left'
                  : 'flip-left';
        const height = parseSizeObj(s.height, 100, 1000).size ?? 320;
        return addNode('FlipBox', {
          direction,
          height,
          frontIcon: mapIcon(s.selected_icon ?? s.icon),
          frontImage: safeUrlValue(s.background_a_image, options.urlMaps) ?? '',
          frontTitle: str(s.title_text_a),
          frontDescription: str(s.description_text_a),
          frontBgColor: safeColor(s.background_a_color),
          backTitle: str(s.title_text_b),
          backDescription: str(s.description_text_b),
          backButtonText: str(s.button_text),
          backButtonLink: safeUrlValue(s.link, options.urlMaps) ?? '/',
          backBgColor: safeColor(s.background_b_color),
          section,
        });
      }

      case 'animated-headline': {
        const styleType = str(s.headline_style) === 'rotate' ? 'rotating' : 'highlight';
        const shapeRaw = str(s.marker).toLowerCase();
        const highlightShape =
          shapeRaw === 'underline' || shapeRaw === 'curly' || shapeRaw === 'strikethrough'
            ? shapeRaw
            : 'circle';
        const rotRaw = str(s.animation_type).toLowerCase();
        const rotatingEffect =
          rotRaw === 'typing' || rotRaw === 'slide' ? rotRaw : 'fade';
        const rotatingWords = str(s.rotating_text)
          .split(/\r?\n/)
          .map(w => w.trim())
          .filter(Boolean);
        const tagRaw = str(s.tag).toLowerCase();
        const tag = ['h1', 'h2', 'h3', 'h4', 'p'].includes(tagRaw) ? tagRaw : 'h2';
        return addNode('AnimatedHeadline', {
          styleType,
          highlightShape,
          rotatingEffect,
          beforeText: str(s.before_text),
          highlightedText: str(s.highlighted_text),
          rotatingWords: rotatingWords.length ? rotatingWords : ['fast', 'modern'],
          afterText: str(s.after_text),
          tag,
          alignment: mapAlignment(s.alignment) ?? 'center',
          ...(safeColor(s.marker_color) ? { strokeColor: safeColor(s.marker_color) } : {}),
          section,
        });
      }

      case 'price-list': {
        const rawList = Array.isArray(s.price_list) ? s.price_list : [];
        const items = rawList
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map(item => ({
            title: str(item.title) || 'Item',
            price: str(item.price) || '$0',
            description: str(item.item_description),
            image: safeUrlValue(item.image, options.urlMaps),
            link: safeUrlValue(item.link, options.urlMaps),
          }));
        const sepRaw = str(s.separator_style).toLowerCase();
        const leaderStyle =
          sepRaw === 'dashed' || sepRaw === 'solid' || sepRaw === 'none'
            ? sepRaw
            : 'dotted';
        return addNode('PriceList', {
          title: str(s.heading) || '',
          leaderStyle,
          columns: 1,
          imagePosition: 'left',
          items,
          section,
        });
      }

      case 'table-of-contents': {
        const rawTags = Array.isArray(s.headings_by_tags)
          ? (s.headings_by_tags as string[])
          : ['h2', 'h3'];
        const levels = rawTags.filter(t => t === 'h2' || t === 'h3' || t === 'h4');
        const markerRaw = str(s.marker_view).toLowerCase();
        const marker =
          markerRaw === 'bullets' || markerRaw === 'none' ? markerRaw : 'numbers';
        return addNode('TableOfContents', {
          title: str(s.title) || 'Table of Contents',
          levels: levels.length ? levels : ['h2', 'h3'],
          collapsible: s.minimize_box !== 'no',
          defaultCollapsed: bool(s.minimized_on),
          marker,
          hierarchical: s.hierarchical_view !== 'no',
          section,
        });
      }

      case 'testimonial-carousel': {
        const rawSlides = Array.isArray(s.slides) ? s.slides : [];
        const items = rawSlides
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map(item => ({
            quote: str(item.content) || '',
            author: str(item.name) || 'Anonymous',
            role: str(item.title),
            avatar: safeUrlValue(item.image, options.urlMaps),
          }))
          .filter(item => item.quote || item.author);
        const perView = clampNum(s.slides_per_view, 1, 3) ?? 1;
        return addNode('TestimonialCarousel', {
          title: '',
          eyebrow: '',
          sliderPerView: perView,
          sliderAutoplay: bool(s.autoplay),
          sliderLoop: s.loop !== 'no',
          items,
          section,
        });
      }

      case 'hotspot': {
        const image = safeUrlValue(s.image, options.urlMaps) ?? '';
        const rawSpots = Array.isArray(s.hotspot) ? s.hotspot : [];
        const spots = rawSpots
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item, idx) => ({
            id: str(item._id) || `spot-${idx + 1}`,
            x: parseSizeObj(item.hotspot_offset_x, 0, 100).size ?? 50,
            y: parseSizeObj(item.hotspot_offset_y, 0, 100).size ?? 50,
            title: str(item.hotspot_label) || `Spot ${idx + 1}`,
            content: sanitizeRichText(str(item.hotspot_tooltip_content)),
            link: safeUrlValue(item.hotspot_link, options.urlMaps),
          }));
        const trigger = str(s.hotspot_tooltip_trigger) === 'click' ? 'click' : 'hover';
        return addNode('Hotspot', {
          image,
          imageAlt: str(s.image_alt),
          trigger,
          pulse: s.hotspot_animation === 'e-hotspot--soft-beat' || s.hotspot_animation === 'expand',
          spots,
          section,
        });
      }

      case 'lottie': {
        const source = str(s.source) === 'media_file' ? 'url' : 'url';
        const url = safeUrlValue(s.source_external_url ?? s.source_json, options.urlMaps) ?? '';
        const trigRaw = str(s.trigger).toLowerCase();
        const trigger =
          trigRaw === 'arriving_to_viewport'
            ? 'view'
            : trigRaw === 'on_hover'
              ? 'hover'
              : trigRaw === 'bind_to_scroll'
                ? 'scroll'
                : 'load';
        return addNode('Lottie', {
          source,
          url,
          trigger,
          loop: bool(s.loop),
          speed: clampNum(s.play_speed, 0.1, 5) ?? 1,
          width: parseSizeObj(s.custom_width, 20, 1200).size ?? 300,
          height: parseSizeObj(s.custom_width, 20, 1200).size ?? 300,
          alignment: mapAlignment(s.align) ?? 'center',
          section,
        });
      }

      case 'accordion':
      case 'toggle': {
        const rawTabs = Array.isArray(s.tabs) ? s.tabs : [];
        const items: Array<{ title: string }> = [];
        const slots: Record<string, string[]> = {};
        rawTabs.forEach((tab, idx) => {
          if (!tab || typeof tab !== 'object') return;
          const t = tab as Record<string, unknown>;
          const title = str(t.tab_title) || `Item ${idx + 1}`;
          const bodyHtml = cleanWordPressHtml(str(t.tab_content), options.urlMaps) || '<p></p>';
          items.push({ title });
          const rtId = addNode('RichText', {
            content: bodyHtml,
            width: 'normal',
            section: { paddingY: 'none', background: 'default' },
          });
          slots[`items[${idx}].content`] = [rtId];
          htmlChunks.push(`<h4>${sanitizeRichText(title)}</h4>${bodyHtml}`);
        });
        if (items.length === 0) {
          items.push({ title: 'Item 1' });
          slots['items[0].content'] = [];
        }
        return addNode(
          'Accordion',
          {
            items,
            allowMultiple: wt === 'toggle',
            section,
          },
          slots
        );
      }

      case 'tabs': {
        const rawTabs = Array.isArray(s.tabs) ? s.tabs : [];
        const items: Array<{ label: string }> = [];
        const slots: Record<string, string[]> = {};
        rawTabs.forEach((tab, idx) => {
          if (!tab || typeof tab !== 'object') return;
          const t = tab as Record<string, unknown>;
          const label = str(t.tab_title) || `Tab ${idx + 1}`;
          const bodyHtml = cleanWordPressHtml(str(t.tab_content), options.urlMaps) || '<p></p>';
          items.push({ label });
          const rtId = addNode('RichText', {
            content: bodyHtml,
            width: 'normal',
            section: { paddingY: 'none', background: 'default' },
          });
          slots[`items[${idx}].content`] = [rtId];
          htmlChunks.push(`<h4>${sanitizeRichText(label)}</h4>${bodyHtml}`);
        });
        if (items.length === 0) {
          items.push({ label: 'Tab 1' });
          slots['items[0].content'] = [];
        }
        return addNode(
          'Tabs',
          {
            items,
            variant: 'underline',
            alignment: mapAlignment(s.tabs_align) === 'center' ? 'center' : 'start',
            section,
          },
          slots
        );
      }

      case 'video': {
        const url = mapVideoUrl(s, options.urlMaps);
        const posterUrl = safeUrlValue(s.image_overlay, options.urlMaps);
        return addNode('Video', {
          url,
          ...(posterUrl ? { posterUrl } : {}),
          section,
        });
      }

      case 'google_maps': {
        const address = str(s.address).trim();
        return addNode('Map', {
          address,
          section,
        });
      }

      case 'gallery':
      case 'image-gallery': {
        const rawImages = Array.isArray(s.gallery)
          ? s.gallery
          : Array.isArray(s.wp_gallery)
            ? s.wp_gallery
            : [];
        const items = rawImages
          .map(img => {
            const url = safeUrlValue(img, options.urlMaps) ?? '';
            const rec = (img && typeof img === 'object' ? img : {}) as Record<string, unknown>;
            return {
              url,
              alt: str(rec.alt),
              caption: str(rec.caption),
            };
          })
          .filter(i => i.url);
        const colsRaw = clampNum(s.columns ?? s.gallery_columns, 2, 4) ?? 3;
        const columns = colsRaw === 2 || colsRaw === 4 ? colsRaw : 3;
        return addNode('Gallery', {
          title: '',
          eyebrow: '',
          subtitle: '',
          columns,
          gap: 'md',
          items,
          section,
        });
      }

      case 'form': {
        const rawFields = Array.isArray(s.form_fields) ? s.form_fields : [];
        const fields = rawFields
          .filter((f): f is Record<string, unknown> => Boolean(f && typeof f === 'object'))
          .map((f, idx) => {
            const rawType = str(f.field_type || 'text');
            const mappedType = mapFormFieldType(rawType);
            const name =
              str(f.custom_id || f.field_label || `field_${idx + 1}`)
                .toLowerCase()
                .replace(/[^a-z0-9_]+/g, '_')
                .replace(/^_+|_+$/g, '') || `field_${idx + 1}`;
            const label =
              mappedType === 'acceptance'
                ? str(f.acceptance_text || f.field_label || 'I agree')
                : str(f.field_label || name);
            return {
              label,
              name,
              type: mappedType,
              required: bool(f.required),
              placeholder: str(f.placeholder),
              options: str(f.field_options),
              ...(mappedType === 'file'
                ? {
                    multiple: bool(f.allow_multiple_upload),
                    ...(num(f.file_sizes) ? { maxSizeMb: num(f.file_sizes) } : {}),
                    accept: 'both',
                  }
                : {}),
              ...(mappedType === 'hidden'
                ? {
                    hiddenSource: 'static',
                    hiddenValue: str(f.field_value),
                  }
                : {}),
            };
          });

        const rawActions = Array.isArray(s.submit_actions)
          ? (s.submit_actions as string[])
          : [];
        const actions = rawActions.filter(
          a => a === 'email' || a === 'redirect' || a === 'webhook' || a === 'mailchimp'
        );

        return addNode('ContactForm', {
          title: str(s.form_name) || '',
          subtitle: '',
          submitText: str(s.button_text) || 'Send',
          successMessage:
            str(s.success_message) || 'Thanks! Your submission has been received.',
          fields,
          ...(actions.length ? { actions } : {}),
          ...(str(s.email_to) ? { emailTo: str(s.email_to) } : {}),
          ...(str(s.email_subject) ? { emailSubject: str(s.email_subject) } : {}),
          ...(safeUrlValue(s.redirect_to, options.urlMaps)
            ? { redirectUrl: safeUrlValue(s.redirect_to, options.urlMaps) }
            : {}),
          section,
        });
      }

      default: {
        const widgetName = wt || 'unknown';
        fallbackWidgets.push(widgetName);
        const pageLabel = options.pageTitle || 'untitled page';
        warnings.push(
          `Elementor widget \`${widgetName}\` converted to plain text on page ${pageLabel}`
        );
        const text = extractPlainTextFromSettings(s);
        const cleaned = text
          ? cleanWordPressHtml(text, options.urlMaps)
          : `<p>[${widgetName}]</p>`;
        const content = cleaned || `<p>[${widgetName}]</p>`;
        htmlChunks.push(content);
        return addNode('RichText', {
          content,
          width: 'normal',
          section,
        });
      }
    }
  };

  const convertColumn = (col: ElementorElement, colCount: number): string => {
    const s = (col.settings ?? {}) as Record<string, unknown>;
    const sizePct = clampNum(s._column_size, 5, 100);
    const width =
      sizePct && colCount > 1 ? `${Math.round(sizePct * 100) / 100}%` : 'fill';
    const vAlignRaw = str(s.content_position).toLowerCase();
    const verticalAlign =
      vAlignRaw === 'center' || vAlignRaw === 'middle'
        ? 'center'
        : vAlignRaw === 'bottom'
          ? 'end'
          : 'start';
    const childIds = (col.elements ?? []).map(convertElement);
    return addNode(
      'Column',
      {
        width,
        verticalAlign,
        section: extractSectionSettings(s, options.urlMaps, 'none'),
      },
      { content: childIds },
      col.id
    );
  };

  const convertSection = (sec: ElementorElement): string => {
    const s = (sec.settings ?? {}) as Record<string, unknown>;
    const sectionSettings = extractSectionSettings(s, options.urlMaps, 'md');
    const children = sec.elements ?? [];
    const columnChildren = children.filter(c => c.elType === 'column');

    let contentIds: string[];
    if (columnChildren.length > 1) {
      const colIds = columnChildren.map(c => convertColumn(c, columnChildren.length));
      const columnsId = addNode(
        'Columns',
        {
          layout: columnsLayoutFor(colIds.length),
          gap: str(s.gap) === 'no' ? 'sm' : str(s.gap) === 'wider' ? 'lg' : 'md',
          verticalAlign:
            str(s.content_position) === 'middle'
              ? 'center'
              : str(s.content_position) === 'bottom'
                ? 'end'
                : 'start',
          section: { paddingY: 'none', background: 'default' },
        },
        { columns: colIds }
      );
      contentIds = [columnsId];
    } else if (columnChildren.length === 1) {
      // Single-column section: unwrap directly into Container's content slot
      contentIds = (columnChildren[0].elements ?? []).map(convertElement);
    } else {
      contentIds = children.map(convertElement);
    }

    const minH = parseSizeObj(s.custom_height ?? s.min_height, 0, 5000);
    const containerSettings: ContainerSettings = {
      mode: 'flex',
      tag: sec.isInner ? 'div' : 'section',
      direction: { desktop: 'column' },
      wrap: { desktop: 'nowrap' },
      justify: { desktop: 'start' },
      alignItems: { desktop: 'stretch' },
      alignContent: { desktop: 'start' },
      boxSizing: 'border-box',
      ...(minH.size ? { minHeight: { desktop: minH.size }, sizeUnit: minH.unit } : {}),
    };

    return addNode(
      'Container',
      {
        container: containerSettings,
        section: sectionSettings,
      },
      { content: contentIds },
      sec.id
    );
  };

  const convertContainer = (cont: ElementorElement): string => {
    const s = (cont.settings ?? {}) as Record<string, unknown>;
    const sectionSettings = extractSectionSettings(s, options.urlMaps, 'md');
    const gapObj = collectResponsiveSizes(s, ['flex_gap'], 0, 200);
    const minHObj = collectResponsiveSizes(s, ['min_height'], 0, 5000);
    const mapFlexWrapValue = (
      v: unknown
    ): 'wrap' | 'wrap-reverse' | 'nowrap' =>
      str(v) === 'wrap'
        ? 'wrap'
        : str(v) === 'wrap-reverse'
          ? 'wrap-reverse'
          : 'nowrap';

    const containerSettings: ContainerSettings = {
      mode: 'flex',
      tag: cont.isInner ? 'div' : 'section',
      direction: {
        desktop: mapFlexDirection(s.flex_direction),
        ...collectResponsiveEnum(s, 'flex_direction', v =>
          mapFlexDirection(v)
        ),
      },
      wrap: {
        desktop: mapFlexWrapValue(s.flex_wrap),
        ...collectResponsiveEnum(s, 'flex_wrap', mapFlexWrapValue),
      },
      justify: {
        desktop: mapJustify(s.flex_justify_content),
        ...collectResponsiveEnum(s, 'flex_justify_content', v => mapJustify(v)),
      },
      alignItems: {
        desktop: mapAlignItems(s.flex_align_items),
        ...collectResponsiveEnum(s, 'flex_align_items', v =>
          mapAlignItems(v)
        ),
      },
      alignContent: { desktop: 'start' },
      boxSizing: 'border-box',
      ...(gapObj.values
        ? { gap: gapObj.values, gapUnit: gapObj.unit }
        : {}),
      ...(minHObj.values
        ? { minHeight: minHObj.values, sizeUnit: minHObj.unit }
        : {}),
      ...(str(s.content_width) === 'full' ? { contentWidth: 'full' } : {}),
    };

    const childIds = (cont.elements ?? []).map(convertElement);
    return addNode(
      'Container',
      {
        container: containerSettings,
        section: sectionSettings,
      },
      { content: childIds },
      cont.id
    );
  };

  const convertElement = (el: ElementorElement): string => {
    if (el.elType === 'section') return convertSection(el);
    if (el.elType === 'container') return convertContainer(el);
    if (el.elType === 'column') return convertColumn(el, 1);
    return convertWidget(el);
  };

  const rootSlot = elements.map(convertElement);

  const document: BuilderDocument = {
    version: DOCUMENT_VERSION,
    root: { props: {} },
    nodes,
    rootSlot,
  };

  const validateFn = options.validate ?? documentIssues;
  const issues = validateFn(document);
  const fallbackHtml = sanitizeRichText(htmlChunks.join('\n')).trim();

  return {
    document,
    fallbackWidgets,
    warnings,
    valid: issues.length === 0,
    issues,
    fallbackHtml,
  };
}
