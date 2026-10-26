import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { DEFAULT_SITE_ID, formSubmissions, globalBlocks } from '@/db/schema';
import { env } from '@/env.mjs';
import { sendMail } from '@/server/services/mail';

const RESERVED = new Set(['formId', 'company', 'cf-turnstile-response']);

type FormField = { name?: string; label?: string; required?: boolean };

function fieldsFromContent(content: unknown): FormField[] {
  const found: FormField[] = [];
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    const record = value as Record<string, unknown>;
    if (record.type === 'ContactForm' && record.props && typeof record.props === 'object') {
      const fields = (record.props as { fields?: unknown }).fields;
      if (Array.isArray(fields)) found.push(...(fields as FormField[]));
    }
    for (const child of Object.values(record)) walk(child);
  };
  walk(content);
  return found;
}

async function verifyTurnstile(token: string) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body }
  );
  if (!response.ok) return false;
  const data = (await response.json()) as { success?: boolean };
  return data.success === true;
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export const formsService = {
  submit: async (formData: FormData) => {
    const company = String(formData.get('company') ?? '').trim();
    const token = String(formData.get('cf-turnstile-response') ?? '');
    const formId = String(formData.get('formId') ?? '').trim() || null;
    const spam = company.length > 0;

    if (!spam && !(await verifyTurnstile(token))) {
      return { ok: false as const, status: 400, error: 'Verification failed.' };
    }

    let allowed: FormField[] | null = null;
    if (formId) {
      const [global] = await db
        .select({ content: globalBlocks.content })
        .from(globalBlocks)
        .where(eq(globalBlocks.id, formId))
        .limit(1);
      if (!global) {
        return { ok: false as const, status: 400, error: 'Unknown form.' };
      }
      const fields = fieldsFromContent(global.content);
      if (fields.length) allowed = fields;
    }

    const payload: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (RESERVED.has(key) || typeof value !== 'string') continue;
      if (allowed && !allowed.some(field => field.name === key)) continue;
      payload[key] = value.slice(0, 5000);
    }

    if (allowed) {
      for (const field of allowed) {
        if (field.required && field.name && !payload[field.name]?.trim()) {
          return {
            ok: false as const,
            status: 400,
            error: `${field.label || field.name} is required.`,
          };
        }
      }
    }

    const [row] = await db
      .insert(formSubmissions)
      .values({
        siteId: DEFAULT_SITE_ID,
        formGlobalId: formId,
        payload,
        status: 'new',
        spam,
      })
      .returning({ id: formSubmissions.id });

    if (!spam && env.FORM_NOTIFY_TO) {
      const lines = Object.entries(payload).map(([key, value]) => `${key}: ${value}`);
      await sendMail({
        to: env.FORM_NOTIFY_TO,
        subject: 'New form submission',
        text: lines.join('\n') || 'A form was submitted with no fields.',
      });
    }

    return { ok: true as const, id: row?.id };
  },

  list: async (status?: string) => {
    const where = status
      ? and(eq(formSubmissions.siteId, DEFAULT_SITE_ID), eq(formSubmissions.status, status))
      : eq(formSubmissions.siteId, DEFAULT_SITE_ID);
    return db
      .select()
      .from(formSubmissions)
      .where(where)
      .orderBy(desc(formSubmissions.createdAt))
      .limit(200);
  },

  get: async (id: string) => {
    const [row] = await db
      .select()
      .from(formSubmissions)
      .where(and(eq(formSubmissions.id, id), eq(formSubmissions.siteId, DEFAULT_SITE_ID)))
      .limit(1);
    return row ?? null;
  },

  markRead: async (id: string) => {
    await db
      .update(formSubmissions)
      .set({ status: 'read', updatedAt: new Date() })
      .where(
        and(
          eq(formSubmissions.id, id),
          eq(formSubmissions.siteId, DEFAULT_SITE_ID),
          eq(formSubmissions.status, 'new')
        )
      );
  },

  archive: async (id: string) => {
    const [row] = await db
      .update(formSubmissions)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(formSubmissions.id, id), eq(formSubmissions.siteId, DEFAULT_SITE_ID)))
      .returning();
    return row ?? null;
  },

  toCsv: async (status?: string) => {
    const rows = await formsService.list(status);
    const keys = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row.payload ?? {})) keys.add(key);
    }
    const columns = ['id', 'status', 'spam', 'createdAt', ...keys];
    const lines = [columns.join(',')];
    for (const row of rows) {
      const values = columns.map(column => {
        if (column === 'id') return csvCell(row.id);
        if (column === 'status') return csvCell(row.status);
        if (column === 'spam') return row.spam ? 'true' : 'false';
        if (column === 'createdAt') return csvCell(row.createdAt.toISOString());
        return csvCell(row.payload?.[column] ?? '');
      });
      lines.push(values.join(','));
    }
    return lines.join('\n');
  },

  countNew: async () => {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(formSubmissions)
      .where(
        and(eq(formSubmissions.siteId, DEFAULT_SITE_ID), eq(formSubmissions.status, 'new'))
      );
    return row?.total ?? 0;
  },
};
