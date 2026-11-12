import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  apiRateWindows,
  type FormSubmissionFile,
  type FormSubmissionSource,
  formSubmissions,
  globalBlocks,
  pageContents,
  pages,
  postContents,
  posts,
} from '@/db/schema';
import { adminSiteId, siteContext } from '@/server/services/site-context';
import { env } from '@/env.mjs';
import { hashIdentifier } from '@/server/services/auth-rate-limit.service';
import {
  type FormActionsConfig,
  type FormActionType,
  formActionsService,
} from '@/server/services/form-actions';
import { safeUrlSchema } from '@/builder/schemas/style.schema';
import {
  evaluateFormula,
  isFieldConditionallyRequired,
  isFieldVisible,
} from '@/builder/forms/logic';
import { storage } from '@/server/storage';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';

const RESERVED = new Set([
  'formId',
  'formSourceKind',
  'formSourceId',
  'formNodeId',
  'company',
  'cf-turnstile-response',
]);

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_COUNT = 10;

export type FormField = {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  options?: string;
  placeholder?: string;
  accept?: 'images' | 'documents' | 'both';
  maxSizeMb?: number;
  multiple?: boolean;
  hiddenValue?: string;
  hiddenSource?: 'static' | 'url_param';
  conditions?: Array<{
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'empty'
      | 'not_empty'
      | 'gt'
      | 'gte'
      | 'lt'
      | 'lte';
    value?: string;
  }>;
  conditionMatch?: 'all' | 'any';
  conditionAction?: 'show' | 'hide' | 'require';
  formula?: string;
  decimals?: number;
};

export type SniffResult = {
  valid: boolean;
  mime?: string;
  error?: string;
};

/**
 * Validates a file's extension and magic bytes against the accept preset.
 */
export function sniffFile(
  name: string,
  buffer: Buffer,
  acceptPreset?: 'images' | 'documents' | 'both'
): SniffResult {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const preset = acceptPreset ?? 'both';

  const isImageExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
  const isDocExt = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'csv',
    'txt',
  ].includes(ext);

  if (preset === 'images' && !isImageExt) {
    return { valid: false, error: `Invalid image file extension: .${ext}` };
  }
  if (preset === 'documents' && !isDocExt) {
    return { valid: false, error: `Invalid document file extension: .${ext}` };
  }
  if (preset === 'both' && !isImageExt && !isDocExt) {
    return { valid: false, error: `Unsupported file extension: .${ext}` };
  }

  // Sniff magic bytes
  if (ext === 'jpg' || ext === 'jpeg') {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { valid: true, mime: 'image/jpeg' };
    }
    return { valid: false, error: 'File contents do not match JPEG format.' };
  }

  if (ext === 'png') {
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { valid: true, mime: 'image/png' };
    }
    return { valid: false, error: 'File contents do not match PNG format.' };
  }

  if (ext === 'gif') {
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return { valid: true, mime: 'image/gif' };
    }
    return { valid: false, error: 'File contents do not match GIF format.' };
  }

  if (ext === 'webp') {
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50 // WEBP
    ) {
      return { valid: true, mime: 'image/webp' };
    }
    return { valid: false, error: 'File contents do not match WEBP format.' };
  }

  if (ext === 'svg') {
    const text = buffer.subarray(0, 1024).toString('utf8').trim();
    if (
      text.startsWith('<?xml') ||
      text.startsWith('<svg') ||
      text.includes('<svg')
    ) {
      return { valid: true, mime: 'image/svg+xml' };
    }
    return { valid: false, error: 'File contents do not match SVG format.' };
  }

  if (ext === 'pdf') {
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return { valid: true, mime: 'application/pdf' };
    }
    return { valid: false, error: 'File contents do not match PDF format.' };
  }

  if (ext === 'docx') {
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return {
        valid: true,
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    return { valid: false, error: 'File contents do not match DOCX format.' };
  }

  if (ext === 'xlsx') {
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return {
        valid: true,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
    return { valid: false, error: 'File contents do not match XLSX format.' };
  }

  if (ext === 'doc' || ext === 'xls') {
    if (
      buffer.length >= 8 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0 &&
      buffer[4] === 0xa1 &&
      buffer[5] === 0xb1 &&
      buffer[6] === 0x1a &&
      buffer[7] === 0xe1
    ) {
      return {
        valid: true,
        mime: ext === 'doc' ? 'application/msword' : 'application/vnd.ms-excel',
      };
    }
    return {
      valid: false,
      error: `File contents do not match ${ext.toUpperCase()} format.`,
    };
  }

  if (ext === 'csv' || ext === 'txt') {
    const checkLen = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLen; i++) {
      if (buffer[i] === 0x00) {
        return {
          valid: false,
          error: `Binary data found in ${ext.toUpperCase()} file.`,
        };
      }
    }
    return { valid: true, mime: ext === 'csv' ? 'text/csv' : 'text/plain' };
  }

  return { valid: false, error: 'Unsupported file type.' };
}

