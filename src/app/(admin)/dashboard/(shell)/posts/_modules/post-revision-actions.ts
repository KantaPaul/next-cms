import type { RevisionActions } from '@/app/(admin)/dashboard/(shell)/pages/_components/revisions-drawer';
import {
  createPostRevision,
  getPostRevision,
  listPostRevisions,
  restorePostRevision,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';

export const POST_REVISION_ACTIONS: RevisionActions = {
  list: listPostRevisions,
  get: getPostRevision,
  create: createPostRevision,
  restore: restorePostRevision,
};
