/**
 * Live checks panel (R731 / UXE-21): accessibility (RFB-16), SEO, broken
 * links, missing alt text, heading order, and heavy blocks (RFB-23). Click
 * an issue to select the block. The host supplies issues through `checks`
 * and `onIssueClick`.
 */

import type { CSSProperties } from 'react';
import type { NodeId } from '@nextcms/builder-core';

export type CheckIssue = {
  id: string;
  blockId: NodeId;
  type: 'a11y' | 'seo' | 'link' | 'alt' | 'heading' | 'performance';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  fix?: string;
};

export type LiveChecksProps = {
  issues: CheckIssue[];
  onIssueClick: (blockId: NodeId) => void;
};

const severityColor: Record<CheckIssue['severity'], string> = {
  error: '#dc2626',
  warning: '#f59e0b',
  info: '#4f46e5',
};

const typeLabels: Record<CheckIssue['type'], string> = {
  a11y: 'Accessibility',
  seo: 'SEO',
  link: 'Broken link',
  alt: 'Missing alt text',
  heading: 'Heading order',
  performance: 'Heavy block',
};

export function LiveChecksPanel({ issues, onIssueClick }: LiveChecksProps) {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  return (
    <div style={{ display: 'grid', gap: 10, font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ font: '600 12px/1.4 system-ui, sans-serif', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 16, height: 16, borderRadius: '50%', background: errors > 0 ? '#dc2626' : warnings > 0 ? '#f59e0b' : '#22c55e', color: '#fff', font: '600 10px/1.4 system-ui, sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
        Live checks
        {issues.length > 0 && (
          <span style={{ font: '11px/1 system-ui, sans-serif', opacity: 0.6, marginLeft: 6 }}>{errors} errors · {warnings} warnings</span>
        )}
      </div>

      {issues.length === 0 && (
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
          No issues found.
        </div>
      )}

      <div style={{ display: 'grid', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
        {issues.map(issue => (
          <CheckIssueItem key={issue.id} issue={issue} onClick={() => onIssueClick(issue.blockId)} />
        ))}
      </div>
    </div>
  );
}

function CheckIssueItem({ issue, onClick }: { issue: CheckIssue; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        display: 'flex',
        alignItems: 'start',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 6,
        border: `1px solid rgba(127,127,127,.2)`,
        background: issue.severity === 'error' ? 'rgba(220,38,38,.05)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left' as const,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: severityColor[issue.severity], flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: '600 11px/1.4 system-ui, sans-serif' }}>
          <span style={{ color: severityColor[issue.severity], fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>{typeLabels[issue.type]}</span>
          <span style={{ fontSize: 10, opacity: 0.5 }}>{issue.severity}</span>
        </div>
        <div style={{ font: '13px/1.4 system-ui, sans-serif', marginTop: 2 }}>{issue.title}</div>
        <div style={{ font: '11px/1.4 system-ui, sans-serif', opacity: 0.6, marginTop: 1 }}>{issue.description}</div>
        {issue.fix && <div style={{ font: '11px/1.4 system-ui, sans-serif', opacity: 0.6, marginTop: 1, color: '#4f46e5' }}>{issue.fix}</div>}
      </div>
    </button>
  );
}
