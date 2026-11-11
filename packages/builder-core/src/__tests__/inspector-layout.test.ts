import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FieldDef } from '../fields';
import {
  DEFAULT_TABS,
  fieldSectionTitle,
  fieldTabId,
  getPath,
  layoutFields,
  setPath,
} from '../inspector-layout';

describe('getPath and setPath helpers', () => {
  it('reads nested values by dotted path safely', () => {
    const data = {
      section: { fill: { color: '#ff0000' } },
      elements: { title: { color: '#00ff00' } },
      simple: 42,
    };
    assert.equal(getPath(data, 'simple'), 42);
    assert.deepEqual(getPath(data, 'section.fill'), { color: '#ff0000' });
    assert.equal(getPath(data, 'section.fill.color'), '#ff0000');
    assert.equal(getPath(data, 'elements.title.color'), '#00ff00');
    assert.equal(getPath(data, 'section.missing.key'), undefined);
    assert.equal(getPath(null, 'section.fill'), undefined);
    assert.equal(getPath(undefined, 'section.fill'), undefined);
  });

  it('immutably writes nested values along dotted path', () => {
    const original = { section: { fill: { color: '#000000' } } };
    const updated = setPath(original, 'section.fill.color', '#ffffff');

    assert.equal(updated.section.fill.color, '#ffffff');
    assert.equal(original.section.fill.color, '#000000'); // original untouched

    const added = setPath(updated, 'elements.title.color', '#123456');
    assert.equal((added as any).elements.title.color, '#123456');
    assert.equal((added as any).section.fill.color, '#ffffff');

    // Deleting value when undefined is set
    const cleared = setPath(added, 'elements.title.color', undefined);
    assert.equal((cleared as any).elements.title.color, undefined);
  });
});

describe('fieldTabId and fieldSectionTitle', () => {
  it('prefers explicit tab and section when provided', () => {
    const field: FieldDef = {
      type: 'text',
      label: 'Badge',
      tab: 'style',
      section: 'Badge',
    };
    assert.equal(fieldTabId(field), 'style');
    assert.equal(fieldSectionTitle(field), 'Badge');
  });

  it('falls back to heuristics when tab or section is not provided', () => {
    const contentField: FieldDef = { type: 'text', label: 'Title', group: 'Content' };
    assert.equal(fieldTabId(contentField), 'content');
    assert.equal(fieldSectionTitle(contentField), 'Content');

    const styleField: FieldDef = { type: 'color', label: 'Color' };
    assert.equal(fieldTabId(styleField), 'style');
    assert.equal(fieldSectionTitle(styleField), 'Background & Effects');

    const animField: FieldDef = { type: 'easing', label: 'Curve' };
    assert.equal(fieldTabId(animField), 'advanced');
    assert.equal(fieldSectionTitle(animField), 'Animation & Effects');
  });
});

