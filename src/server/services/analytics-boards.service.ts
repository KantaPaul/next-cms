import 'server-only';
import { createId } from '@paralleldrive/cuid2';
import { and, desc, eq } from 'drizzle-orm';
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

    await db
      .update(analyticsDashboards)
      .set({ name, layout, updatedAt: new Date() })
      .where(and(eq(analyticsDashboards.id, id), eq(analyticsDashboards.siteId, await adminSiteId())));

    return {
      ...existing,
      name,
      layout,
      updatedAt: new Date(),
    };
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await db
      .delete(analyticsDashboards)
      .where(and(eq(analyticsDashboards.id, id), eq(analyticsDashboards.siteId, await adminSiteId())))
      .returning({ id: analyticsDashboards.id });
    return result.length > 0;
  },
};
