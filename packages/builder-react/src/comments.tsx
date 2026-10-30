/**
 * Comments (R728 / UXE-18): comments pinned to blocks on the canvas with
 * mentions, replies, resolve, and notifications. Reviewers can comment
 * without edit rights. Shares storage with AGY-08 preview feedback.
 * The host supplies the comment adapter through `onAdd`, `onUpdate`,
 * `onDelete`, and `comments` props.
 */

import { type CSSProperties, useState } from 'react';
import type { NodeId } from '@nextcms/builder-core';

export type Comment = {
  id: string;
  blockId: NodeId;
  author: { name: string; avatar?: string };
  createdAt: number;
  updatedAt: number;
  text: string;
  resolved: boolean;
  parentId?: string;
  mentions?: string[];
};

export type CommentThread = {
  blockId: NodeId;
  comments: Comment[];
};

export type CommentsProps = {
  /** All comments, keyed by block id. */
  threads: CommentThread[];
  /** Add a comment to a block. */
  onAdd: (blockId: NodeId, text: string, parentId?: string) => void;
  /** Resolve or reopen a comment thread. */
  onResolve: (blockId: NodeId, resolved: boolean) => void;
  /** Delete a comment. */
  onDelete: (commentId: string) => void;
  /** The block currently selected (its thread is shown). */
  selectedBlock?: NodeId | null;
  /** Whether the current user has edit rights. */
  canEdit?: boolean;
  onClose?: () => void;
};

const ACCENT = '#4f46e5';

export function CommentsPanel({ threads, onAdd, onResolve, onDelete, selectedBlock, canEdit = true, onClose }: CommentsProps) {
  const [draft, setDraft] = useState('');
  const thread = selectedBlock ? threads.find(t => t.blockId === selectedBlock) : undefined;
  const comments = thread?.comments ?? [];

  return (
    <div style={{ display: 'contents', gap: 10, font: '13px/1.4 system-ui, sans-serif', height: '100%' }}>
      <div style={{ font: '600 12px/1.4 system-ui, sans-serif', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 16, height: 16, borderRadius: '50%', background: ACCENT, color: '#fff', font: '600 10px/1.4 system-ui, sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>⍉</span>
        Comments
        {thread && <span style={{ font: '11px/1 system-ui, sans-serif', opacity: 0.6, marginLeft: 6 }}>{comments.length} comment(s)</span>}
      </div>

      {!selectedBlock && (
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(127,127,127,.6)' }}>
          Select a block to add comments.
        </div>
      )}

      {selectedBlock && (
        <div style={{ display: 'grid', gap: 8, minHeight: 0 }}>
          {comments.length === 0 && (
            <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(127,127,127,.6)' }}>
              No comments yet. Add one to start a conversation.
            </div>
          )}
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onResolve={() => onResolve(selectedBlock!, !comment.resolved)}
              onDelete={() => onDelete(comment.id)}
              canEdit={canEdit}
            />
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(127,127,127,.2)' }}>
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Write a comment…"
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid rgba(127,127,127,.35)',
                background: 'transparent',
                color: 'inherit',
                font: '13px/1.4 system-ui, sans-serif',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  onAdd(selectedBlock!, draft.trim());
                  setDraft('');
                }}
                style={{
                  all: 'unset',
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid rgba(127,127,127,.35)',
                  background: draft.trim() ? 'rgba(79,70,229,.15)' : 'transparent',
                  color: draft.trim() ? '#4f46e5' : 'rgba(127,127,127,.4)',
                  font: '12px/1.4 system-ui, sans-serif',
                  cursor: draft.trim() ? 'pointer' : 'default',
                }}
              >
                Comment
              </button>
              {onClose && (
                <button type="button" onClick={onClose} style={{ ...smallButton() }}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  onResolve,
  onDelete,
  canEdit,
}: {
  comment: Comment;
  onResolve: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const replies = (comment as any).replies ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(127,127,127,.2)', background: comment.resolved ? 'rgba(127,127,127,.05)' : 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(127,127,127,.2)', font: '600 10px/1.4 system-ui, sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{comment.author.name[0]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 11px/1.4 system-ui, sans-serif' }}>
            <span>{comment.author.name}</span>
            {comment.mentions?.length && <span style={{ color: '#4f46e5', fontSize: 11 }}>{comment.mentions.map(m => `@${m}`).join(' ')}</span>}
            {comment.resolved && <span style={{ color: '#22c55e', fontSize: 11 }}>Resolved</span>}
            <span style={{ font: '10px/1 system-ui, sans-serif', opacity: 0.5 }}>{new Date(comment.createdAt).toLocaleString()}</span>
          </div>
          <div style={{ font: '13px/1.4 system-ui, sans-serif', marginTop: 2, whiteSpace: 'pre-wrap' }}>{comment.text}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {!comment.resolved && (
          <button type="button" onClick={onResolve} style={{ ...smallButton(), color: '#22c55e' }}>Resolve</button>
        )}
        {canEdit && (
          <button type="button" onClick={onDelete} style={{ ...smallButton(), color: '#dc2626' }}>Delete</button>
        )}
      </div>
      {replies.length > 0 && (
        <div style={{ paddingLeft: 20, borderLeft: '2px solid rgba(127,127,127,.2)', display: 'grid', gap: 4 }}>
          {replies.map((reply: { id: string; author: { name: string }; text: string }) => (
            <div key={reply.id} style={{ font: '12px/1.4 system-ui, sans-serif', padding: '4px 8px', borderRadius: 4, background: 'rgba(127,127,127,.05)' }}>
              <span style={{ font: '600 10px/1.4 system-ui, sans-serif', opacity: 0.7 }}>{reply.author.name}</span>{' '}
              <span style={{ font: '12px/1.4 system-ui, sans-serif', whiteSpace: 'pre-wrap' }}>{reply.text}</span>
            </div>
          ))}
        </div>
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
    font: '12px/1.4 system-ui, sans-serif',
    cursor: 'pointer',
  };
}
