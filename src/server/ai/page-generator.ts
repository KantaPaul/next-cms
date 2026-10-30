import 'server-only';
import { z } from 'zod';
import { pageDefinitions } from '@/builder/definitions';
import { defaultProps } from '@nextcms/builder-core';
import { type BuilderData, createBlockId } from '@/builder/data';
import { BLOCK_PROMPT_GUIDE, generatedPageSchema } from '@/builder/schema';
import { SUPPORTED_LANGUAGES } from '@/db/schemas/shared.schema';
import { generateJson } from './gemini';

export const generatePageSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, 'Describe the page in at least a few words')
    .max(2000),
  pageType: z
    .enum(['landing', 'pricing', 'about', 'product', 'event', 'other'])
    .default('landing'),
  tone: z.string().trim().max(60).optional(),
  language: z.string().default('en'),
});

export type GeneratePageInput = z.input<typeof generatePageSchema>;

/** Generates a full builder page and converts it to Puck data with defaults and ids filled in. */
export async function generatePageFromPrompt(
  input: z.output<typeof generatePageSchema>
) {
  const language =
    SUPPORTED_LANGUAGES.find(l => l.value === input.language)?.label ??
    'English';

  const page = await generateJson(
    `You are a senior conversion copywriter and web designer. Build a ${input.pageType} web page from the brief below.
Write all copy in ${language}${input.tone ? ` with a ${input.tone} tone` : ''}. Use specific, concrete copy (no lorem ipsum, no placeholders like [Company]).
Use 4 to 8 blocks in a sensible order (usually starting with Hero and ending with CTA). Links should be relative paths like "/pricing" or "#contact".

Return JSON with this exact shape:
{ "title": string, "slug": string (kebab-case), "seo": { "title": string (max 60 chars), "description": string (max 160 chars) }, "blocks": [{ "type": BlockType, "props": {...} }] }

Allowed block types and their props:
${BLOCK_PROMPT_GUIDE}

Brief:
${input.prompt}`,
    generatedPageSchema,
    [],
    0.8
  );

  const data: BuilderData = {
    root: { props: { maxWidth: 'xl', theme: 'site', paddingY: 'none' } },
    content: page.blocks.map(block => {
      const defaults = (pageDefinitions[block.type]
        ? defaultProps(pageDefinitions[block.type])
        : {}) as Record<string, unknown>;
      return {
        type: block.type,
        props: { ...defaults, ...block.props, id: createBlockId(block.type) },
      };
    }),
    zones: {},
  };

  return { title: page.title, slug: page.slug, seo: page.seo, data };
}
