import { clamp, pick, safeColor } from './style';

export const MORPH_EFFECTS = ['image', 'color', 'gradient'] as const;
export type MorphEffect = (typeof MORPH_EFFECTS)[number];

export const MORPH_EASINGS = [
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'ease-out-back',
  'ease-in-back',
  'ease-out-quintic',
  'ease-in-quintic',
  'ease-out-cubic',
  'ease-in-cubic',
  'ease-out-quad',
  'ease-in-quad',
  'ease-out-quint',
  'ease-in-quint',
  'ease-out-quart',
  'ease-in-quart',
  'ease-out-expo',
  'ease-in-expo',
  'ease-out-circ',
  'ease-in-circ',
] as const;
export type MorphEasing = (typeof MORPH_EASINGS)[number];

export const MORPH_DIRECTIONS = ['normal', 'reverse', 'alternate'] as const;
export type MorphDirection = (typeof MORPH_DIRECTIONS)[number];

/** Four built-in closed blob paths in a shared viewBox. Not ElementsKit artwork. */
const DEFAULT_BLOB_SHAPES: { d: string }[] = [
  {
    d: 'M50 5 C60 5 68 12 68 22 C68 34 58 44 46 44 C34 44 26 34 26 22 C26 12 34 5 50 5 Z',
  },
  {
    d: 'M70 30 C78 30 84 37 83 45 C82 53 74 58 66 55 C58 52 54 45 56 38 C58 31 64 30 70 30 Z',
  },
  {
    d: 'M30 55 C36 48 46 45 55 47 C65 49 72 55 70 62 C68 69 58 73 49 70 C40 67 34 62 32 55 Z',
  },
  {
    d: 'M30 25 C32 34 28 44 36 50 C44 56 54 56 60 50 C66 44 66 34 60 25 C54 16 44 12 36 16 C28 20 28 25 30 25 Z',
  },
];

export type MorphCustomShape = { d: string };

export type MorphShape =
  | { type: 'default'; shapes: MorphCustomShape[] }
  | { type: 'custom'; shapes: MorphCustomShape[] };

export type MorphImageStyle = {
  url?: string;
  opacity?: number;
  zoom?: number;
  posX?: number;
  posY?: number;
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  grayscale?: number;
};

