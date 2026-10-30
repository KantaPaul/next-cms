/**
 * Version compare (R727 / UXE-17): two revisions side by side with changed
 * blocks highlighted, and restore of a single block from an older version.
 * The host supplies the revisions through the `revisions` prop.
 */

import { type CSSProperties, useState } from 'react';
import type { BuilderDocument, BuilderNode, NodeId } from '@nextcms/builder-core';

const ACCENT = '#4f46e5';

export type Revision = {
  id: string;
  label: string;
  createdAt: number;
  document: BuilderDocument;
};

export type VersionCompareProps = {
  revisions: Revision[];
  onRestoreBlock: (revisionId: string, blockId: NodeId) => void;
  onClose: () => void;
};

export function VersionCompare({ revisions, onRestoreBlock, onClose }: VersionCompareProps) {
  const [left, setLeft] = useState<string>(revisions[0]?.id ?? '');
  const [right, setRight] = useState<string>(revisions[1]?.id ?? '');

  const leftRev = revisions.find(r => r.id === left);
  const rightRev = revisions.find(r => r.id === right);

  const changedIds = changedBlockIds(leftRev?.document, rightRev?.document);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,.4)',
        font: '13px/1.4 system-ui, sans-serif',
      }}
    >
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(127,127,127,.3)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ font: '600 14px/1.3 system-ui, sans-serif' }}>{revisions.length === 0 ? 'No revisions' : 'Version compare'}</div>
        <button type="button" onClick={onClose} style={{ all: 'unset', cursor: 'pointer', padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(127,127,127,.35)', background: 'transparent', color: 'inherit', font: '13px/1.4 system-ui, sans-serif' }}>Close</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {revisions.length === 0 ? (
          <div style={{ flex: 1, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(127,127,127,.6)' }}>No revisions to compare.</div>
        ) : (
          <>
            <RevisionPanel
              revision={leftRev}
              isLeft
              onSelect={(id) => setLeft(id)}
              selected={left}
              changedIds={changedIds}
              onRestoreBlock={(blockId) => onRestoreBlock(left!, blockId)}
            />
            <div style={{ width: 1, background: 'rgba(127,127,127,.2)' }} />
            <RevisionPanel
              revision={rightRev}
              onSelect={(id) => setRight(id)}
              selected={right}
              changedIds={changedIds}
              onRestoreBlock={(blockId) => onRestoreBlock(right!, blockId)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function RevisionPanel({
  revision,
  onSelect,
  selected,
  changedIds,
  isLeft,
  onRestoreBlock,
}: {
  revision: Revision | undefined;
  onSelect: (id: string) => void;
  selected: string;
  changedIds: Set<NodeId>;
  isLeft?: boolean;
  onRestoreBlock: (blockId: NodeId) => void;
}) {
  if (!revision) return null;

  const rootIds = revision.document.rootSlot;
  const nodes = rootIds.map(id => revision.document.nodes[id]).filter(Boolean);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, borderBottom: '1px solid rgba(127,127,127,.2)', paddingBottom: 8 }}>
        <button
          type="button"
          aria-pressed={true}
          onClick={() => onSelect(revision.id)}
          style={{
            all: 'unset',
            padding: '6px 12px',
            borderRadius: 6,
            border: `2px solid ${isLeft ? '#4f46e5' : 'transparent'}`,
            background: isLeft ? 'rgba(79,70,229,.1)' : 'transparent',
            color: isLeft ? '#4f46e5' : 'rgba(127,127,127,.8)',
            font: '600 13px/1.4 system-ui, sans-serif',
            cursor: 'pointer',
          }}
        >
          {revision.label}
        </button>
        <span style={{ font: '11px/1 system-ui, sans-serif', opacity: 0.6 }}>{new Date(revision.createdAt).toLocaleString()}</span>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {nodes.map(node => (
          <RevisionBlock
            key={node.id}
            node={node}
            document={revision.document}
            changed={changedIds.has(node.id)}
            onRestoreBlock={() => onRestoreBlock(node.id)}
          />
        ))}
      </div>
    </div>
  );
}

function RevisionBlock({
  node,
  document,
  changed,
  onRestoreBlock,
}: {
  node: BuilderNode;
  document: BuilderDocument;
  changed: boolean;
  onRestoreBlock: () => void;
}) {
  const children = Object.values(document.nodes).filter(n => (n.meta as Record<string, unknown> | undefined)?.parentId === node.id);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px', borderRadius: 6, border: changed ? `1px solid ${ACCENT}` : '1px solid rgba(127,127,127,.2)', background: changed ? 'rgba(79,70,229,.05)' : 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ font: '600 11px/1.4 system-ui, sans-serif', color: changed ? '#4f46e5' : 'rgba(127,127,127,.7)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {changed ? '● Changed' : 'Unchanged'}
        </span>
        <span style={{ flex: 1, font: '13px/1.4 system-ui, sans-serif' }}>{node.meta?.name ?? node.type}</span>
        <button
          type="button"
          onClick={onRestoreBlock}
          disabled={!changed}
          style={{
            all: 'unset',
            padding: '4px 8px',
            borderRadius: 4,
            border: `1px solid ${changed ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
            background: changed ? 'rgba(79,70,229,.15)' : 'transparent',
            color: changed ? '#4f46e5' : 'rgba(127,127,127,.4)',
            font: '11px/1.4 system-ui, sans-serif',
            cursor: changed ? 'pointer' : 'default',
            opacity: changed ? 1 : 0.5,
          }}
        >
          Restore this block
        </button>
      </div>
      {children.length > 0 && (
        <div style={{ paddingLeft: 14, borderLeft: '2px solid rgba(127,127,127,.2)', display: 'grid', gap: 6 }}>
          {children.map(child => (
            <RevisionBlock key={child.id} node={child} document={document} changed={changed} onRestoreBlock={() => onRestoreBlock()} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Compares two documents and returns the set of block ids whose props differ. */
export function changedBlockIds(a: BuilderDocument | undefined, b: BuilderDocument | undefined): Set<NodeId> {
  const changed = new Set<NodeId>();
  if (!a || !b) return changed;
  const allIds = new Set([...Object.keys(a.nodes), ...Object.keys(b.nodes)]);
  for (const id of allIds) {
    const na = a.nodes[id];
    const nb = b.nodes[id];
    if (!na || !nb) continue;
    if (JSON.stringify(na.props) !== JSON.stringify(nb.props)) changed.add(id);
    if (JSON.stringify(na.slots) !== JSON.stringify(nb.slots)) changed.add(id);
  }
  return changed;
}
