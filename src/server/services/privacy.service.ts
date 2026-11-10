import 'server-only';
import { randomBytes } from 'node:crypto';
import type * as archiverModule from 'archiver';
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { createZipArchive } from '@/server/backup/zip';
import { db } from '@/db';
import {
  apiRateWindows,
  comments,
  formSubmissions,
  type FormSubmissionFile,
  pageViews,
  privacyRequests,
  type PrivacyRequestType,
  roles,
  users,
} from '@/db/schema';
import { PERMISSIONS } from '@/config/permissions';
import {
  createPrivacyConfirmationToken,
  hashPrivacyToken,
  verifyPrivacyConfirmationToken,
} from '@/lib/privacy-token';
import { accessService, type UserAccess } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { isMailConfigured, sendMail } from '@/server/services/mail';
import { storage } from '@/server/storage';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export function normalizePrivacyEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Pure matcher for unit tests: returns true when any payload value matches the target email. */
export function submissionMatchesEmail(
  payload: Record<string, string> | null | undefined,
  targetEmail: string
): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const target = normalizePrivacyEmail(targetEmail);
  if (!target) return false;
  for (const val of Object.values(payload)) {
    if (typeof val === 'string' && val.trim().toLowerCase() === target) {
      return true;
    }
  }
  return false;
}

export type PrivacyDataPlan = {
  email: string;
  visitorId: string | null;
  formSubmissions: Array<{
    id: string;
    createdAt: string;
    formName: string | null;
    payload: Record<string, string>;
    files: FormSubmissionFile[];
  }>;
  comments: Array<{
    id: string;
    postId: string | null;
    collectionEntryId: string | null;
    authorName: string;
    body: string;
    status: string;
    createdAt: string;
  }>;
  pageViewsCount: number;
  staffUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    roleName: string | null;
  }>;
  counts: {
    formSubmissions: number;
    files: number;
    comments: number;
    pageViews: number;
    staffUsers: number;
  };
};

