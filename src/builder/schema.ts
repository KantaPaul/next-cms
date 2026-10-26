import { z } from 'zod';
import { BLOCK_ICONS } from './icons';

const str = (max = 400) => z.string().max(max);
const optStr = (max = 400) => z.string().max(max).optional();
const icon = z
  .string()
  .optional()
  .transform(v => (v && v in BLOCK_ICONS ? v : 'Sparkles'));

/** Prop schemas for blocks the AI is allowed to generate. Media-bound blocks are excluded. */
export const GENERATABLE_BLOCKS = {
  Hero: z.object({
    badge: optStr(60),
    title: str(140).min(1),
    subtitle: optStr(400),
    primaryButtonText: optStr(40),
    primaryButtonLink: optStr(200),
    secondaryButtonText: optStr(40),
    secondaryButtonLink: optStr(200),
    alignment: z.enum(['left', 'center']).optional(),
  }),
  Features: z.object({
    eyebrow: optStr(60),
    title: optStr(140),
    subtitle: optStr(300),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
    items: z
      .array(
        z.object({ icon, title: str(80).min(1), description: optStr(300) })
      )
      .min(1)
      .max(12),
  }),
  Stats: z.object({
    headline: optStr(140),
    items: z
      .array(
        z.object({
          value: str(20).min(1),
          label: str(60).min(1),
          change: optStr(60),
        })
      )
      .min(1)
      .max(6),
  }),
  Pricing: z.object({
    eyebrow: optStr(60),
    title: optStr(140),
    subtitle: optStr(300),
    plans: z
      .array(
        z.object({
          name: str(40).min(1),
          price: str(20).min(1),
          period: optStr(30),
          description: optStr(200),
          features: z.array(z.object({ text: str(120) })).max(12),
          buttonText: optStr(40),
          buttonLink: optStr(200),
          popular: z.boolean().optional(),
        })
      )
      .min(1)
      .max(4),
  }),
  Testimonials: z.object({
    eyebrow: optStr(60),
    title: optStr(140),
    items: z
      .array(
        z.object({
          quote: str(500).min(1),
          author: str(80).min(1),
          role: optStr(80),
          company: optStr(80),
        })
      )
      .min(1)
      .max(6),
  }),
  FAQ: z.object({
    eyebrow: optStr(60),
    title: optStr(140),
    items: z
      .array(z.object({ question: str(200).min(1), answer: str(800).min(1) }))
      .min(1)
      .max(12),
  }),
  CTA: z.object({
    badge: optStr(60),
    title: str(140).min(1),
    description: optStr(300),
    primaryButtonText: optStr(40),
    primaryButtonLink: optStr(200),
    secondaryButtonText: optStr(40),
    secondaryButtonLink: optStr(200),
    variant: z.enum(['gradient', 'primary', 'subtle']).optional(),
  }),
  RichText: z.object({
    content: str(8000).min(1),
  }),
  ContactForm: z.object({
    title: optStr(140),
    subtitle: optStr(300),
    submitText: optStr(40),
  }),
} as const;

export type GeneratableBlockType = keyof typeof GENERATABLE_BLOCKS;

export const generatedBlockSchema = z
  .object({ type: z.string(), props: z.record(z.string(), z.unknown()) })
  .transform((block, ctx) => {
    const schema = GENERATABLE_BLOCKS[block.type as GeneratableBlockType];
    if (!schema) {
      ctx.addIssue({
        code: 'custom',
        message: `Unknown block type "${block.type}"`,
      });
      return z.NEVER;
    }
    const parsed = schema.safeParse(block.props);
    if (!parsed.success) {
      parsed.error.issues.forEach(issue =>
        ctx.addIssue({
          code: 'custom',
          message: `${block.type}.${issue.path.join('.')}: ${issue.message}`,
        })
      );
      return z.NEVER;
    }
    return {
      type: block.type as GeneratableBlockType,
      props: parsed.data as Record<string, unknown>,
    };
  });

export const generatedPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .max(120)
    .transform(s =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    ),
  seo: z.object({
    title: z.string().max(80),
    description: z.string().max(200),
  }),
  blocks: z.array(generatedBlockSchema).min(1).max(14),
});

export type GeneratedPage = z.output<typeof generatedPageSchema>;

/** Compact human-readable description of every generatable block, for the prompt. */
export const BLOCK_PROMPT_GUIDE = `
- Hero: { badge?, title, subtitle?, primaryButtonText?, primaryButtonLink?, secondaryButtonText?, secondaryButtonLink?, alignment?: "left"|"center" }
- Features: { eyebrow?, title?, subtitle?, columns?: 2|3|4, items: [{ icon?: one of ${Object.keys(BLOCK_ICONS).join('|')}, title, description? }] }
- Stats: { headline?, items: [{ value, label, change? }] (max 6) }
- Pricing: { eyebrow?, title?, subtitle?, plans: [{ name, price, period?, description?, features: [{ text }], buttonText?, buttonLink?, popular?: boolean }] (max 4) }
- Testimonials: { eyebrow?, title?, items: [{ quote, author, role?, company? }] }
- FAQ: { eyebrow?, title?, items: [{ question, answer }] }
- CTA: { badge?, title, description?, primaryButtonText?, primaryButtonLink?, secondaryButtonText?, secondaryButtonLink?, variant?: "gradient"|"primary"|"subtle" }
- RichText: { content: HTML string using only <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote> }
- ContactForm: { title?, subtitle?, submitText? }
`.trim();
