import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  type SQL,
} from 'drizzle-orm';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  videoPlaylists,
  videoProgress,
  videos,
} from '@/db/schema';
import { DEFAULT_VIDEO_SETTINGS, type VideoSettings } from '@/db/schemas/video.schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId, siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { parseVideoUrl } from '@/lib/video/parse';
import { fetchOEmbed } from '@/lib/video/oembed';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';

export type VideoListParams = {
  search?: string;
  playlistId?: string;
  status?: 'draft' | 'published' | 'archived';
  page?: number;
  size?: number;
  siteId?: string;
};

export type VideoItem = {
  id: string;
  siteId: string;
  playlistId: string | null;
  title: string;
  slug: string;
  url: string;
  provider: string;
  providerId: string;
  thumbnailUrl: string | null;
  duration: number | null;
  status: string;
  visibility: string;
  publishedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  playlistName: string | null;
};

export type PlaylistItem = {
  id: string;
  siteId: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  createdBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  videoCount: number;
};

const VIDEO_FIELDS = {
  id: videos.id,
  siteId: videos.siteId,
  playlistId: videos.playlistId,
  title: videos.title,
  slug: videos.slug,
  url: videos.url,
  provider: videos.provider,
  providerId: videos.providerId,
  thumbnailUrl: videos.thumbnailUrl,
  duration: videos.duration,
  status: videos.status,
  visibility: videos.visibility,
  publishedAt: videos.publishedAt,
  createdBy: videos.createdBy,
  createdAt: videos.createdAt,
  updatedAt: videos.updatedAt,
  deletedAt: videos.deletedAt,
};

/** ─── Playlists ──────────────────────────────────────────────────────── */

export const playlistService = {
  list: async (siteId: string): Promise<PlaylistItem[]> => {
    const rows = await db
      .select({
        id: videoPlaylists.id,
        siteId: videoPlaylists.siteId,
        name: videoPlaylists.name,
        slug: videoPlaylists.slug,
        description: videoPlaylists.description,
        position: videoPlaylists.position,
        createdBy: videoPlaylists.createdBy,
        createdAt: videoPlaylists.createdAt,
        updatedAt: videoPlaylists.updatedAt,
        deletedAt: videoPlaylists.deletedAt,
        videoCount: count(videos.id),
      })
      .from(videoPlaylists)
      .leftJoin(videos, eq(videoPlaylists.id, videos.playlistId))
      .where(
        and(
          eq(videoPlaylists.siteId, siteId),
          isNull(videoPlaylists.deletedAt)
        )
      )
      .groupBy(
        videoPlaylists.id,
        videoPlaylists.siteId,
        videoPlaylists.name,
        videoPlaylists.slug,
        videoPlaylists.description,
        videoPlaylists.position,
        videoPlaylists.createdBy,
        videoPlaylists.createdAt,
        videoPlaylists.updatedAt,
        videoPlaylists.deletedAt
      )
      .orderBy(asc(videoPlaylists.position), asc(videoPlaylists.createdAt));

    return rows;
  },

  create: async (
    input: { name: string; slug: string; description?: string | null },
    access: UserAccess
  ): Promise<PlaylistItem> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_CREATE
    );
    const siteId = await adminSiteId();
    const [row] = await db
      .insert(videoPlaylists)
      .values({
        siteId,
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description ?? null,
        createdBy: access.userId,
      })
      .returning();
    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'video',
      targetId: row.id,
      targetName: row.name,
    });
    return {
      ...row,
      videoCount: 0,
    };
  },

  update: async (
    input: { id: string; name?: string; slug?: string; description?: string | null },
    access: UserAccess
  ): Promise<PlaylistItem> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_EDIT
    );
    const siteId = await adminSiteId();
    const existing = await db
      .select()
      .from(videoPlaylists)
      .where(and(eq(videoPlaylists.id, input.id), eq(videoPlaylists.siteId, siteId)))
      .limit(1);
    if (!existing[0]) {
      throw new NotFoundException('Playlist not found');
    }

    const [row] = await db
      .update(videoPlaylists)
      .set({
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.slug !== undefined && { slug: input.slug.trim() }),
        ...(input.description !== undefined && { description: input.description }),
        updatedAt: new Date(),
      })
      .where(and(eq(videoPlaylists.id, input.id), eq(videoPlaylists.siteId, siteId)))
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'video',
      targetId: row.id,
      targetName: row.name,
    });
    return { ...row, videoCount: 0 };
  },

  remove: async (
    input: { id: string },
    access: UserAccess
  ): Promise<void> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_DELETE
    );
    const siteId = await adminSiteId();
    const [row] = await db
      .select()
      .from(videoPlaylists)
      .where(and(eq(videoPlaylists.id, input.id), eq(videoPlaylists.siteId, siteId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Playlist not found');
    }

    await db
      .update(videoPlaylists)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(videoPlaylists.id, input.id), eq(videoPlaylists.siteId, siteId)));

    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'video',
      targetId: row.id,
      targetName: row.name,
    });
  },
};