async function checkPrivacyRateLimit(ip: string): Promise<boolean> {
  const windowMs = RATE_LIMIT_WINDOW_MS;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const ipKey = `privacy:${ip}`;

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

  if (existing && existing.count >= RATE_LIMIT_MAX) {
    return false;
  }

  if (existing) {
    await db
      .update(apiRateWindows)
      .set({ count: sql`${apiRateWindows.count} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(apiRateWindows.apiKeyId, ipKey),
          eq(apiRateWindows.windowStart, windowStart)
        )
      );
  } else {
    await db.insert(apiRateWindows).values({
      apiKeyId: ipKey,
      windowStart,
      count: 1,
    });
  }
  return true;
}

function createZipBuffer(
  build: (archive: archiverModule.Archiver) => Promise<void> | void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = createZipArchive(9);
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('error', (err: unknown) => reject(err));
    archive.on('end', () => resolve(Buffer.concat(chunks)));

    Promise.resolve(build(archive))
      .then(() => archive.finalize())
      .catch(reject);
  });
}

export const privacyService = {
  requestConfirmation: async (input: {
    siteId: string;
    siteName: string;
    email: string;
    type: PrivacyRequestType;
    visitorId: string | null;
    ip: string;
    baseUrl: string;
  }): Promise<{ ok: true } | { ok: false; status: number; error: string }> => {
    const ok = await checkPrivacyRateLimit(input.ip);
    if (!ok) {
      return {
        ok: false,
        status: 429,
        error: 'Too many privacy requests. Please try again later.',
      };
    }

    const email = normalizePrivacyEmail(input.email);
    const token = createPrivacyConfirmationToken({
      siteId: input.siteId,
      email,
      type: input.type,
      visitorId: input.visitorId,
    });

    const base = input.baseUrl.replace(/\/$/, '');
    const confirmUrl = `${base}/api/privacy/confirm?token=${encodeURIComponent(token)}`;
    const actionLabel =
      input.type === 'erase' ? 'personal data erasure' : 'personal data export';

    const mailResult = await sendMail({
      to: email,
      subject: `${input.siteName}: Confirm your ${actionLabel} request`,
      text: [
        `We received a request for ${actionLabel} on ${input.siteName}.`,
        '',
        'Click the link below within 24 hours to confirm this request:',
        confirmUrl,
        '',
        'If you did not submit this request, you can ignore this email.',
      ].join('\n'),
    });

    if (!mailResult.sent && !isMailConfigured()) {
      console.info(`[privacy] confirmation link for ${email}: ${confirmUrl}`);
    }

    return { ok: true };
  },

  confirmToken: async (token: string) => {
    const verified = verifyPrivacyConfirmationToken(token);
    if (!verified.ok) {
      return verified;
    }

    const tokenHash = hashPrivacyToken(token);
    const [existing] = await db
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.tokenHash, tokenHash))
      .limit(1);

    if (existing) {
      return { ok: true as const, request: existing, alreadyConfirmed: true };
    }

    const [created] = await db
      .insert(privacyRequests)
      .values({
        siteId: verified.payload.siteId,
        email: verified.payload.email,
        type: verified.payload.type,
        status: 'confirmed',
        tokenHash,
        visitorId: verified.payload.visitorId,
        confirmedAt: new Date(),
      })
      .returning();

    return { ok: true as const, request: created, alreadyConfirmed: false };
  },

  listRequests: async (siteId: string) => {
    return db
      .select()
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.siteId, siteId),
          isNull(privacyRequests.deletedAt)
        )
      )
      .orderBy(desc(privacyRequests.createdAt));
  },

  getRequest: async (siteId: string, requestId: string) => {
    const [row] = await db
      .select()
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.id, requestId),
          eq(privacyRequests.siteId, siteId),
          isNull(privacyRequests.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  findDataForEmail: async (input: {
    siteId: string;
    email: string;
    visitorId?: string | null;
  }): Promise<PrivacyDataPlan> => {
    const email = normalizePrivacyEmail(input.email);
    const visitorId = input.visitorId?.trim() || null;

    const [submissionRows, commentRows, staffRows, viewCountRows] =
      await Promise.all([
        db
          .select()
          .from(formSubmissions)
          .where(
            and(
              eq(formSubmissions.siteId, input.siteId),
              isNull(formSubmissions.deletedAt),
              sql`EXISTS (SELECT 1 FROM jsonb_each_text(${formSubmissions.payload}) AS kv WHERE lower(trim(kv.value)) = ${email})`
            )
          )
          .orderBy(desc(formSubmissions.createdAt)),
        db
          .select({
            id: comments.id,
            postId: comments.postId,
            collectionEntryId: comments.collectionEntryId,
            authorName: comments.authorName,
            body: comments.body,
            status: comments.status,
            createdAt: comments.createdAt,
          })
          .from(comments)
          .where(
            and(
              eq(comments.siteId, input.siteId),
              isNull(comments.deletedAt),
              sql`lower(trim(${comments.authorEmail})) = ${email}`
            )
          )
          .orderBy(desc(comments.createdAt)),
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            roleName: roles.name,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(
            and(
              isNull(users.deletedAt),
              sql`lower(trim(${users.email})) = ${email}`
            )
          ),
        visitorId
          ? db
              .select({ count: sql<number>`count(*)::int` })
              .from(pageViews)
              .where(
                and(
                  eq(pageViews.siteId, input.siteId),
                  eq(pageViews.visitorId, visitorId),
                  isNull(pageViews.deletedAt)
                )
              )
          : Promise.resolve([{ count: 0 }]),
      ]);

    const filesCount = submissionRows.reduce(
      (acc, s) => acc + (Array.isArray(s.files) ? s.files.length : 0),
      0
    );
    const pageViewsCount = viewCountRows[0]?.count ?? 0;

    return {
      email,
      visitorId,
      formSubmissions: submissionRows.map(s => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        formName: s.source?.formName ?? s.source?.name ?? null,
        payload: s.payload ?? {},
        files: Array.isArray(s.files) ? s.files : [],
      })),
      comments: commentRows.map(c => ({
        id: c.id,
        postId: c.postId,
        collectionEntryId: c.collectionEntryId,
        authorName: c.authorName,
        body: c.body,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
      pageViewsCount,
      staffUsers: staffRows,
      counts: {
        formSubmissions: submissionRows.length,
        files: filesCount,
        comments: commentRows.length,
        pageViews: pageViewsCount,
        staffUsers: staffRows.length,
      },
    };
  },

  buildExportZip: async (input: {
    siteId: string;
    email: string;
    visitorId?: string | null;
    actorId?: string | null;
    requestId?: string | null;
  }): Promise<{ buffer: Buffer; filename: string; plan: PrivacyDataPlan }> => {
    const plan = await privacyService.findDataForEmail({
      siteId: input.siteId,
      email: input.email,
      visitorId: input.visitorId,
    });

    const linkedPageViews = plan.visitorId
      ? await db
          .select({
            id: pageViews.id,
            path: pageViews.path,
            referrerHost: pageViews.referrerHost,
            createdAt: pageViews.createdAt,
          })
          .from(pageViews)
          .where(
            and(
              eq(pageViews.siteId, input.siteId),
              eq(pageViews.visitorId, plan.visitorId),
              isNull(pageViews.deletedAt)
            )
          )
      : [];

    const driver = storage();
    const fileBuffers: Array<{ path: string; data: Buffer }> = [];
    for (const sub of plan.formSubmissions) {
      for (const f of sub.files) {
        const data = await driver.read(f.key).catch(() => null);
        if (data) {
          const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          fileBuffers.push({
            path: `files/${sub.id}/${safeName}`,
            data,
          });
        }
      }
    }

    const exportJson = {
      exportedAt: new Date().toISOString(),
      siteId: input.siteId,
      email: plan.email,
      formSubmissions: plan.formSubmissions,
      comments: plan.comments,
      pageViews: linkedPageViews,
      staffAccounts: plan.staffUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.roleName,
      })),
    };

    const buffer = await createZipBuffer(archive => {
      archive.append(JSON.stringify(exportJson, null, 2), { name: 'data.json' });
      for (const file of fileBuffers) {
        archive.append(file.data, { name: file.path });
      }
    });

    if (input.actorId) {
      await auditService.log({
        actorId: input.actorId,
        action: 'update',
        targetType: 'privacy_request',
        targetId: input.requestId ?? null,
        targetName: plan.email,
        details: JSON.stringify({
          operation: 'gdpr_export',
          counts: plan.counts,
        }),
      });
    }

    if (input.requestId) {
      await db
        .update(privacyRequests)
        .set({
          status: 'completed',
          completedAt: new Date(),
          completedBy: input.actorId ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(privacyRequests.id, input.requestId),
            eq(privacyRequests.siteId, input.siteId)
          )
        );
    }

    const safeSlug = plan.email.replace(/[^a-z0-9]/gi, '-').slice(0, 40);
    return {
      buffer,
      filename: `privacy-export-${safeSlug}.zip`,
      plan,
    };
  },

  emailOneTimeExportLink: async (input: {
    siteId: string;
    siteName: string;
    requestId: string;
    baseUrl: string;
    access: UserAccess;
  }) => {
    await accessService.assertPermission(
      input.access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const reqRow = await privacyService.getRequest(input.siteId, input.requestId);
    if (!reqRow) {
      throw new Error('Privacy request not found');
    }

    const { buffer } = await privacyService.buildExportZip({
      siteId: input.siteId,
      email: reqRow.email,
      visitorId: reqRow.visitorId,
      actorId: input.access.userId,
      requestId: reqRow.id,
    });

    const exportKey = `gdpr-exports/${reqRow.id}-${Date.now()}.zip`;
    await storage().put(exportKey, buffer, 'application/zip');

    const rawToken = randomBytes(24).toString('base64url');
    const tokenHash = hashPrivacyToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db
      .update(privacyRequests)
      .set({
        exportKey,
        exportTokenHash: tokenHash,
        exportExpiresAt: expiresAt,
        status: 'completed',
        completedAt: new Date(),
        completedBy: input.access.userId,
        updatedAt: new Date(),
      })
      .where(eq(privacyRequests.id, reqRow.id));

    const downloadUrl = `${input.baseUrl.replace(/\/$/, '')}/api/privacy/download?token=${encodeURIComponent(rawToken)}`;
    const mailRes = await sendMail({
      to: reqRow.email,
      subject: `${input.siteName}: Your personal data export is ready`,
      text: [
        `Your personal data export from ${input.siteName} is ready.`,
        '',
        'Download your archive using this one-time link (valid for 24 hours):',
        downloadUrl,
      ].join('\n'),
    });

    if (!mailRes.sent && !isMailConfigured()) {
      console.info(
        `[privacy] one-time export link for ${reqRow.email}: ${downloadUrl}`
      );
    }

    return { ok: true, sent: mailRes.sent, downloadUrl };
  },

  consumeOneTimeExport: async (rawToken: string) => {
    const tokenHash = hashPrivacyToken(rawToken);
    const now = new Date();
    const [row] = await db
      .select()
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.exportTokenHash, tokenHash),
          gt(privacyRequests.exportExpiresAt, now)
        )
      )
      .limit(1);

    if (!row || !row.exportKey) return null;

    const data = await storage().read(row.exportKey);
    await storage()
      .remove(row.exportKey)
      .catch(() => {});
    await db
      .update(privacyRequests)
      .set({
        exportKey: null,
        exportTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(privacyRequests.id, row.id));

    if (!data) return null;
    const safeSlug = row.email.replace(/[^a-z0-9]/gi, '-').slice(0, 40);
    return {
      data,
      filename: `privacy-export-${safeSlug}.zip`,
    };
  },

  eraseData: async (input: {
    siteId: string;
    email: string;
    visitorId?: string | null;
    requestId?: string | null;
    commentMode: 'anonymize' | 'delete';
    access: UserAccess;
  }) => {
    await accessService.assertPermission(
      input.access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );

    const plan = await privacyService.findDataForEmail({
      siteId: input.siteId,
      email: input.email,
      visitorId: input.visitorId,
    });

    const driver = storage();
    const submissionIds = plan.formSubmissions.map(s => s.id);
    const fileKeys = plan.formSubmissions.flatMap(s => s.files.map(f => f.key));
    const commentIds = plan.comments.map(c => c.id);

    await db.transaction(async tx => {
      if (submissionIds.length > 0) {
        await tx
          .delete(formSubmissions)
          .where(
            and(
              eq(formSubmissions.siteId, input.siteId),
              inArray(formSubmissions.id, submissionIds)
            )
          );
      }

      if (commentIds.length > 0) {
        if (input.commentMode === 'delete') {
          await tx
            .delete(comments)
            .where(
              and(
                eq(comments.siteId, input.siteId),
                inArray(comments.id, commentIds)
              )
            );
        } else {
          await tx
            .update(comments)
            .set({
              authorName: 'Deleted user',
              authorEmail: '',
              authorUrl: null,
              ipHash: null,
              voterHash: null,
              userAgent: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(comments.siteId, input.siteId),
                inArray(comments.id, commentIds)
              )
            );
        }
      }

      if (plan.visitorId) {
        await tx
          .delete(pageViews)
          .where(
            and(
              eq(pageViews.siteId, input.siteId),
              eq(pageViews.visitorId, plan.visitorId)
            )
          );
      }

      if (input.requestId) {
        await tx
          .update(privacyRequests)
          .set({
            status: 'completed',
            completedAt: new Date(),
            completedBy: input.access.userId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(privacyRequests.id, input.requestId),
              eq(privacyRequests.siteId, input.siteId)
            )
          );
      }
    });

    for (const key of fileKeys) {
      await driver.remove(key).catch(() => {});
    }

    await auditService.log({
      actorId: input.access.userId,
      action: 'delete',
      targetType: 'privacy_request',
      targetId: input.requestId ?? null,
      targetName: plan.email,
      details: JSON.stringify({
        operation: 'gdpr_erase',
        commentMode: input.commentMode,
        erased: {
          formSubmissions: submissionIds.length,
          files: fileKeys.length,
          comments: commentIds.length,
          pageViews: plan.visitorId ? plan.pageViewsCount : 0,
        },
        staffAccountsFlagged: plan.staffUsers.length,
      }),
    });

    return {
      ok: true,
      erased: {
        formSubmissions: submissionIds.length,
        files: fileKeys.length,
        comments: commentIds.length,
        pageViews: plan.visitorId ? plan.pageViewsCount : 0,
      },
      staffAccountsFlagged: plan.staffUsers,
    };
  },

  rejectRequest: async (input: {
    siteId: string;
    requestId: string;
    notes?: string;
    access: UserAccess;
  }) => {
    await accessService.assertPermission(
      input.access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const [row] = await db
      .update(privacyRequests)
      .set({
        status: 'rejected',
        completedAt: new Date(),
        completedBy: input.access.userId,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(privacyRequests.id, input.requestId),
          eq(privacyRequests.siteId, input.siteId)
        )
      )
      .returning();

    if (row) {
      await auditService.log({
        actorId: input.access.userId,
        action: 'update',
        targetType: 'privacy_request',
        targetId: row.id,
        targetName: row.email,
        details: JSON.stringify({ operation: 'gdpr_reject', notes: input.notes }),
      });
    }
    return row ?? null;
  },
};
