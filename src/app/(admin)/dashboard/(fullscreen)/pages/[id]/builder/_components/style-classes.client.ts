/**
 * The style class server actions grouped for the editor's adapter. Kept out
 * of `style-classes.actions.ts` because a 'use server' file may only export
 * async functions.
 */

import {
  styleClassesCreate,
  styleClassesCss,
  styleClassesDuplicate,
  styleClassesGet,
  styleClassesIsEnabled,
  styleClassesList,
  styleClassesRemove,
  styleClassesRename,
  styleClassesUpdate,
  styleClassesUsage,
  styleClassesUsageCounts,
} from './style-classes.actions';

export const styleClassesActions = {
  list: styleClassesList,
  get: styleClassesGet,
  create: styleClassesCreate,
  update: styleClassesUpdate,
  rename: styleClassesRename,
  duplicate: styleClassesDuplicate,
  remove: styleClassesRemove,
  usage: styleClassesUsage,
  usageCounts: styleClassesUsageCounts,
  css: styleClassesCss,
  isEnabled: styleClassesIsEnabled,
};