/** Finds a ContactForm node in builder content by node id, or returns the first one. */
export function findFormNode(
  content: unknown,
  nodeId?: string
): Record<string, unknown> | null {
  if (!content || typeof content !== 'object') return null;

  const doc = content as {
    nodes?: Record<
      string,
      { id?: string; type?: string; props?: Record<string, unknown> }
    >;
  };
  if (doc.nodes && typeof doc.nodes === 'object') {
    if (nodeId && doc.nodes[nodeId]?.type === 'ContactForm') {
      return (doc.nodes[nodeId].props as Record<string, unknown>) ?? null;
    }
    for (const [id, node] of Object.entries(doc.nodes)) {
      if (node && node.type === 'ContactForm') {
        if (
          !nodeId ||
          id === nodeId ||
          node.id === nodeId ||
          (node.props as any)?.id === nodeId
        ) {
          return (node.props as Record<string, unknown>) ?? null;
        }
      }
    }
  }

  let firstMatch: Record<string, unknown> | null = null;
  const walk = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }
    const record = value as Record<string, unknown>;
    if (
      record.type === 'ContactForm' &&
      record.props &&
      typeof record.props === 'object'
    ) {
      const props = record.props as Record<string, unknown>;
      firstMatch ??= props;
      if (nodeId && (record.id === nodeId || props.id === nodeId)) {
        return props;
      }
    }
    for (const child of Object.values(record)) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };

  const match = walk(content);
  if (match) return match;
  if (!nodeId && firstMatch) return firstMatch;
  return null;
}

export async function verifyTurnstile(token: string) {
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

async function checkRateLimit(ip: string): Promise<boolean> {
  const ipKey = `ip:${hashIdentifier(ip)}`;
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / RATE_WINDOW_MS) * RATE_WINDOW_MS
  );

  const [existing] = await db
    .select({ count: apiRateWindows.count })
    .from(apiRateWindows)
    .where(
      and(
        eq(apiRateWindows.apiKeyId, ipKey),
        eq(apiRateWindows.windowStart, windowStart)
      )
    )
    .limit(1);

  let currentCount = 0;
  if (existing) {
    const [row] = await db
      .update(apiRateWindows)
      .set({ count: (existing.count as number) + 1 })
      .where(
        and(
          eq(apiRateWindows.apiKeyId, ipKey),
          eq(apiRateWindows.windowStart, windowStart)
        )
      )
      .returning({ count: apiRateWindows.count });
    currentCount = row?.count ?? 0;
  } else {
    const [row] = await db
      .insert(apiRateWindows)
      .values({ apiKeyId: ipKey, windowStart, count: 1 })
      .returning({ count: apiRateWindows.count });
    currentCount = row?.count ?? 1;
  }

  return currentCount <= RATE_LIMIT_COUNT;
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Filters visible fields, validates required rules, and drops unknown/hidden fields.
 */
export function filterAndValidateFormPayload(
  fields: FormField[],
  rawStringValues: Record<string, string>,
  uploadedFileCounts: Record<string, number> = {}
): { ok: true; payload: Record<string, string> } | { ok: false; error: string } {
  const payload: Record<string, string> = {};

  for (const field of fields) {
    if (field.type === 'step') continue;
    const visible = isFieldVisible(field, rawStringValues);
    if (!visible) continue;

    const isRequired = Boolean(
      field.required || isFieldConditionallyRequired(field, rawStringValues)
    );

    if (field.type === 'file') {
      const count = uploadedFileCounts[field.name] ?? 0;
      if (isRequired && count === 0) {
        return {
          ok: false,
          error: `${field.label || field.name} is required.`,
        };
      }
    } else if (field.type === 'calculated') {
      const computed = evaluateFormula(
        field.formula,
        rawStringValues,
        field.decimals
      );
      payload[field.name] = computed !== null ? String(computed) : '';
    } else {
      const val = (rawStringValues[field.name] ?? '').slice(0, 5000);
      if (field.type === 'acceptance') {
        const accepted = ['yes', 'true', 'on', '1'].includes(val.toLowerCase());
        if (!accepted) {
          return {
            ok: false,
            error: `${field.label || field.name} must be accepted.`,
          };
        }
        payload[field.name] = val;
      } else if (isRequired && !val.trim()) {
        return {
          ok: false,
          error: `${field.label || field.name} is required.`,
        };
      } else {
        payload[field.name] = val;
      }
    }
  }

  return { ok: true, payload };
}

