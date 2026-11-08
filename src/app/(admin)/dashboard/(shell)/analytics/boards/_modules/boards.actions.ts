'use server';

import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { analyticsService } from '@/server/services/analytics.service';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';
import {
  createBoardSchema,
  updateBoardSchema,
  previewWidgetSchema,
} from './boards.schemas';
import { idSchema } from '@/schemas/shared';

const boardsBase = PAGES.DASHBOARD.ANALYTICS_BOARDS;

function revalidateBoardPaths(id?: string) {
  revalidatePath(boardsBase);
  if (id) {
    revalidatePath(`${boardsBase}/${id}`);
    revalidatePath(`${boardsBase}/${id}/edit`);
  }
}

export const createBoard = accessProcedure
  .input(createBoardSchema)
  .action(async ({ input, ctx }) => {
    const board = await analyticsBoardsService.create({
      name: input.name,
      createdBy: ctx.user.userId,
    });
    revalidateBoardPaths(board.id);
    return board;
  });

export const updateBoard = accessProcedure
  .input(updateBoardSchema)
  .action(async ({ input }) => {
    const board = await analyticsBoardsService.update(input.id, {
      name: input.name,
      layout: input.layout,
    });
    if (!board) {
      return {
        hasError: true as const,
        message: 'Board not found',
        errorType: 'ApplicationException' as const,
      };
    }
    revalidateBoardPaths(board.id);
    return board;
  });

export const deleteBoard = accessProcedure
  .input(idSchema)
  .action(async ({ input }) => {
    const ok = await analyticsBoardsService.delete(input.id);
    if (!ok) {
      return {
        hasError: true as const,
        message: 'Board not found',
        errorType: 'ApplicationException' as const,
      };
    }
    revalidateBoardPaths();
    return { ok: true };
  });

export const previewWidget = accessProcedure
  .input(previewWidgetSchema)
  .action(async ({ input }) => {
    return analyticsService.widget(input.query, input.boardRange);
  });
