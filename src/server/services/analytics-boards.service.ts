import 'server-only';
import { createId } from '@paralleldrive/cuid2';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsDashboards } from '@/db/schema';
import {
  type BoardLayout,
  boardLayoutSchema,
  EMPTY_LAYOUT,
  parseBoardLayout,
} from '@/db/schemas/analytics.schema';
import { adminSiteId } from '@/server/services/site-context';

export type BoardSummary = {
  id: string;
  name: string;
  widgetCount: number;
  updatedAt: Date | null;
  createdAt: Date;
};

export type BoardDetail = {
  id: string;
  name: string;
  layout: BoardLayout;
  /** Bumped by every save (B15 E8). */
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export const analyticsBoardsService = {
  list: async (): Promise<BoardSummary[]> => {
    const rows = await db
      .select({
        id: analyticsDashboards.id,
        name: analyticsDashboards.name,
        layout: analyticsDashboards.layout,
        updatedAt: analyticsDashboards.updatedAt,
        createdAt: analyticsDashboards.createdAt,
      })
      .from(analyticsDashboards)
      .where(eq(analyticsDashboards.siteId, await adminSiteId()))
      .orderBy(desc(analyticsDashboards.updatedAt));

    return rows.map(r => {
      const layout = parseBoardLayout(r.layout);
      return {
        id: r.id,
        name: r.name,
        widgetCount: layout.widgets.length,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
      };
    });
  },

  get: async (id: string): Promise<BoardDetail | null> => {
    const [row] = await db
      .select()
      .from(analyticsDashboards)
      .where(and(eq(analyticsDashboards.id, id), eq(analyticsDashboards.siteId, await adminSiteId())))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      layout: parseBoardLayout(row.layout),
      version: row.version,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  create: async (input: {
    name: string;
    createdBy: string | null;
    layout?: BoardLayout;
  }): Promise<BoardDetail> => {
    const layout = input.layout
      ? boardLayoutSchema.parse(input.layout)
      : EMPTY_LAYOUT;
    const id = createId();

    await db.insert(analyticsDashboards).values({
      id,
      siteId: await adminSiteId(),
      name: input.name.slice(0, 120),
      createdBy: input.createdBy,
      layout,
    });

    return {
      id,
      name: input.name.slice(0, 120),
      layout,
      version: 0,
      createdBy: input.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  update: async (
    id: string,
    input: { name?: string; layout?: BoardLayout }
  ): Promise<BoardDetail | null> => {
    const existing = await analyticsBoardsService.get(id);
    if (!existing) return null;

    const name =
      input.name !== undefined ? input.name.slice(0, 120) : existing.name;
    const layout =
      input.layout !== undefined
        ? boardLayoutSchema.parse(input.layout)
        : existing.layout;

    const updatedAt = new Date();
    const [row] = await db
      .update(analyticsDashboards)
      .set({
        name,
        layout,
        version: sql`${analyticsDashboards.version} + 1`,
        updatedAt,
      })
      .where(and(eq(analyticsDashboards.id, id), eq(analyticsDashboards.siteId, await adminSiteId())))
      .returning({ version: analyticsDashboards.version });

    return {
      ...existing,
      name,
      layout,
      version: row?.version ?? existing.version + 1,
      updatedAt,
    };
  },

  /**
   * Save only if nobody saved since `expectedVersion` (B15 E8). One
   * conditional UPDATE, so two editors cannot both win. Returns the stored
   * board on a conflict, `null` when the board does not exist on this site.
   */
  saveVersioned: async (
    id: string,
    input: { name: string; layout: BoardLayout },
    expectedVersion: number
  ): Promise<
    | { status: 'saved'; version: number; updatedAt: Date }
    | { status: 'conflict'; current: BoardDetail }
    | null
  > => {
    const siteId = await adminSiteId();
    const layout = boardLayoutSchema.parse(input.layout);
    const updatedAt = new Date();
    const [row] = await db
      .update(analyticsDashboards)
      .set({
        name: input.name.slice(0, 120),
        layout,
        version: sql`${analyticsDashboards.version} + 1`,
        updatedAt,
      })
      .where(
        and(
          eq(analyticsDashboards.id, id),
          eq(analyticsDashboards.siteId, siteId),
          eq(analyticsDashboards.version, expectedVersion)
        )
      )
      .returning({ version: analyticsDashboards.version });

    if (row) return { status: 'saved', version: row.version, updatedAt };
    const current = await analyticsBoardsService.get(id);
    return current ? { status: 'conflict', current } : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await db
      .delete(analyticsDashboards)
      .where(and(eq(analyticsDashboards.id, id), eq(analyticsDashboards.siteId, await adminSiteId())))
      .returning({ id: analyticsDashboards.id });
    return result.length > 0;
  },
};