/** ─── Videos ─────────────────────────────────────────────────────────── */

export const videoService = {
  list: async (params: VideoListParams): Promise<{ data: VideoItem[]; total: number }> => {
    const siteId = params.siteId ?? (await adminSiteId());
    const page = params.page ?? 1;
    const size = Math.min(params.size ?? 40, 100);
    const offset = (page - 1) * size;

    const conditions: SQL<unknown>[] = [
      eq(videos.siteId, siteId),
      isNull(videos.deletedAt),
    ];

    if (params.search) {
      conditions.push(
        or(
          ilike(videos.title, `%${params.search}%`),
          ilike(videos.slug, `%${params.search}%`)
        ) as SQL<unknown>
      );
    }
    if (params.playlistId) {
      conditions.push(eq(videos.playlistId, params.playlistId));
    }
    if (params.status) {
      conditions.push(eq(videos.status, params.status));
    }

    const [dataResult, totalResult] = await Promise.all([
      db
        .select({
          ...VIDEO_FIELDS,
          playlistName: videoPlaylists.name,
        })
        .from(videos)
        .leftJoin(videoPlaylists, eq(videos.playlistId, videoPlaylists.id))
        .where(and(...(conditions as SQL<unknown>[])))
        .orderBy(desc(videos.createdAt))
        .limit(size)
        .offset(offset),
      db
        .select({ total: count() })
        .from(videos)
        .where(and(...(conditions as SQL<unknown>[]))),
    ]);

    return {
      data: dataResult as unknown as VideoItem[],
      total: Number(totalResult[0]?.total ?? 0),
    };
  },

  getById: async (id: string): Promise<VideoItem | null> => {
    const siteId = await adminSiteId();
    const [row] = await db
      .select({
        ...VIDEO_FIELDS,
        playlistName: videoPlaylists.name,
      })
      .from(videos)
      .leftJoin(videoPlaylists, eq(videos.playlistId, videoPlaylists.id))
      .where(and(eq(videos.id, id), eq(videos.siteId, siteId)))
      .limit(1);
    return row ? (row as unknown as VideoItem) : null;
  },

  create: async (
    input: {
      title: string;
      slug: string;
      url: string;
      playlistId?: string | null;
      status?: 'draft' | 'published' | 'archived';
      visibility?: 'public' | 'private';
    },
    access: UserAccess
  ): Promise<VideoItem> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_CREATE
    );
    const siteId = await adminSiteId();

    const parsed = parseVideoUrl(input.url);
    if (!parsed) {
      throw new ApplicationException('Unsupported video URL. Use YouTube, Vimeo, or direct .mp4/.webm.');
    }

    let thumbnailUrl: string | null = null;
    let providerId = parsed.id;

    // Try oEmbed to fill thumbnail and title when not provided
    try {
      const oembed = await fetchOEmbed(parsed);
      if (oembed) {
        thumbnailUrl = oembed.thumbnailUrl;
        if (!input.title) input.title = oembed.title;
      }
    } catch {
      // oEmbed is best-effort
    }

    // YouTube poster fallback
    if (!thumbnailUrl && parsed.provider === 'youtube') {
      thumbnailUrl = `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`;
    }

    const [row] = await db
      .insert(videos)
      .values({
        siteId,
        playlistId: input.playlistId ?? null,
        title: input.title.trim(),
        slug: input.slug.trim(),
        url: input.url,
        provider: parsed.provider,
        providerId,
        thumbnailUrl,
        status: input.status ?? 'draft',
        visibility: input.visibility ?? 'public',
        createdBy: access.userId,
      })
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'video',
      targetId: row.id,
      targetName: row.title,
    });
    revalidatePublicSite();
    return row as unknown as VideoItem;
  },

  update: async (
    input: {
      id: string;
      title?: string;
      slug?: string;
      url?: string;
      playlistId?: string | null;
      status?: 'draft' | 'published' | 'archived';
      visibility?: 'public' | 'private';
      thumbnailUrl?: string | null;
      duration?: number | null;
    },
    access: UserAccess
  ): Promise<VideoItem> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_EDIT
    );
    const siteId = await adminSiteId();

    const existing = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, input.id), eq(videos.siteId, siteId)))
      .limit(1);
    if (!existing[0]) {
      throw new NotFoundException('Video not found');
    }
    if (input.playlistId) {
      const [pl] = await db
        .select({ id: videoPlaylists.id })
        .from(videoPlaylists)
        .where(and(eq(videoPlaylists.id, input.playlistId), eq(videoPlaylists.siteId, siteId)))
        .limit(1);
      if (!pl) throw new NotFoundException('Playlist not found');
    }

    const setValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) setValues.title = input.title.trim();
    if (input.slug !== undefined) setValues.slug = input.slug.trim();
    if (input.playlistId !== undefined) setValues.playlistId = input.playlistId;
    if (input.status !== undefined) setValues.status = input.status;
    if (input.visibility !== undefined) setValues.visibility = input.visibility;
    if (input.thumbnailUrl !== undefined) setValues.thumbnailUrl = input.thumbnailUrl;
    if (input.duration !== undefined) setValues.duration = input.duration;

    if (input.url !== undefined) {
      const parsed = parseVideoUrl(input.url);
      if (!parsed) {
        throw new ApplicationException('Unsupported video URL. Use YouTube, Vimeo, or direct .mp4/.webm.');
      }
      setValues.url = input.url;
      setValues.provider = parsed.provider;
      setValues.providerId = parsed.id;

      // Refresh thumbnail via oEmbed on URL change
      try {
        const oembed = await fetchOEmbed(parsed);
        if (oembed) {
          setValues.thumbnailUrl = oembed.thumbnailUrl;
        }
      } catch {
        // best-effort
      }
      if (!setValues.thumbnailUrl && parsed.provider === 'youtube') {
        setValues.thumbnailUrl = `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`;
      }
    }

    const [row] = await db
      .update(videos)
      .set(setValues)
      .where(and(eq(videos.id, input.id), eq(videos.siteId, siteId)))
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'video',
      targetId: row.id,
      targetName: row.title,
    });
    revalidatePublicSite();
    return row as unknown as VideoItem;
  },
};

