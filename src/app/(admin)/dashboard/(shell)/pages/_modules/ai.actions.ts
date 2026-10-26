'use server';
import { z } from 'zod';
import { mediaService } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { applyCopy, collectCopy, extractPlainText } from '@/builder/text';
import { PERMISSIONS } from '@/config/permissions';
import { SUPPORTED_LANGUAGES } from '@/db/schemas/shared.schema';
import { ApplicationException } from '@/lib/utils/error';
import { generateJson, imagePart, isAiConfigured } from '@/server/ai/gemini';
import {
  generatePageFromPrompt,
  generatePageSchema,
} from '@/server/ai/page-generator';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { storage } from '@/server/storage';

const aiProcedure = permissionProcedure(PERMISSIONS.PAGES_EDIT).use(
  async ({ ctx }) => {
    if (!isAiConfigured())
      throw new ApplicationException(
        'AI is not configured. Set GEMINI_API_KEY to enable it.'
      );
    return ctx;
  }
);

const languageName = (code?: string | null) =>
  SUPPORTED_LANGUAGES.find(l => l.value === code)?.label ?? code ?? 'English';

export const getAiStatus = permissionProcedure(PERMISSIONS.PAGES_EDIT).query(
  async () => ({
    enabled: isAiConfigured(),
  })
);

const seoResultSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1).max(170),
  keywords: z.string().max(300),
});

export const generateSeo = aiProcedure
  .input(z.object({ pageId: z.string().min(1) }))
  .action(async ({ input }) => {
    const page = await pagesServices.getById({ id: input.pageId });
    if (!page) throw new ApplicationException('Page not found');

    const body = extractPlainText(page.content, 5000);
    return generateJson(
      `You write SEO metadata for a web page. Language: ${languageName(page.language)}.
Return JSON {"title": string (max 60 chars), "description": string (120-160 chars), "keywords": string (5-8 comma-separated keywords)}.
Page title: ${page.title}
Page content:
${body || '(empty page)'}`,
      seoResultSchema,
      [],
      0.4
    );
  });

const REWRITE_INSTRUCTIONS = {
  rewrite:
    'Rewrite each text to be clearer and more engaging while keeping the meaning and approximate length.',
  shorten:
    'Make each text noticeably shorter and punchier while keeping the core message.',
  expand:
    'Expand each text with one or two more concrete, specific sentences where it makes sense; keep headings short.',
  translate: 'Translate each text faithfully.',
} as const;

const rewriteSchema = z.object({
  props: z.record(z.string(), z.unknown()),
  mode: z.enum(['rewrite', 'shorten', 'expand', 'translate']),
  language: z.string().optional(),
  tone: z.string().max(60).optional(),
  instruction: z.string().trim().max(300).optional(),
});

export const rewriteBlock = aiProcedure
  .input(rewriteSchema)
  .action(async ({ input }) => {
    const copy = collectCopy(input.props);
    const keys = Object.keys(copy);
    if (!keys.length)
      throw new ApplicationException('This block has no text to rewrite.');

    const target =
      input.mode === 'translate' ? ` into ${languageName(input.language)}` : '';
    const task = input.instruction
      ? `Apply this change requested by the editor to the texts, and leave texts it does not concern unchanged: ${JSON.stringify(input.instruction)}.`
      : `${REWRITE_INSTRUCTIONS[input.mode]}${target}`;
    const result = await generateJson(
      `${task}${input.tone ? ` Use a ${input.tone} tone.` : ''}
Keep any HTML tags exactly as they are and only change the text between them.
Return a JSON object with exactly the same keys as the input and the new text as values.
Input:
${JSON.stringify(copy, null, 2)}`,
      z
        .record(z.string(), z.string())
        .refine(value => keys.every(k => typeof value[k] === 'string'), {
          message: `Every key must be present: ${keys.join(', ')}`,
        }),
      [],
      input.mode === 'translate' ? 0.2 : 0.7
    );

    return { props: applyCopy(input.props, result) };
  });

export const generateAltText = aiProcedure
  .input(z.object({ mediaId: z.string().min(1) }))
  .action(async ({ input }) => {
    const item = await mediaService.getById(input.mediaId);
    if (!item) throw new ApplicationException('File not found');
    if (!item.mime.startsWith('image/') || item.mime === 'image/svg+xml') {
      throw new ApplicationException(
        'Alt text can only be generated for raster images.'
      );
    }

    const driver = storage();
    const data = driver.read
      ? await driver.read(item.key)
      : Buffer.from(await (await fetch(item.url)).arrayBuffer());
    if (!data) throw new ApplicationException('Could not read the image file.');

    const { alt } = await generateJson(
      'Write concise, descriptive alt text (max 125 characters) for this image for screen-reader users. Do not start with "Image of". Return JSON {"alt": string}.',
      z.object({ alt: z.string().min(1).max(200) }),
      [imagePart(item.mime, data)],
      0.3
    );
    return { alt };
  });

export const generatePage = aiProcedure
  .input(generatePageSchema)
  .action(async ({ input }) => generatePageFromPrompt(input));
