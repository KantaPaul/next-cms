import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConflictDialog } from '../feedback/ConflictDialog';
import { SaveStatus } from '../feedback/SaveStatus';
import { FieldGroup } from '../inspector/FieldGroup';
import { ContextMenu } from '../overlays/ContextMenu';
import { Dialog } from '../primitives/Dialog';
import { IconButton } from '../primitives/IconButton';
import { Menu } from '../primitives/Menu';
import { Select } from '../primitives/Select';
import { Switch } from '../primitives/Switch';
import { Tooltip } from '../primitives/Tooltip';
import { useToast } from '../primitives/Toast';

describe('Radix-based primitives (B15 E2b)', () => {
  it('Switch is a labelled switch reflecting its state', () => {
    const html = renderToStaticMarkup(
      <Switch id="snap" aria-label="Snap" checked onChange={() => {}} />
    );
    assert.match(html, /role="switch"/);
    assert.match(html, /aria-checked="true"/);
    assert.match(html, /id="snap"/);
    assert.match(html, /data-state="checked"/);
  });

  it('Select is a combobox showing the empty option as its placeholder', () => {
    const html = renderToStaticMarkup(
      <Select
        id="align"
        value=""
        options={[
          { value: '', label: 'Choose…' },
          { value: 'left', label: 'Left' },
        ]}
      />
    );
    assert.match(html, /role="combobox"/);
    assert.match(html, /id="align"/);
    assert.match(html, /Choose…/);
    assert.match(html, /data-placeholder/);
  });

  it('closed overlays render only their trigger', () => {
    assert.equal(
      renderToStaticMarkup(
        <Dialog open={false} onClose={() => {}}>
          x
        </Dialog>
      ),
      ''
    );
    assert.equal(
      renderToStaticMarkup(
        <ConflictDialog
          open={false}
          onClose={() => {}}
          onKeepMine={() => {}}
          onUseSaved={() => {}}
        />
      ),
      ''
    );
    const menu = renderToStaticMarkup(
      <Menu trigger={<b>More</b>} items={[{ id: 'a', label: 'A' }]} />
    );
    assert.match(menu, /aria-haspopup="menu"/);
    assert.match(menu, /aria-expanded="false"/);
    assert.doesNotMatch(menu, /role="menu"/);
    const context = renderToStaticMarkup(
      <ContextMenu
        open={false}
        x={0}
        y={0}
        onClose={() => {}}
        actions={[{ id: 'a', label: 'A', onClick: () => {} }]}
      />
    );
    assert.doesNotMatch(context, /role="menu"/);
  });

  it('Tooltip wraps its trigger without changing it; IconButton gets its name from the tooltip', () => {
    const html = renderToStaticMarkup(
      <Tooltip content="Undo">
        <button type="button">U</button>
      </Tooltip>
    );
    assert.match(html, /^<button[^>]*>U<\/button>$/);
    const icon = renderToStaticMarkup(
      <IconButton tooltip="Redo">R</IconButton>
    );
    assert.match(icon, /aria-label="Redo"/);
    assert.doesNotMatch(icon, /title=/);
  });

  it('FieldGroup has a real expandable trigger', () => {
    const open = renderToStaticMarkup(
      <FieldGroup title="Spacing">x</FieldGroup>
    );
    assert.match(open, /<button[^>]*aria-expanded="true"/);
    assert.match(open, /ne-motion-collapse/);
    const closed = renderToStaticMarkup(
      <FieldGroup title="Spacing" defaultExpanded={false}>
        x
      </FieldGroup>
    );
    assert.match(closed, /aria-expanded="false"/);
  });

  it('SaveStatus is a polite live region that animates on change', () => {
    const html = renderToStaticMarkup(<SaveStatus status="saving" />);
    assert.match(
      html,
      /role="status" aria-live="polite" class="ne-motion-enter/
    );
  });

  it('useToast works without a provider (no throw)', () => {
    function Probe() {
      const { toast, dismiss } = useToast();
      return (
        <span>
          {typeof toast}
          {typeof dismiss}
        </span>
      );
    }
    assert.match(renderToStaticMarkup(<Probe />), /functionfunction/);
  });
});

describe('Motion layer (B15 E2b)', () => {
  const css = readFileSync(join(import.meta.dirname, '../motion.css'), 'utf8');

  it('animates Radix open and closed states', () => {
    for (const cls of [
      'ne-motion-overlay',
      'ne-motion-dialog',
      'ne-motion-pop',
      'ne-motion-collapse',
    ]) {
      assert.match(css, new RegExp(`\\.${cls}\\[data-state='open'\\]`));
      assert.match(css, new RegExp(`\\.${cls}\\[data-state='closed'\\]`));
    }
  });

  it('uses the motion tokens and stops under reduced motion', () => {
    assert.match(css, /var\(--ne-duration-normal\) var\(--ne-easing\)/);
    assert.match(
      css,
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: 0\.01ms !important/
    );
  });

  it('never animates translate in dialog keyframes (centering uses the translate property)', () => {
    const dialog = css.slice(
      css.indexOf('@keyframes ne-dialog-in'),
      css.indexOf('@keyframes ne-slide-from-top')
    );
    assert.doesNotMatch(dialog, /translate\(-50%/);
  });
});