/** ─── Public library query for the video widget (Puck block / public site) ─── */

export type VideoLibraryItem = {
  id: string;
  siteId: string;
  playlistId: string | null;
  title: string;
  slug: string;
  url: string;
  provider: string;
  providerId: string;
  thumbnailUrl: string | null;
  duration: number | null;
  status: string;
  visibility: string;
  publishedAt: Date | null;
  playlistName: string | null;
  position: number;
  completed: boolean;
};

export const videoLibraryService = {
  /**
   * Published videos for the public widget, honouring the site video settings:
   * master enable flag, catalog mode (`all-published` | `playlist-only`) and
   * viewer access (`public` | `authenticated`).
   */
  listPublished: async (input: {
    siteId?: string;
    playlistId?: string | null;
    catalogMode?: 'all-published' | 'playlist-only';
    pageSize?: number;
    viewerId?: string | null;
  }) => {
    const siteId =
      input.siteId ?? (await siteContext.publicSite())?.id ?? 'default';
    const settings = await siteSettingsService.getPublic();
    const videoSettings: VideoSettings = settings.videoSettings ?? DEFAULT_VIDEO_SETTINGS;

    const result = {
      enabled: videoSettings.enabled,
      title: videoSettings.title,
      description: videoSettings.description,
      layout: videoSettings.layout,
      defaultPlaylistId: videoSettings.defaultPlaylistId,
      pageSize: videoSettings.pageSize,
      progress: videoSettings.progress,
      resume: videoSettings.resume,
      completionPercent: videoSettings.completionPercent,
      providers: videoSettings.providers,
      viewerAccess: videoSettings.viewerAccess,
      videos: [] as VideoLibraryItem[],
    };

    if (!videoSettings.enabled) {
      return result;
    }

    const viewerId: string =
      videoSettings.viewerAccess === 'authenticated'
        ? input.viewerId ?? ''
        : '';

    if (videoSettings.viewerAccess === 'authenticated' && !input.viewerId) {
      // Anonymous visitors get no library rows; the widget shows a sign-in prompt.
      return result;
    }

    const wantsPlaylistOnly =
      (input.catalogMode ?? videoSettings.catalogMode) === 'playlist-only';
    const effectivePlaylistId =
      input.playlistId ?? videoSettings.defaultPlaylistId ?? null;

    const conditions: SQL[] = [
      eq(videos.siteId, siteId),
      eq(videos.status, 'published'),
      eq(videos.visibility, 'public'),
      isNull(videos.deletedAt),
    ];

    if (wantsPlaylistOnly) {
      if (!effectivePlaylistId) {
        return { ...result, videos: [] };
      }
      conditions.push(eq(videos.playlistId, effectivePlaylistId));
    }

    const pageSize = Math.min(Math.max(input.pageSize ?? videoSettings.pageSize, 1), 48);

    const rows = await db
      .select({
        id: videos.id,
        siteId: videos.siteId,
        playlistId: videos.playlistId,
        title: videos.title,
        slug: videos.slug,
        url: videos.url,
        provider: videos.provider,
        providerId: videos.providerId,
        thumbnailUrl: videos.thumbnailUrl,
        duration: videos.duration,
        status: videos.status,
        visibility: videos.visibility,
        publishedAt: videos.publishedAt,
        playlistName: videoPlaylists.name,
        position: videoProgress.position,
        completed: videoProgress.completed,
      })
      .from(videos)
      .leftJoin(videoPlaylists, eq(videos.playlistId, videoPlaylists.id))
      .leftJoin(
        videoProgress,
        and(
          eq(videoProgress.videoId, videos.id),
          eq(videoProgress.userId, viewerId)
        )
      )
      .where(and(...conditions))
      .orderBy(asc(videos.position), asc(videos.createdAt))
      .limit(pageSize);

    const videosList: VideoLibraryItem[] = rows.map(row => ({
      id: row.id,
      siteId: row.siteId,
      playlistId: row.playlistId,
      title: row.title,
      slug: row.slug,
      url: row.url,
      provider: row.provider,
      providerId: row.providerId,
      thumbnailUrl: row.thumbnailUrl,
      duration: row.duration,
      status: row.status,
      visibility: row.visibility,
      publishedAt: row.publishedAt,
      playlistName: row.playlistName,
      position: row.position ?? 0,
      completed: row.completed ?? false,
    }));

    return { ...result, videos: videosList };
  },
};

