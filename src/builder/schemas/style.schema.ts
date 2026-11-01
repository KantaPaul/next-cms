import { z } from 'zod';
import {
  BORDER_STYLES,
  EASINGS,
  ENTRANCES,
  EXITS,
  FONT_STYLES,
  HOVERS,
  LENGTH_UNITS,
  PAGE_TRANSITIONS,
  SPACING_UNITS,
  TEXT_DECORATIONS,
  TEXT_TRANSFORMS,
  TRIGGERS,
} from '../style';

/** Enforce non-empty responsive record or literal */
export function responsive<T extends z.ZodTypeAny>(schema: T) {
  return z.union([
    schema,
    z.object({
      desktop: schema.optional(),
      tablet: schema.optional(),
      mobile: schema.optional(),
    }),
  ]);
}

/** Color schema rejecting dangerous characters */
export const colorSchema = z.string().refine(
  val => {
    if (!val) return true;
    const v = val.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return true;
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(v)) return true;
    if (/^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+\s*)?\)$/.test(v)) return true;
    if (/^var\(--[a-zA-Z0-9_-]+\)$/.test(v)) return true;
    return false;
  },
  { message: 'Invalid color format' }
);

/** URL schema rejecting javascript: protocols and XSS vectors */
export const safeUrlSchema = z.string().refine(
  val => {
    if (!val) return true;
    const trimmed = val.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
      return false;
    }
    return true;
  },
  { message: 'URL protocol not allowed' }
);

export const urlValueSchema = z.union([
  safeUrlSchema,
  z.object({
    url: safeUrlSchema.optional(),
    newTab: z.boolean().optional(),
    nofollow: z.boolean().optional(),
  }),
]);

export const sidesSchema = z.object({
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
});

export const lengthUnitSchema = z.enum(LENGTH_UNITS as any);
export const spacingUnitSchema = z.enum(SPACING_UNITS as any);

export const shadowSchema = z.object({
  x: z.number().min(-50).max(50).optional(),
  y: z.number().min(-50).max(50).optional(),
  blur: z.number().min(0).max(100).optional(),
  spread: z.number().min(-50).max(50).optional(),
  color: colorSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
  inset: z.boolean().optional(),
});

export const fillSchema = z.object({
  type: z.enum(['color', 'gradient', 'image', 'video']).optional(),
  color: colorSchema.optional(),
  colorDark: colorSchema.optional(),
  from: colorSchema.optional(),
  to: colorSchema.optional(),
  angle: z.number().min(0).max(360).optional(),
  start: z.number().min(0).max(100).optional(),
  end: z.number().min(0).max(100).optional(),
  gradientType: z.enum(['linear', 'radial']).optional(),
  gradientPosition: z.string().optional(),
  attachment: z.enum(['scroll', 'fixed']).optional(),
  posX: z.number().min(0).max(100).optional(),
  posY: z.number().min(0).max(100).optional(),
  image: safeUrlSchema.optional(),
  size: z.union([z.enum(['cover', 'contain', 'auto']), z.string(), responsive(z.string())]).optional(),
  position: z.union([z.enum(['center', 'top', 'bottom', 'left', 'right']), z.string(), responsive(z.string())]).optional(),
  repeat: z.enum(['no-repeat', 'repeat', 'repeat-x', 'repeat-y']).optional(),
  videoUrl: safeUrlSchema.optional(),
  videoFallback: safeUrlSchema.optional(),
});

export const imageSizeSchema = z.object({
  size: z.enum(['thumbnail', 'medium', 'large', 'full', 'custom']).optional(),
  width: z.number().min(1).max(5000).optional(),
  height: z.number().min(1).max(5000).optional(),
});

export const borderSchema = z.object({
  style: z.enum(['none', ...BORDER_STYLES] as any).optional(),
  color: colorSchema.optional(),
  width: responsive(sidesSchema).optional(),
  radius: responsive(z.number().min(0).max(200)).optional(),
  radiusUnit: lengthUnitSchema.optional(),
});

export const textShadowSchema = z.object({
  x: z.number().min(-50).max(50).optional(),
  y: z.number().min(-50).max(50).optional(),
  blur: z.number().min(0).max(100).optional(),
  color: colorSchema.optional(),
});

export const textStrokeSchema = z.object({
  width: responsive(z.number().min(0).max(50)).optional(),
  color: colorSchema.optional(),
});

