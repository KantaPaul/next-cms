import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Clock, GitCompare, ShieldAlert } from 'lucide-react';
import type React from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/Button';
import { useReturnFocus } from '../lib/useReturnFocus';
import { useLayerScope } from '../theme/EditorUIProvider';

/**
 * Version-conflict choice on Radix AlertDialog (B15 E2b): a backdrop click
 * does not dismiss it, focus starts on the safe choice ("Use saved"), and
 * Escape closes it through `onClose`. Same props as before.
 */
export interface ConflictDialogProps {
  open: boolean;
  onClose: () => void;
  localTimestamp?: string;
  remoteTimestamp?: string;
  onKeepMine: () => void;
  onUseSaved: () => void;
  conflictDetails?: string;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  open,
  onClose,
  localTimestamp = 'Unsaved in this tab',
  remoteTimestamp = 'Saved elsewhere',
  onKeepMine,
  onUseSaved,
  conflictDetails = 'A newer version of this document exists on the server. Overwriting it will discard edits made elsewhere.',
}) => {
  const layer = useLayerScope();
  const returnFocus = useReturnFocus(open);
  return (
    <AlertDialog.Root open={open} onOpenChange={next => !next && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="ne-ui ne-motion-overlay fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs" />
        <AlertDialog.Content
          {...layer}
          onCloseAutoFocus={returnFocus}
          className={cn(
            layer.className,
            'ne-motion-dialog fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-5 text-[var(--ne-text)] shadow-2xl focus:outline-none'
          )}
        >
          <div>
            <AlertDialog.Title className="flex items-center gap-2 text-sm font-semibold text-[var(--ne-warning)]">
              <ShieldAlert className="h-4 w-4" />
              <span>Document version conflict</span>
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-1 text-xs text-[var(--ne-text-muted)]">
              Choose which version to keep. {conflictDetails}
            </AlertDialog.Description>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)]">
                <Clock className="h-3.5 w-3.5 text-[var(--ne-primary)]" />
                <span>Your version</span>
              </div>
              <p className="text-[11px] text-[var(--ne-text-muted)]">
                {localTimestamp}
              </p>
              <p className="mt-2 text-[11px] text-[var(--ne-text-muted)]">
                Your latest edits in this tab.
              </p>
            </div>
            <div className="rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)]">
                <GitCompare className="h-3.5 w-3.5 text-[var(--ne-warning)]" />
                <span>Saved version</span>
              </div>
              <p className="text-[11px] text-[var(--ne-text-muted)]">
                {remoteTimestamp}
              </p>
              <p className="mt-2 text-[11px] text-[var(--ne-text-muted)]">
                Keeping yours overwrites these changes.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--ne-border)] pt-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" onClick={onUseSaved}>
                Use saved version
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="primary" onClick={onKeepMine}>
                Keep mine and overwrite
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