/** ─── Publish / unpublish / soft-delete / reorder ──────────────────── */

export const videoLifecycle = {
  publish: async (id: string, access: UserAccess): Promise<void> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_PUBLISH
    );
    const siteId = await adminSiteId();
    const [row] = await db
      .update(videos)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(videos.id, id), eq(videos.siteId, siteId)))
      .returning({ id: videos.id });
    if (!row) throw new NotFoundException('Video not found');
    await auditService.log({
      actorId: access.userId,
      action: 'publish',
      targetType: 'video',
      targetId: id,
    });
    revalidatePublicSite();
  },

  unpublish: async (id: string, access: UserAccess): Promise<void> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_PUBLISH
    );
    const siteId = await adminSiteId();
    const [row] = await db
      .update(videos)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(and(eq(videos.id, id), eq(videos.siteId, siteId)))
      .returning({ id: videos.id });
    if (!row) throw new NotFoundException('Video not found');
    await auditService.log({
      actorId: access.userId,
      action: 'unpublish',
      targetType: 'video',
      targetId: id,
    });
    revalidatePublicSite();
  },

  softDelete: async (id: string, access: UserAccess): Promise<void> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_DELETE
    );
    const siteId = await adminSiteId();
    const [row] = await db
      .select({ title: videos.title })
      .from(videos)
      .where(and(eq(videos.id, id), eq(videos.siteId, siteId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Video not found');
    }
    await db
      .update(videos)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(videos.id, id), eq(videos.siteId, siteId)));
    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'video',
      targetId: id,
      targetName: row.title,
    });
    revalidatePublicSite();
  },

  reorder: async (
    ids: string[],
    access: UserAccess
  ): Promise<void> => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.VIDEOS_EDIT
    );
    const siteId = await adminSiteId();
    await db.transaction(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx
          .update(videos)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(videos.id, id), eq(videos.siteId, siteId)));
      }
    });
    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'video',
      targetId: ids.join(','),
      targetName: 'reorder',
    });
    revalidatePublicSite();
  },
};
