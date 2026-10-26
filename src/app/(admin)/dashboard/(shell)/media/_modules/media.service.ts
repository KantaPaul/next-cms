import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, count, desc, eq, ilike, like, or, type SQL } from 'drizzle-orm';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { media, users } from '@/db/schema';
import { env } from '@/env.mjs';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { storage } from '@/server/storage';

export const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
];

const sanitizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'file';

const sanitizeFolder = (folder?: string | null) =>
  (folder ?? 'uploads')
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'uploads';

export type MediaListParams = {
  search?: string;
  folder?: string;
  type?: 'image' | 'video' | 'document' | '';
  page?: number;
  size?: number;
};

export const mediaService = {
  list: async ({
    search,
    folder,
    type,
    page = 1,
    size = 40,
  }: MediaListParams) => {
    const conditions: (SQL | undefined)[] = [];
    if (folder) conditions.push(eq(media.folder, folder));
    if (type === 'image') conditions.push(like(media.mime, 'image/%'));
    if (type === 'video') conditions.push(like(media.mime, 'video/%'));
    if (type === 'document') conditions.push(eq(media.mime, 'application/pdf'));
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(media.filename, term),
          ilike(media.title, term),
          ilike(media.alt, term)
        )
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [data, [{ total }]] = await Promise.all([
      db
        .select({
          id: media.id,
          url: media.url,
          filename: media.filename,
          title: media.title,
          alt: media.alt,
          mime: media.mime,
          size: media.size,
          width: media.width,
          height: media.height,
          folder: media.folder,
          createdAt: media.createdAt,
          uploadedBy: users.name,
        })
        .from(media)
        .leftJoin(users, eq(users.id, media.createdBy))
        .where(where)
        .orderBy(desc(media.createdAt))
        .limit(size)
        .offset((Math.max(page, 1) - 1) * size),
      db.select({ total: count() }).from(media).where(where),
    ]);

    return { data, total, page, size };
  },

  folders: async () => {
    const rows = await db
      .select({ folder: media.folder, total: count() })
      .from(media)
      .groupBy(media.folder)
      .orderBy(media.folder);
    return rows;
  },

  upload: async (
    file: File,
    meta: {
      folder?: string | null;
      alt?: string | null;
      width?: number | null;
      height?: number | null;
    },
    access: UserAccess
  ) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.MEDIA_UPLOAD
    );

    if (!ALLOWED_MIME.includes(file.type)) {
      throw new ApplicationException(
        `Files of type ${file.type || 'unknown'} are not allowed.`
      );
    }
    if (file.size > env.MEDIA_MAX_UPLOAD_MB * 1024 * 1024) {
      throw new ApplicationException(
        `Files must be smaller than ${env.MEDIA_MAX_UPLOAD_MB} MB.`
      );
    }

    const folder = sanitizeFolder(meta.folder);
    const key = `${folder}/${Date.now().toString(36)}-${randomBytes(4).toString('hex')}-${sanitizeName(file.name)}`;
    const body = Buffer.from(await file.arrayBuffer());
    const { url } = await storage().put(key, body, file.type);

    const [row] = await db
      .insert(media)
      .values({
        key,
        url,
        filename: file.name.slice(0, 255),
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 255),
        alt: meta.alt ?? null,
        mime: file.type,
        size: file.size,
        width: meta.width ?? null,
        height: meta.height ?? null,
        folder,
        createdBy: access.userId,
      })
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'media',
      targetId: row.id,
      targetName: row.filename,
    });
    return row;
  },

  update: async (
    input: {
      id: string;
      title?: string | null;
      alt?: string | null;
      folder?: string | null;
    },
    access: UserAccess
  ) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.MEDIA_UPLOAD
    );
    const [row] = await db
      .update(media)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.alt !== undefined && { alt: input.alt }),
        ...(input.folder !== undefined && {
          folder: sanitizeFolder(input.folder),
        }),
      })
      .where(eq(media.id, input.id))
      .returning();
    if (!row) throw new NotFoundException('File not found');
    return row;
  },

  remove: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.MEDIA_UPLOAD
    );
    const [row] = await db.delete(media).where(eq(media.id, id)).returning();
    if (!row) throw new NotFoundException('File not found');
    await storage().remove(row.key);
    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'media',
      targetId: id,
      targetName: row.filename,
    });
    return row;
  },

  getById: async (id: string) => {
    const [row] = await db.select().from(media).where(eq(media.id, id));
    return row ?? null;
  },
};

export type MediaItem = Awaited<
  ReturnType<typeof mediaService.list>
>['data'][number];
