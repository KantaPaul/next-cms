import 'server-only';
import type { z } from 'zod';
import { env } from '@/env.mjs';
import { ApplicationException } from '@/lib/utils/error';

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const isAiConfigured = () => !!env.GEMINI_API_KEY;

async function callGemini(parts: Part[], { json, temperature }: { json: boolean; temperature: number }) {
  if (!env.GEMINI_API_KEY) {
    throw new ApplicationException('AI is not configured. Set GEMINI_API_KEY to enable it.');
  }

  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature, ...(json && { responseMimeType: 'application/json' }) },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Gemini error', response.status, detail.slice(0, 500));
    throw new ApplicationException(
      response.status === 429 ? 'The AI service is rate limited. Try again in a minute.' : 'The AI request failed.'
    );
  }

  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  if (!text.trim()) throw new ApplicationException('The AI returned an empty response.');
  return text;
}

const stripFences = (text: string) => text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

/** Requests JSON and validates it with the given schema, retrying once with the validation error. */
export async function generateJson<T>(prompt: string, schema: z.ZodType<T>, extraParts: Part[] = [], temperature = 0.7): Promise<T> {
  let lastError = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const fullPrompt = attempt
      ? `${prompt}\n\nYour previous answer was invalid: ${lastError}\nReturn corrected JSON only.`
      : prompt;
    const text = await callGemini([{ text: fullPrompt }, ...extraParts], { json: true, temperature });

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFences(text));
    } catch {
      lastError = 'Response was not valid JSON.';
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    lastError = result.error.issues
      .slice(0, 8)
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
  }

  throw new ApplicationException(`The AI response did not match the expected format (${lastError}).`);
}

export async function generateText(prompt: string, temperature = 0.7) {
  return (await callGemini([{ text: prompt }], { json: false, temperature })).trim();
}

export const imagePart = (mime: string, data: Buffer): Part => ({
  inline_data: { mime_type: mime, data: data.toString('base64') },
});