export const formsService = {
  submit: async (formData: FormData, options?: { ip?: string }) => {
    // 1. Rate limiting by hashed IP
    const clientIp = options?.ip || '127.0.0.1';
    const rateLimitOk = await checkRateLimit(clientIp);
    if (!rateLimitOk) {
      return {
        ok: false as const,
        status: 429,
        error: 'Too many submissions. Please try again later.',
      };
    }

    // 2. Honeypot, then Turnstile
    const company = String(formData.get('company') ?? '').trim();
    const token = String(formData.get('cf-turnstile-response') ?? '');
    const spam = company.length > 0;

    if (!spam && !(await verifyTurnstile(token))) {
      return { ok: false as const, status: 400, error: 'Verification failed.' };
    }

    // 3. Resolve form configuration from source
    const formId = String(formData.get('formId') ?? '').trim() || null;
    const formSourceKind = String(formData.get('formSourceKind') ?? '').trim();
    const formSourceId = String(formData.get('formSourceId') ?? '').trim();
    const formNodeId = String(formData.get('formNodeId') ?? '').trim();

    const site = await siteContext.publicSite();
    let formProps: Record<string, unknown> | null = null;
    let sourceRecord: FormSubmissionSource | undefined = undefined;

    const kind = formSourceKind || (formId ? 'global' : '');
    const sourceId = formSourceId || formId || '';

    if (kind === 'global' && sourceId) {
      const [global] = await db
        .select({
          name: globalBlocks.name,
          content: globalBlocks.content,
          publishedContent: globalBlocks.publishedContent,
        })
        .from(globalBlocks)
        .where(
          and(eq(globalBlocks.id, sourceId), eq(globalBlocks.siteId, site.id))
        )
        .limit(1);

      if (global) {
        formProps = findFormNode(
          global.publishedContent ?? global.content,
          formNodeId || undefined
        );
        sourceRecord = {
          kind: 'global',
          id: sourceId,
          name: global.name,
          formName: typeof formProps?.title === 'string' ? formProps.title : undefined,
          nodeId: formNodeId || undefined,
        };
      }
    } else if (kind === 'page' && sourceId) {
      const [pageRow] = await db
        .select({
          title: pages.title,
          content: pageContents.content,
        })
        .from(pages)
        .innerJoin(
          pageContents,
          and(
            eq(pageContents.pageId, pages.id),
            eq(pageContents.kind, 'published')
          )
        )
        .where(and(eq(pages.id, sourceId), eq(pages.siteId, site.id)))
        .limit(1);

      if (pageRow) {
        formProps = findFormNode(pageRow.content, formNodeId || undefined);
        sourceRecord = {
          kind: 'page',
          id: sourceId,
          name: pageRow.title,
          formName: typeof formProps?.title === 'string' ? formProps.title : undefined,
          nodeId: formNodeId || undefined,
        };
      }
    } else if (kind === 'post' && sourceId) {
      const [postRow] = await db
        .select({
          id: posts.id,
          title: posts.title,
          layout: posts.layout,
          templateId: posts.templateId,
          siteId: posts.siteId,
          canvas: postContents.canvas,
        })
        .from(posts)
        .leftJoin(
          postContents,
          and(
            eq(postContents.postId, posts.id),
            eq(postContents.kind, 'published')
          )
        )
        .where(and(eq(posts.id, sourceId), eq(posts.siteId, site.id)))
        .limit(1);

      if (postRow) {
        let content: unknown = postRow.canvas;
        if (postRow.layout !== 'custom' || !content) {
          content = await postTemplatesService.resolveForPost(postRow);
        }
        formProps = findFormNode(content, formNodeId || undefined);
        sourceRecord = {
          kind: 'post',
          id: sourceId,
          name: postRow.title,
          formName: typeof formProps?.title === 'string' ? formProps.title : undefined,
          nodeId: formNodeId || undefined,
        };
      }
    } else if (formId) {
      // Fallback
      const [global] = await db
        .select({
          name: globalBlocks.name,
          content: globalBlocks.content,
          publishedContent: globalBlocks.publishedContent,
        })
        .from(globalBlocks)
        .where(
          and(eq(globalBlocks.id, formId), eq(globalBlocks.siteId, site.id))
        )
        .limit(1);

      if (global) {
        formProps = findFormNode(
          global.publishedContent ?? global.content,
          formNodeId || undefined
        );
        sourceRecord = {
          kind: 'global',
          id: formId,
          name: global.name,
          nodeId: formNodeId || undefined,
        };
      }
    }

    const rawFields = Array.isArray(formProps?.fields)
      ? (formProps!.fields as FormField[])
      : null;

    // Collect raw string and file entries
    const rawStringValues: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (RESERVED.has(key) || typeof value !== 'string') continue;
      rawStringValues[key] = value;
    }

    const payload: Record<string, string> = {};
    const submissionId = randomUUID();
    const uploadedFiles: FormSubmissionFile[] = [];
    // Checked files wait here until every field has passed, so a rejected
    // submission never leaves files behind in storage.
    const pendingUploads: { key: string; buffer: Buffer; mime: string }[] = [];

    if (rawFields) {
      // 4. Filter visible fields and validate required
      for (const field of rawFields) {
        if (field.type === 'step') continue;
        const visible = isFieldVisible(field, rawStringValues);
        if (!visible) continue;

        if (field.type === 'file') {
          // 5. Handle files
          const files = formData.getAll(field.name).filter(
            f => typeof f === 'object' && f !== null && 'size' in f && f.size > 0
          ) as File[];

          if (field.required && files.length === 0) {
            return {
              ok: false as const,
              status: 400,
              error: `${field.label || field.name} is required.`,
            };
          }

          if (files.length > (field.multiple ? 5 : 1)) {
            return {
              ok: false as const,
              status: 400,
              error: `Too many files uploaded for ${field.label || field.name}. Maximum is ${field.multiple ? 5 : 1}.`,
            };
          }

          const maxMb = Math.min(
            field.maxSizeMb ?? env.MEDIA_MAX_UPLOAD_MB,
            env.MEDIA_MAX_UPLOAD_MB
          );
          const maxBytes = maxMb * 1024 * 1024;

          for (const file of files) {
            if (file.size > maxBytes) {
              return {
                ok: false as const,
                status: 400,
                error: `File ${file.name} exceeds size limit of ${maxMb}MB.`,
              };
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const sniff = sniffFile(file.name, buffer, field.accept);
            if (!sniff.valid) {
              return {
                ok: false as const,
                status: 400,
                error: sniff.error || `Invalid file type for ${file.name}.`,
              };
            }

            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const key = `form-uploads/${submissionId}/${randomUUID()}-${safeName}`;
            pendingUploads.push({
              key,
              buffer,
              mime: sniff.mime || 'application/octet-stream',
            });

            uploadedFiles.push({
              field: field.name,
              name: file.name,
              key,
              size: file.size,
              mime: sniff.mime || file.type || 'application/octet-stream',
            });
          }
        } else if (field.type === 'calculated') {
          const computed = evaluateFormula(
            field.formula,
            rawStringValues,
            field.decimals
          );
          payload[field.name] = computed !== null ? String(computed) : '';
        } else {
          const val = (rawStringValues[field.name] ?? '').slice(0, 5000);
          const isRequired = Boolean(
            field.required || isFieldConditionallyRequired(field, rawStringValues)
          );
          payload[field.name] = val;

          if (field.type === 'acceptance') {
            const accepted = ['yes', 'true', 'on', '1'].includes(val.toLowerCase());
            if (!accepted) {
              return {
                ok: false as const,
                status: 400,
                error: `${field.label || field.name} must be accepted.`,
              };
            }
          } else if (isRequired && !val.trim()) {
            return {
              ok: false as const,
              status: 400,
              error: `${field.label || field.name} is required.`,
            };
          }
        }
      }
    } else {
      // Fallback: accept non-reserved strings as-is
      for (const [key, val] of Object.entries(rawStringValues)) {
        payload[key] = val.slice(0, 5000);
      }
    }

    // 5b. Store files only now that every field passed. Honeypot spam keeps
    // its text for review but never gets files written to storage.
    const storedKeys: string[] = [];
    const removeStored = () =>
      Promise.allSettled(storedKeys.map(key => storage().remove(key)));
    if (spam) {
      uploadedFiles.length = 0;
    } else {
      try {
        for (const upload of pendingUploads) {
          await storage().put(upload.key, upload.buffer, upload.mime);
          storedKeys.push(upload.key);
        }
      } catch (error) {
        await removeStored();
        throw error;
      }
    }

    // 6. Insert submission row
    let row: { id: string } | undefined;
    try {
      [row] = await db
        .insert(formSubmissions)
        .values({
          id: submissionId,
          siteId: site.id,
          formGlobalId: formId,
          payload,
          status: 'new',
          spam,
          source: sourceRecord,
          files: uploadedFiles,
          actionLog: [],
        })
        .returning({ id: formSubmissions.id });
    } catch (error) {
      await removeStored();
      throw error;
    }

    // 7. Determine actions to run and redirect
    const actions = (formProps?.actions as FormActionType[]) ?? ['email'];
    let redirectTo: string | undefined = undefined;

    if (actions.includes('redirect') && formProps?.redirectUrl) {
      const parsed = safeUrlSchema.safeParse(formProps.redirectUrl);
      if (parsed.success) {
        redirectTo = parsed.data;
      }
    }

    const actionsConfig: FormActionsConfig = {
      ...(formProps && typeof formProps === 'object' ? formProps : {}),
      actions,
      emailTo: typeof formProps?.emailTo === 'string' ? formProps.emailTo : undefined,
      emailSubject:
        typeof formProps?.emailSubject === 'string'
          ? formProps.emailSubject
          : undefined,
      emailReplyToField:
        typeof formProps?.emailReplyToField === 'string'
          ? formProps.emailReplyToField
          : undefined,
      redirectUrl: redirectTo,
      webhookUrl:
        typeof formProps?.webhookUrl === 'string'
          ? formProps.webhookUrl
          : undefined,
      webhookSecret:
        typeof formProps?.webhookSecret === 'string'
          ? formProps.webhookSecret
          : undefined,
    };

    const afterAction = async () => {
      if (spam) return;
      await formActionsService.executeActions({
        submissionId: row.id,
        siteId: site.id,
        payload,
        files: uploadedFiles,
        config: actionsConfig,
      });
    };

    return {
      ok: true as const,
      id: row?.id,
      redirectTo,
      afterAction,
    };
  },

  list: async (status?: string) => {
    const where = status
      ? and(
          eq(formSubmissions.siteId, await adminSiteId()),
          eq(formSubmissions.status, status)
        )
      : eq(formSubmissions.siteId, await adminSiteId());
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
      .where(
        and(
          eq(formSubmissions.id, id),
          eq(formSubmissions.siteId, await adminSiteId())
        )
      )
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
          eq(formSubmissions.siteId, await adminSiteId()),
          eq(formSubmissions.status, 'new')
        )
      );
  },

  archive: async (id: string) => {
    const [row] = await db
      .update(formSubmissions)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(
        and(
          eq(formSubmissions.id, id),
          eq(formSubmissions.siteId, await adminSiteId())
        )
      )
      .returning();
    return row ?? null;
  },

  toCsv: async (status?: string) => {
    const rows = await formsService.list(status);
    const keys = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row.payload ?? {})) keys.add(key);
    }
    const columns = ['id', 'status', 'spam', 'createdAt', 'files', ...keys];
    const lines = [columns.join(',')];
    for (const row of rows) {
      const fileNames = (row.files ?? []).map(f => f.name).join('; ');
      const values = columns.map(column => {
        if (column === 'id') return csvCell(row.id);
        if (column === 'status') return csvCell(row.status);
        if (column === 'spam') return row.spam ? 'true' : 'false';
        if (column === 'createdAt') return csvCell(row.createdAt.toISOString());
        if (column === 'files') return csvCell(fileNames);
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
        and(
          eq(formSubmissions.siteId, await adminSiteId()),
          eq(formSubmissions.status, 'new')
        )
      );
    return row?.total ?? 0;
  },
};
