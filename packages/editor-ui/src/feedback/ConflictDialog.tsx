import React from 'react';
import { Dialog } from '../primitives/Dialog';
import { Button } from '../primitives/Button';
import { GitCompare, Clock, ShieldAlert } from 'lucide-react';

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
  localTimestamp = 'Just now (unsaved in this tab)',
  remoteTimestamp = '2 minutes ago (by another session)',
  onKeepMine,
  onUseSaved,
  conflictDetails = 'A newer version of this document exists on the server. Overwriting it will discard edits made elsewhere.',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-[var(--ne-warning)]">
          <ShieldAlert className="w-4 h-4" />
          <span>Document Version Conflict</span>
        </div>
      }
      description="Select which revision you want to keep as the authoritative version."
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onUseSaved}>
            Use Saved Version
          </Button>
          <Button variant="primary" onClick={onKeepMine}>
            Keep Mine & Overwrite
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-[var(--ne-text-muted)]">{conflictDetails}</p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] bg-[var(--ne-surface-subtle)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)] mb-1">
              <Clock className="w-3.5 h-3.5 text-[var(--ne-primary)]" />
              <span>Your Version</span>
            </div>
            <p className="text-[11px] text-[var(--ne-text-muted)]">{localTimestamp}</p>
            <p className="text-[11px] text-[var(--ne-text-muted)] mt-2">
              Contains your latest local edits in memory.
            </p>
          </div>

          <div className="p-3 border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] bg-[var(--ne-surface-subtle)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)] mb-1">
              <GitCompare className="w-3.5 h-3.5 text-[var(--ne-warning)]" />
              <span>Server Version</span>
            </div>
            <p className="text-[11px] text-[var(--ne-text-muted)]">{remoteTimestamp}</p>
            <p className="text-[11px] text-[var(--ne-text-muted)] mt-2">
              Saved remotely. Overwriting will erase these changes.
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
