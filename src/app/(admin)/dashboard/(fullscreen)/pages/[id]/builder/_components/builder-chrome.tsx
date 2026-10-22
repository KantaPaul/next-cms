'use client';

import { ActionBar, createUsePuck } from '@measured/puck';
import {
  ArrowLeft,
  Component,
  Eye,
  History,
  LayoutTemplate,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { useCan } from '@/providers/access.provider';
import { AutosaveIndicator } from '@/app/(admin)/dashboard/(shell)/pages/_components/use-autosave';
import { PAGE_STATUS_COLORS } from '@/app/(admin)/dashboard/(shell)/pages/_components/pages-table';
import { useBuilder, type BuilderTarget } from './builder-context';
import { AiGenerateDialog, AiRewriteDialog } from './ai-dialogs';
import { SaveGlobalDialog } from './save-global-dialog';
import { SaveTemplateDialog } from './save-template-dialog';

const usePuck = createUsePuck();

export function BuilderHeaderActions() {
  const b = useBuilder();
  const canCreate = useCan(PERMISSIONS.PAGES_CREATE);
  const [templateOpen, setTemplateOpen] = useState(false);
  const status = b.status as keyof typeof PAGE_STATUS_COLORS;
  const isGlobal = b.kind === 'global' || b.kind === 'page-template';

  if (isGlobal) {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href={b.backHref} aria-label={b.backLabel}>
            <ArrowLeft /> <span className="hidden xl:inline">{b.backLabel}</span>
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void b.save()}
          disabled={!!b.busy || !b.isDirty}
        >
          {b.busy === 'save' && <Loader2 className="animate-spin" />} Save
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <Button type="button" variant="ghost" size="sm" asChild>
        <Link href={b.backHref} aria-label={b.backLabel}>
          <ArrowLeft /> <span className="hidden xl:inline">{b.backLabel}</span>
        </Link>
      </Button>
      <StatusBadge status={status} statusColor={PAGE_STATUS_COLORS[status]} />
      <span className="hidden lg:inline-flex">
        <AutosaveIndicator status={b.autosaveStatus} savedAt={b.savedAt} />
      </span>
      {b.aiEnabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => b.setAiGenerateOpen(true)}
        >
          <Wand2 /> Generate
        </Button>
      )}
      {b.hasRevisions && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={b.openRevisions}
          aria-label="Revision history"
        >
          <History />
        </Button>
      )}
      {canCreate && b.kind === 'page' && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setTemplateOpen(true)}
          aria-label="Save as template"
        >
          <LayoutTemplate />
        </Button>
      )}
      {b.previewHref && (
        <Button type="button" variant="ghost" size="sm" asChild>
          <a
            href={b.previewHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Preview draft"
          >
            <Eye />
          </a>
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void b.save()}
        disabled={!!b.busy}
      >
        {b.busy === 'save' && <Loader2 className="animate-spin" />} Save draft
      </Button>
      {b.canPublish ? (
        <Button
          type="button"
          size="sm"
          onClick={() => void b.publish()}
          disabled={!!b.busy}
        >
          {b.busy === 'publish' && <Loader2 className="animate-spin" />}
          {b.status === 'published' ? b.liveLabel : 'Publish'}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          onClick={() => void b.submitForReview()}
          disabled={!!b.busy || b.status === 'review'}
        >
          {b.busy === 'review' && <Loader2 className="animate-spin" />}
          {b.status === 'review' ? 'In review' : 'Submit for review'}
        </Button>
      )}

      {b.aiEnabled && (
        <AiGenerateDialog
          open={b.aiGenerateOpen}
          onOpenChange={b.setAiGenerateOpen}
        />
      )}
      {b.aiEnabled && (
        <AiRewriteDialog
          target={b.rewriteTarget}
          onClose={() => b.setRewriteTarget(null)}
        />
      )}
      <SaveGlobalDialog
        target={b.globalTarget}
        onClose={() => b.setGlobalTarget(null)}
      />
      {b.kind === 'page' && (
        <SaveTemplateDialog
          key={String(templateOpen)}
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          pageTitle={b.pageTitle}
        />
      )}
    </div>
  );
}

export function BuilderActionBar({
  label,
  parentAction,
  children,
}: {
  label?: string;
  parentAction: ReactNode;
  children: ReactNode;
}) {
  const b = useBuilder();
  const selected = usePuck(s => s.selectedItem);
  const target: BuilderTarget | null = selected
    ? {
        id: selected.props.id as string,
        type: selected.type as string,
        props: selected.props as BuilderTarget['props'],
      }
    : null;
  const canSaveGlobal =
    b.kind !== 'global' && target && target.type !== 'GlobalRef';

  return (
    <ActionBar>
      <ActionBar.Group>
        {parentAction}
        {label && <ActionBar.Label label={label} />}
      </ActionBar.Group>
      <ActionBar.Group>
        {b.aiEnabled && target && target.type !== 'GlobalRef' && (
          <ActionBar.Action
            label="Rewrite with AI"
            onClick={() => b.setRewriteTarget(target)}
          >
            <Sparkles size={16} />
          </ActionBar.Action>
        )}
        {canSaveGlobal && (
          <ActionBar.Action
            label="Save as global block"
            onClick={() => b.setGlobalTarget(target)}
          >
            <Component size={16} />
          </ActionBar.Action>
        )}
        {children}
      </ActionBar.Group>
    </ActionBar>
  );
}