describe('layoutFields engine', () => {
  const fields: Record<string, FieldDef> = {
    title: { type: 'text', label: 'Title', tab: 'content', section: 'Main Content' },
    subtitle: { type: 'text', label: 'Subtitle', tab: 'content', section: 'Main Content' },
    cta: { type: 'text', label: 'CTA', tab: 'content', section: 'Action' },
    titleColor: {
      type: 'color',
      label: 'Title Color',
      tab: 'style',
      section: 'Title',
      path: 'elements.title.color',
    },
    buttonColor: {
      type: 'color',
      label: 'Button Color',
      tab: 'style',
      section: 'Button',
      path: 'elements.button.color',
    },
    bgFill: {
      type: 'color',
      label: 'Fill',
      tab: 'style',
      section: 'Background',
      path: 'section.fill',
    },
    advancedZIndex: {
      type: 'number',
      label: 'Z-Index',
      tab: 'advanced',
      section: 'Layout',
      path: 'section.zIndex',
    },
    hiddenField: {
      type: 'text',
      label: 'Secret',
      tab: 'content',
      section: 'Secret Section',
      when: props => !!props.showSecret,
    },
  };

  const defaultProps = {
    title: 'Hello',
    subtitle: 'World',
    cta: 'Click',
    section: { fill: '#fff', zIndex: 1 },
    elements: {
      title: { color: '#000' },
      button: { color: '#00f' },
    },
  };

  const props = {
    ...defaultProps,
    title: 'Hello Modified',
    elements: {
      title: { color: '#f00' }, // changed
      button: { color: '#00f' }, // unchanged
    },
  };

  it('orders tabs and sections according to declaration order', () => {
    const layout = layoutFields({
      fields,
      props,
      defaultProps,
      device: 'desktop',
    });

    const tabIds = layout.tabs.map(t => t.def.id);
    assert.deepEqual(tabIds, ['content', 'style', 'advanced']);

    const contentSections = layout.tabs[0].sections.map(s => s.title);
    assert.deepEqual(contentSections, ['Main Content', 'Action']);

    const styleSections = layout.tabs[1].sections.map(s => s.title);
    assert.deepEqual(styleSections, ['Title', 'Button', 'Background']);
  });

  it('drops fields when "when" evaluates to false', () => {
    const layout = layoutFields({
      fields,
      props: { ...props, showSecret: false },
      defaultProps,
      device: 'desktop',
    });

    const allFieldKeys = layout.tabs.flatMap(t =>
      t.sections.flatMap(s => s.fields.map(([k]) => k))
    );
    assert.ok(!allFieldKeys.includes('hiddenField'));
  });

  describe('devices', () => {
    const keysOn = (
      device: 'desktop' | 'tablet' | 'mobile',
      deviceFields: Record<string, FieldDef>,
      deviceProps: Record<string, unknown> = {}
    ) =>
      layoutFields({ fields: deviceFields, props: deviceProps, device }).tabs.flatMap(t =>
        t.sections.flatMap(s => s.fields.map(([k]) => k))
      );

    it('keeps a field on listed devices and drops it on the others', () => {
      const f: Record<string, FieldDef> = {
        small: { type: 'text', tab: 'content', section: 'Main', devices: ['tablet', 'mobile'] },
      };
      assert.deepEqual(keysOn('desktop', f), []);
      assert.deepEqual(keysOn('tablet', f), ['small']);
      assert.deepEqual(keysOn('mobile', f), ['small']);
    });

    it('shows a field without `devices` on every device', () => {
      const f: Record<string, FieldDef> = {
        always: { type: 'text', tab: 'content', section: 'Main' },
      };
      assert.deepEqual(keysOn('desktop', f), ['always']);
      assert.deepEqual(keysOn('tablet', f), ['always']);
      assert.deepEqual(keysOn('mobile', f), ['always']);
    });

    it('requires both `devices` and `when` to pass', () => {
      const f: Record<string, FieldDef> = {
        both: {
          type: 'text',
          tab: 'content',
          section: 'Main',
          devices: ['mobile'],
          when: p => !!p.on,
        },
      };
      assert.deepEqual(keysOn('mobile', f, { on: true }), ['both']);
      assert.deepEqual(keysOn('mobile', f, { on: false }), []);
      assert.deepEqual(keysOn('desktop', f, { on: true }), []);
    });

    it('drops a tab whose fields are all hidden on the device', () => {
      const f: Record<string, FieldDef> = {
        always: { type: 'text', tab: 'content', section: 'Main' },
        mobileColor: { type: 'color', tab: 'style', section: 'Colors', devices: ['mobile'] },
      };
      const tabIds = (device: 'desktop' | 'mobile') =>
        layoutFields({ fields: f, props: {}, device }).tabs.map(t => t.def.id);
      assert.deepEqual(tabIds('desktop'), ['content']);
      assert.deepEqual(tabIds('mobile'), ['content', 'style']);
    });
  });

  it('drops tabs that have no visible fields (dynamic tabs)', () => {
    // Only style fields present
    const styleOnlyFields: Record<string, FieldDef> = {
      titleColor: fields.titleColor,
    };
    const layout = layoutFields({
      fields: styleOnlyFields,
      props,
      defaultProps,
      device: 'desktop',
    });

    const tabIds = layout.tabs.map(t => t.def.id);
    assert.deepEqual(tabIds, ['style']);
  });

  it('calculates changed counts per section and per tab using dotted paths', () => {
    const layout = layoutFields({
      fields,
      props,
      defaultProps,
      device: 'desktop',
    });

    const contentTab = layout.tabs.find(t => t.def.id === 'content')!;
    assert.equal(contentTab.changedCount, 1); // 'title' is changed

    const styleTab = layout.tabs.find(t => t.def.id === 'style')!;
    assert.equal(styleTab.changedCount, 1); // elements.title.color is changed
    const titleSection = styleTab.sections.find(s => s.title === 'Title')!;
    assert.equal(titleSection.changedCount, 1);
    const buttonSection = styleTab.sections.find(s => s.title === 'Button')!;
    assert.equal(buttonSection.changedCount, 0);

    const advancedTab = layout.tabs.find(t => t.def.id === 'advanced')!;
    assert.equal(advancedTab.changedCount, 0);
  });

  it('filters by search query across label, name, and section', () => {
    const layout = layoutFields({
      fields,
      props,
      defaultProps,
      device: 'desktop',
      query: 'Action',
    });

    assert.equal(layout.tabs.length, 1);
    assert.equal(layout.tabs[0].def.id, 'content');
    assert.equal(layout.tabs[0].sections[0].title, 'Action');
  });

  it('filters by changedOnly keeping only modified fields', () => {
    const layout = layoutFields({
      fields,
      props,
      defaultProps,
      device: 'desktop',
      changedOnly: true,
    });

    const tabIds = layout.tabs.map(t => t.def.id);
    assert.deepEqual(tabIds, ['content', 'style']); // advanced has no changes, so it was dropped

    const allChangedKeys = layout.tabs.flatMap(t =>
      t.sections.flatMap(s => s.fields.map(([k]) => k))
    );
    assert.deepEqual(allChangedKeys, ['title', 'titleColor']);
  });

  it('respects custom block tabs order with Layout first', () => {
    const customFields: Record<string, FieldDef> = {
      motion: { type: 'text', label: 'Motion', tab: 'advanced', section: 'Motion' },
      structure: { type: 'text', label: 'Structure', tab: 'layout', section: 'Structure' },
    };
    const layout = layoutFields({
      fields: customFields,
      props: {},
      device: 'desktop',
      tabs: [
        { id: 'layout', label: 'Layout' },
        { id: 'advanced', label: 'Advanced' },
      ],
    });
    assert.deepEqual(
      layout.tabs.map(t => t.def.id),
      ['layout', 'advanced']
    );
    assert.deepEqual(
      layout.tabs[0].sections.map(s => s.title),
      ['Structure']
    );
  });
});
