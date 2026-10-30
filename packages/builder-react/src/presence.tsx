/**
 * Live presence (R729 / UXE-19): avatars of others on the page, their
 * selection outlines, and a lock on the block someone is editing. The host
 * supplies presence through `users` and `blockLocks` props, and updates
 * through `onPresenceChange`. Full real-time co-editing stays out of scope.
 */

import type { CSSProperties } from 'react';
import { useState } from 'react';
import type { NodeId } from '@nextcms/builder-core';

export type PresenceUser = {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  selection: NodeId[];
  editing?: NodeId;
};

export type BlockLock = {
  blockId: NodeId;
  userId: string;
  userName: string;
};

export type PresenceProps = {
  users: PresenceUser[];
  blockLocks: BlockLock[];
  /** The local user's id. */
  me: string;
  /** Called when the local user's selection changes. */
  onSelectionChange: (ids: NodeId[]) => void;
  /** Called when the local user starts/stops editing a block. */
  onEditingChange: (blockId: NodeId | null) => void;
};

const userColors = ['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#14b8a6'];

export function PresencePanel({ users, blockLocks, me, onSelectionChange, onEditingChange }: PresenceProps) {
  const [editingBlock, setEditingBlock] = useState<NodeId | null>(null);

  const otherUsers = users.filter(u => u.id !== me);
  const myLocks = blockLocks.filter(l => l.userId === me);

  return (
    <div style={{ display: 'grid', gap: 10, font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ font: '600 12px/1.4 system-ui, sans-serif', opacity: 0.8 }}>Presence</div>

      <div style={{ display: 'flex', gap: 6 }}>
        {otherUsers.map(user => (
          <PresenceAvatar key={user.id} user={user} />
        ))}
        {otherUsers.length === 0 && (
          <span style={{ font: '13px/1.4 system-ui, sans-serif', opacity: 0.6 }}>You are alone on this page</span>
        )}
      </div>

      {blockLocks.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ font: '600 11px/1.4 system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '.04em', opacity: 0.6 }}>Block locks</div>
          {blockLocks.map(lock => (
            <div key={lock.blockId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: myLocks.some(l => l.blockId === lock.blockId) ? 'rgba(245,158,11,.1)' : 'rgba(239,68,68,.05)', border: `1px solid ${myLocks.some(l => l.blockId === lock.blockId) ? '#f59e0b' : '#dc2626'}` }}>
              <span style={{ font: '11px/1 system-ui, sans-serif', color: '#dc2626' }}>{lock.userName} is editing</span>
              <span style={{ flex: 1, font: '12px/1.4 system-ui, sans-serif', opacity: 0.7 }}>{lock.blockId}</span>
              {myLocks.some(l => l.blockId === lock.blockId) && (
                <button type="button" style={{ ...smallButton(), color: '#dc2626', padding: '1px 6px', fontSize: 11 }}>Release</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(127,127,127,.2)' }}>
        <input
          type="checkbox"
          checked={!!editingBlock}
          onChange={event => {
            setEditingBlock(event.target.checked ? (editingBlock ?? null) : null);
            onEditingChange(event.target.checked ? (editingBlock ?? null) : null);
          }}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        <label style={{ font: '13px/1.4 system-ui, sans-serif', cursor: 'pointer', userSelect: 'none' }}>
          Editing this block
        </label>
      </div>
    </div>
  );
}

/** Avatar with selection outline info. */
function PresenceAvatar({ user }: { user: PresenceUser }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
      title={`${user.name} — ${user.selection.length} selected${user.editing ? ', editing' : ''}`}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: user.color,
          color: '#fff',
          font: '600 11px/1.4 system-ui, sans-serif',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 0 2px rgba(0,0,0,.1)`,
        }}
      >
        {user.name[0]}
      </div>
      <span style={{ font: '11px/1.4 system-ui, sans-serif', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>{user.name}</span>
      {user.selection.length > 0 && (
        <span style={{ font: '10px/1 system-ui, sans-serif', opacity: 0.6 }}>{user.selection.length} sel.</span>
      )}
    </div>
  );
}

function smallButton(): CSSProperties {
  return {
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid rgba(127,127,127,.35)',
    background: 'transparent',
    color: 'inherit',
    font: '11px/1.4 system-ui, sans-serif',
    cursor: 'pointer',
  };
}