export type MorphColorStyle = {
  opacity?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

export type MorphGradientStyle = {
  opacity?: number;
  from?: string;
  to?: string;
  angle?: number;
  start?: number;
  end?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

export type MorphTiming = {
  easing?: MorphEasing;
  direction?: MorphDirection;
  loop?: boolean;
  duration?: number;
  delay?: number;
  endDelay?: number;
};

/** Stored morph input. Unknown keys are dropped by resolveMorph. */
export type MorphData = {
  effect?: string;
  image?: MorphImageStyle;
  color?: MorphColorStyle;
  gradient?: MorphGradientStyle;
  shape?: MorphShape;
  timing?: MorphTiming;
};

export type ResolvedMorph = {
  effect: MorphEffect;
  image: MorphImageStyle;
  color: MorphColorStyle;
  gradient: MorphGradientStyle;
  shape: MorphShape;
  timing: MorphTiming;
};

const DEFAULT_IMAGE: MorphImageStyle = {
  opacity: 1,
  zoom: 1,
  posX: 50,
  posY: 50,
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
};

const DEFAULT_COLOR: MorphColorStyle = {
  opacity: 1,
  fill: '#4f46e5',
  stroke: '',
  strokeWidth: 0,
};

const DEFAULT_GRADIENT: MorphGradientStyle = {
  opacity: 1,
  from: '#6366f1',
  to: '#ec4899',
  angle: 135,
  start: 0,
  end: 100,
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 0,
};

const MAX_DURATION = 30;
const MAX_DELAY = 30;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

export const DEFAULT_MORPH_SHAPES: MorphCustomShape[] = DEFAULT_BLOB_SHAPES.map(
  shape => ({ d: shape.d })
);

const asStyle = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

const DEFAULT_SHAPE: MorphShape = { type: 'default', shapes: DEFAULT_BLOB_SHAPES.map(s => ({ d: s.d })) };

function resolveShape(raw: unknown): MorphShape {
  const data = isRecord(raw) ? raw : {};
  const type = pick(data.type, ['default', 'custom'] as const);

  if (type === 'custom') {
    const rawShapes = Array.isArray(data.shapes) ? data.shapes : [];
    const shapes: string[] = [];
    for (const item of rawShapes) {
      const d = isRecord(item) ? item.d : undefined;
      if (typeof d === 'string' && d.trim().length > 0) shapes.push(d);
    }

    if (shapes.length < 2 || shapes.length > 6) {
      return { type: 'default', shapes: DEFAULT_BLOB_SHAPES.map(s => ({ d: s.d })) };
    }
    return { type: 'custom', shapes: shapes.map(d => ({ d })) };
  }

  return { type: 'default', shapes: DEFAULT_BLOB_SHAPES.map(s => ({ d: s.d })) };
}

function resolveTiming(raw: unknown): MorphTiming {
  const data = isRecord(raw) ? raw : {};
  const easing = (MORPH_EASINGS as readonly string[]).includes(
    String(data.easing ?? '')
  )
    ? (data.easing as MorphEasing)
    : 'ease-in-out';
  const direction = pick<MorphDirection>(data.direction, MORPH_DIRECTIONS) ?? 'normal';
  const loop = data.loop === true;
  const duration = clamp(data.duration, 0.2, MAX_DURATION) ?? 0.6;
  const delay = clamp(data.delay, 0, MAX_DELAY) ?? 0;
  const endDelay = clamp(data.endDelay, 0, MAX_DELAY) ?? 0;
  return { easing, direction, loop, duration, delay, endDelay };
}

/**
 * The only reader of the stored morph JSON. Drops unknown keys with the shared
 * pick / clamp / safeColor / safeUrl helpers and resolves defaults.
 */
export function resolveMorph(raw: unknown): ResolvedMorph {
  const data = isRecord(raw) ? raw : {};
  const effect = pick<MorphEffect>(data.effect, MORPH_EFFECTS) ?? 'image';
  const imageRaw = asStyle(data.image);
  const colorRaw = asStyle(data.color);
  const gradientRaw = asStyle(data.gradient);

  const image: MorphImageStyle = {
    opacity: clamp(imageRaw.opacity, 0, 1) ?? DEFAULT_IMAGE.opacity,
    zoom: clamp(imageRaw.zoom, 0.5, 2) ?? DEFAULT_IMAGE.zoom,
    posX: clamp(imageRaw.posX, 0, 100) ?? DEFAULT_IMAGE.posX,
    posY: clamp(imageRaw.posY, 0, 100) ?? DEFAULT_IMAGE.posY,
    blur: clamp(imageRaw.blur, 0, 20) ?? DEFAULT_IMAGE.blur,
    brightness: clamp(imageRaw.brightness, 0, 200) ?? DEFAULT_IMAGE.brightness,
    contrast: clamp(imageRaw.contrast, 0, 200) ?? DEFAULT_IMAGE.contrast,
    saturate: clamp(imageRaw.saturate, 0, 200) ?? DEFAULT_IMAGE.saturate,
    grayscale: clamp(imageRaw.grayscale, 0, 100) ?? DEFAULT_IMAGE.grayscale,
  };

  const color: MorphColorStyle = {
    opacity: clamp(colorRaw.opacity, 0, 1) ?? DEFAULT_COLOR.opacity,
    fill: safeColor(colorRaw.fill) ?? DEFAULT_COLOR.fill,
    stroke: safeColor(colorRaw.stroke) ?? DEFAULT_COLOR.stroke,
    strokeWidth: clamp(colorRaw.strokeWidth, 0, 20) ?? DEFAULT_COLOR.strokeWidth,
  };

  const gradient: MorphGradientStyle = {
    opacity: clamp(gradientRaw.opacity, 0, 1) ?? DEFAULT_GRADIENT.opacity,
    from: safeColor(gradientRaw.from) ?? DEFAULT_GRADIENT.from,
    to: safeColor(gradientRaw.to) ?? DEFAULT_GRADIENT.to,
    angle: clamp(gradientRaw.angle, 0, 360) ?? DEFAULT_GRADIENT.angle,
    start: clamp(gradientRaw.start, 0, 100) ?? DEFAULT_GRADIENT.start,
    end: clamp(gradientRaw.end, 0, 100) ?? DEFAULT_GRADIENT.end,
    x1: clamp(gradientRaw.x1, 0, 100) ?? DEFAULT_GRADIENT.x1,
    y1: clamp(gradientRaw.y1, 0, 100) ?? DEFAULT_GRADIENT.y1,
    x2: clamp(gradientRaw.x2, 0, 100) ?? DEFAULT_GRADIENT.x2,
    y2: clamp(gradientRaw.y2, 0, 100) ?? DEFAULT_GRADIENT.y2,
  };

  const shape = resolveShape(data.shape);
  const timing = resolveTiming(data.timing);

  return { effect, image, color, gradient, shape, timing };
}

/** Path data for the resolved shape: built-in blobs or the sanitized custom shapes. */
export function morphShapePaths(m: ResolvedMorph): string[] {
  return m.shape.shapes.map(shape => shape.d);
}

/** Extracts a sanitized path `d` from an uploaded SVG. The stored value is path data, never SVG markup. */
export function extractSvgPath(svg: string): string | null {
  if (typeof svg !== 'string') return null;
  const markup = svg.slice(0, 100_000);
  const match = markup.match(/<path[^>]*\sd="([^"]+)"/i);
  const d = match?.[1]?.trim();
  if (!d || !d.startsWith('M') && !d.startsWith('m')) return null;
  return d;
}
