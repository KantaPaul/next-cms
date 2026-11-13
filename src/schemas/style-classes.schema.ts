import { z } from 'zod';
import {
  type StyleClass,
  allowsCssContent,
  isValidCssContent,
  isValidState,
  parseVariantKey,
  STYLE_CLASS_CSS_PROPERTIES,
  sanitizeCssValue,
} from '@nextcms/builder-core';

/** CSS-safe slug: lowercase, starts with a letter, digits/hyphens allowed. */
export const styleClassNameSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z][a-z0-9-]{0,79}$/, 'Class names must be lowercase slugs (a-z, 0-9, -).');

export const styleClassKindSchema = z.enum(['class', 'tag']);

/** Tags that can carry a global tag style: text and media tags plus the Element block's layout tags. */
export const styleClassTagSchema = z.enum([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'blockquote',
  'strong',
  'em',
  'small',
  'code',
  'pre',
  'hr',
  'img',
  'video',
  'label',
  'input',
  'textarea',
  'select',
  'table',
  'th',
  'td',
  'div',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'nav',
  'main',
  'span',
  'ul',
  'ol',
  'li',
  'figure',
  'figcaption',
  'a',
  'button',
]);

/** One device/state → CSS declaration block. Every value must sanitize and every
 *  property must be on the CSS allowlist. `content` is checked here and is only
 *  allowed on `::before`/`::after` variants (see styleClassVariantSchema). */
const cssDeclarationsSchema = z
  .record(z.string(), z.string())
  .refine(decls => {
    for (const [prop, val] of Object.entries(decls)) {
      const sanitized = sanitizeCssValue(val);
      if (sanitized === null) return false;
      if (prop === 'content') {
        if (!isValidCssContent(sanitized)) return false;
        continue;
      }
      if (!STYLE_CLASS_CSS_PROPERTIES.has(prop)) return false;
    }
    return true;
  }, 'Declaration contains a disallowed property or an unsafe value.');

export const styleClassVariantSchema = z
  .record(
    z.string().refine(key => {
      const { device, state } = parseVariantKey(key);
      return Boolean(device) && isValidState(state);
    }, 'Variant keys must be a device id plus an optional known state (e.g. tablet:hover).'),
    cssDeclarationsSchema
  )
  .superRefine((variants, ctx) => {
    for (const [key, decls] of Object.entries(variants)) {
      if ('content' in decls && !allowsCssContent(parseVariantKey(key).state)) {
        ctx.addIssue({
          code: 'custom',
          path: [key, 'content'],
          message: '`content` is only allowed on ::before and ::after variants.',
        });
      }
    }
  });

const styleClassFields = z.object({
  name: styleClassNameSchema,
  kind: styleClassKindSchema,
  tag: styleClassTagSchema.optional(),
  /** Combo classes only: id of the base class. */
  comboOf: z.string().min(1).max(64).optional(),
  variants: styleClassVariantSchema.default({}),
});

type StyleClassShape = Partial<z.infer<typeof styleClassFields>>;

/** Rules that span fields: tag classes need a tag, only plain classes can be combos. */
function checkKindRules(value: StyleClassShape, ctx: z.RefinementCtx) {
  if (value.kind === 'tag') {
    if (!value.tag) ctx.addIssue({ code: 'custom', path: ['tag'], message: 'Tag styles need a tag.' });
    if (value.comboOf) {
      ctx.addIssue({ code: 'custom', path: ['comboOf'], message: 'Tag styles cannot be combo classes.' });
    }
  } else if (value.kind === 'class' && value.tag) {
    ctx.addIssue({ code: 'custom', path: ['tag'], message: 'Only tag styles have a tag.' });
  }
}

/** Input for creating a class. */
export const styleClassSchema = styleClassFields.superRefine(checkKindRules);

/**
 * Input for updating a class. `kind`, `tag` and `comboOf` are fixed after
 * creation (changing them would silently restyle every element using it), so
 * they are dropped from a patch rather than rejected.
 */
export const styleClassPatchSchema = z.object({
  name: styleClassNameSchema.optional(),
  // No default here: a rename must not reset the variants.
  variants: styleClassVariantSchema.optional(),
});

export type StyleClassInput = z.input<typeof styleClassSchema>;

/** What callers may send to create a class; checked with `styleClassSchema` on the server. */
export type StyleClassCreateRequest = {
  name: string;
  kind: 'class' | 'tag';
  tag?: string;
  comboOf?: string;
  variants?: Record<string, Record<string, string>>;
};
export type StyleClassPatch = z.infer<typeof styleClassPatchSchema>;
export type StyleClassVariants = StyleClass['variants'];