export const typographySchema = z.object({
  size: responsive(z.enum(['', 'sm', 'md', 'lg', 'xl'])).optional(),
  weight: responsive(z.union([z.enum(['', 'regular', 'medium', 'bold']), z.number().min(100).max(900), z.string()])).optional(),
  family: z.string().optional(),
  fontStyle: z.enum(FONT_STYLES as any).optional(),
  fontSize: responsive(z.number().min(0).max(200)).optional(),
  fontSizeUnit: lengthUnitSchema.optional(),
  fontWeight: z.number().min(100).max(900).optional(),
  transform: z.enum(TEXT_TRANSFORMS as any).optional(),
  decoration: z.enum(TEXT_DECORATIONS as any).optional(),
  lineHeight: responsive(z.number().min(0).max(12)).optional(),
  lineHeightUnit: lengthUnitSchema.optional(),
  letterSpacing: responsive(z.number().min(-50).max(50)).optional(),
  letterSpacingUnit: lengthUnitSchema.optional(),
  wordSpacing: responsive(z.number().min(-50).max(50)).optional(),
  wordSpacingUnit: lengthUnitSchema.optional(),
  textShadow: textShadowSchema.optional(),
  textStroke: textStrokeSchema.optional(),
});

export const filterSchema = z.object({
  blur: z.number().min(0).max(10).optional(),
  brightness: z.number().min(0).max(200).optional(),
  contrast: z.number().min(0).max(200).optional(),
  saturate: z.number().min(0).max(200).optional(),
  grayscale: z.number().min(0).max(100).optional(),
  hue: z.number().min(0).max(360).optional(),
  hueRotate: z.number().min(0).max(360).optional(),
});

export const animationSchema = z.object({
  entrance: z.enum(['none', '', ...ENTRANCES] as any).optional(),
  exit: z.enum(['none', '', ...EXITS] as any).optional(),
  trigger: z.enum(TRIGGERS as any).optional(),
  duration: z.number().min(0.2).max(5).optional(),
  delay: z.number().min(0).max(5).optional(),
  easing: z.enum(EASINGS as any).optional(),
  once: z.boolean().optional(),
  stagger: z.number().min(0).max(2).optional(),
  hover: z.enum(['none', '', ...HOVERS] as any).optional(),
  devices: z
    .object({
      desktop: z.boolean().optional(),
      tablet: z.boolean().optional(),
      mobile: z.boolean().optional(),
    })
    .optional(),
});

export const displaySchema = z.object({
  overflow: z.enum(['visible', 'hidden', 'auto']).optional(),
  minHeight: responsive(z.enum(['auto', 'half', 'screen'])).optional(),
  contentAlign: responsive(z.enum(['start', 'center', 'end'])).optional(),
  zIndex: z.number().min(0).max(50).optional(),
});

export const elementHoverStyleSchema = z.object({
  color: colorSchema.optional(),
  fill: z.union([fillSchema, colorSchema]).optional(),
  borderColor: colorSchema.optional(),
  shadow: shadowSchema.optional(),
  filter: filterSchema.optional(),
});

export const elementStyleSchema = z.object({
  color: colorSchema.optional(),
  typography: typographySchema.optional(),
  textStroke: textStrokeSchema.optional(),
  textShadow: textShadowSchema.optional(),
  fill: z.union([fillSchema, colorSchema]).optional(),
  border: borderSchema.optional(),
  shadow: z.union([shadowSchema, z.enum(['none', 'sm', 'md', 'lg'])]).optional(),
  padding: responsive(sidesSchema).optional(),
  paddingUnit: spacingUnitSchema.optional(),
  margin: responsive(sidesSchema).optional(),
  marginUnit: spacingUnitSchema.optional(),
  filter: filterSchema.optional(),
  imageSize: imageSizeSchema.optional(),
  hover: elementHoverStyleSchema.optional(),
});

export const sectionSettingsSchema = z.object({
  paddingY: z.enum(['none', 'sm', 'md', 'lg']).optional(),
  background: z.enum(['default', 'muted', 'primary', 'dark']).optional(),
  hideOnMobile: z.boolean().optional(),
  hideOnTablet: z.boolean().optional(),
  hideOnDesktop: z.boolean().optional(),
  anchor: z.string().max(100).optional(),
  spacing: responsive(sidesSchema).optional(),
  spacingUnit: spacingUnitSchema.optional(),
  align: responsive(z.enum(['', 'left', 'center', 'right'])).optional(),
  fill: fillSchema.optional(),
  textColor: colorSchema.optional(),
  typography: typographySchema.optional(),
  border: borderSchema.optional(),
  shadow: z.union([shadowSchema, z.enum(['none', 'sm', 'md', 'lg'])]).optional(),
  display: displaySchema.optional(),
  animation: animationSchema.optional(),
  filter: filterSchema.optional(),
  hover: z
    .object({
      fill: fillSchema.optional(),
      textColor: colorSchema.optional(),
      borderColor: colorSchema.optional(),
      opacity: z.number().min(0).max(1).optional(),
      scale: z.number().min(0.5).max(1.5).optional(),
      shadow: shadowSchema.optional(),
      filter: filterSchema.optional(),
    })
    .optional(),
  margin: responsive(sidesSchema).optional(),
  marginUnit: spacingUnitSchema.optional(),
  width: responsive(z.number().min(0).max(100)).optional(),
  widthUnit: lengthUnitSchema.optional(),
  zIndex: z.number().min(0).max(50).optional(),
});
