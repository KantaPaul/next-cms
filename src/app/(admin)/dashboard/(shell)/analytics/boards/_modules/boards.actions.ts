'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import {
  boardLayoutSchema,
  widgetQuerySchema,
} from '@/db/schemas/analytics.schema';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';
import { analyticsService } from '@/server/services/analytics.service';

const boardsBase = PAGES.DASHBOARD.ANALYTICS_BOARDS;

function revalidateBoardPaths(id?: string) {
  revalidatePath(boardsBase);
  if (id) {
    revalidatePath(`${boardsBase}/${id}`);
    revalidatePath(`${boardsBase}/${id}/edit`);
  }
}

export const createBoard = accessProcedure
  .input(
    z.object({
      name: z.string().trim().min(1, 'Name is required').max(120),
    })
  )
  .action(async ({ input, ctx }) => {
    const board = await analyticsBoardsService.create({
      name: input.name,
      createdBy: ctx.user.userId,
    });
    revalidateBoardPaths(board.id);
    return board;
  });

export const updateBoard = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(120).optional(),
      layout: boardLayoutSchema.optional(),
    })
  )
  .action(async ({ input }) => {
    const board = await analyticsBoardsService.update(input.id, {
      name: input.name,
      layout: input.layout,
    });
    if (!board) {
      return { hasError: true as const, message: 'Board not found', errorType: 'ApplicationException' as const };
    }
    revalidateBoardPaths(board.id);
    return board;
  });

export const deleteBoard = accessProcedure
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input }) => {
    const ok = await analyticsBoardsService.delete(input.id);
    if (!ok) {
      return { hasError: true as const, message: 'Board not found', errorType: 'ApplicationException' as const };
    }
    revalidateBoardPaths();
    return { ok: true };
  });

export const previewWidget = accessProcedure
  .input(
    z.object({
      query: widgetQuerySchema,
      boardRange: z.union([z.literal(7), z.literal(30)]),
    })
  )
  .action(async ({ input }) => {
    return analyticsService.widget(input.query, input.boardRange);
  });
