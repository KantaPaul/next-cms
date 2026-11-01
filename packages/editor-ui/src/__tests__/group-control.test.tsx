import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { GroupControl } from '../controls/GroupControl';

describe('GroupControl frame (E12e)', () => {
  it('renders summary row with title, summary text, and chevron', () => {
    const html = renderToStaticMarkup(
      <GroupControl
        title="Typography"
        summary="16px · Inter · Bold"
        open={false}
      >
        <div>Content</div>
      </GroupControl>
    );

    assert.match(html, /Typography/);
    assert.match(html, /16px · Inter · Bold/);
    assert.match(html, /lucide-chevron-right/);
  });

  it('renders changed count badge and reset button when changedCount > 0', () => {
    const html = renderToStaticMarkup(
      <GroupControl
        title="Background"
        changedCount={3}
        onReset={() => {}}
      >
        <div>Fields</div>
      </GroupControl>
    );

    assert.match(html, /3/);
    assert.match(html, /aria-label="3 modified"/);
    assert.match(html, /aria-label="Reset Background group"/);
    assert.match(html, /lucide-rotate-ccw/);
  });

  it('renders Normal/Hover/Focus state chips', () => {
    const html = renderToStaticMarkup(
      <GroupControl
        title="Border"
        open={true}
        state="hover"
        onStateChange={() => {}}
      >
        <div>Fields</div>
      </GroupControl>
    );

    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-label="Border state"/);
    assert.match(html, /role="radio"[^>]*aria-checked="true"[^>]*>Hover<\/button>/);
    assert.match(html, /role="radio"[^>]*aria-checked="false"[^>]*>Normal<\/button>/);
    assert.match(html, /role="radio"[^>]*aria-checked="false"[^>]*>Focus<\/button>/);
  });

  it('renders presets row when presets are provided', () => {
    const html = renderToStaticMarkup(
      <GroupControl
        title="Shadow"
        open={true}
        presets={[
          { id: 'subtle', label: 'Subtle', active: true },
          { id: 'card', label: 'Card', active: false },
        ]}
        onSelectPreset={() => {}}
      >
        <div>Fields</div>
      </GroupControl>
    );

    assert.match(html, /role="group"/);
    assert.match(html, /aria-label="Shadow presets"/);
    assert.match(html, /Subtle/);
    assert.match(html, /Card/);
  });

  it('renders copy/paste menu trigger when handlers are given', () => {
    const html = renderToStaticMarkup(
      <GroupControl
        title="Effects"
        onCopy={() => {}}
        onPaste={() => {}}
      >
        <div>Fields</div>
      </GroupControl>
    );

    assert.match(html, /aria-label="Effects options"/);
    assert.match(html, /title="Group options"/);
  });

  it('renders enable/disable switch when enabled prop is passed', () => {
    const html = renderToStaticMarkup(
      <GroupControl
        title="Backdrop Filter"
        enabled={true}
        onEnabledChange={() => {}}
      >
        <div>Fields</div>
      </GroupControl>
    );

    assert.match(html, /role="switch"/);
    assert.match(html, /aria-label="Enable Backdrop Filter"/);
  });
});
