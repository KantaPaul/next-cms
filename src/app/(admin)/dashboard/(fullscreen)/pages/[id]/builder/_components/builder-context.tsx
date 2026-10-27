'use client';

import { createContext, useContext } from 'react';
import type { AutosaveStatus } from '@/app/(admin)/dashboard/(shell)/pages/_components/use-autosave';

export type BuilderTarget = {
  id: string;
  type: string;
  props: Record<string, unknown> & { id: string };
  /** Free-form change from the inspector's "Describe a change" box. */
  instruction?: string;
};

/** What the builder edits: a page, one post's custom layout, the shared single-post template, a page template, or a global block. */
export type BuilderKind =
  | 'page'
  | 'post'
  | 'post-template'
  | 'page-template'
  | 'global'
  | 'contact-form';

export type BuilderContextValue = {
  kind: BuilderKind;
  label: string;
  backHref: string;
  backLabel: string;
  previewHref: string | null;
  liveLabel: string;
  hasRevisions: boolean;
  pageId: string;
  pageTitle: string;
  status: string;
  canPublish: boolean;
  busy: null | 'save' | 'publish' | 'review' | 'take-over';
  autosaveStatus: AutosaveStatus;
  savedAt: Date | null;
  /** True when the canvas differs from the last saved snapshot. */
  isDirty: boolean;
  aiEnabled: boolean;
  save: () => Promise<boolean>;
  publish: () => Promise<void>;
  submitForReview: () => Promise<void>;
  takeOver: () => Promise<void>;
  openRevisions: () => void;
  aiGenerateOpen: boolean;
  setAiGenerateOpen: (open: boolean) => void;
  rewriteTarget: BuilderTarget | null;
  setRewriteTarget: (target: BuilderTarget | null) => void;
  globalTarget: BuilderTarget | null;
  setGlobalTarget: (target: BuilderTarget | null) => void;
  motionPreview: boolean;
  setMotionPreview: (on: boolean) => void;
  /** Soft-lock status for the document being edited. */
  lockStatus: {
    kind: 'free' | 'locked';
    userName?: string | null;
    isStale?: boolean;
    isCurrentUser?: boolean;
  } | null;
};

export const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilder() {
  const value = useContext(BuilderContext);
  if (!value) throw new Error('useBuilder must be used inside the builder');
  return value;
}
