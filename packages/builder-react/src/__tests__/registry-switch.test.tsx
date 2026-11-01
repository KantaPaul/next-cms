import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { FieldDef } from '@nextcms/builder-core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BUILT_IN_FIELDS,
  E12_BUILT_IN_FIELDS,
  E12_FIELD_COMPONENTS,
  E12_UPGRADED_BUILT_IN_FIELDS,
  E12ControlsProvider,
  FieldControl,
  FieldTypesProvider,
  getBuiltInFields,
  isE12ControlsEnabled,
  migrateLegacyBlockProps,
  normalizeBackground,
  normalizeBorder,
  normalizeDimensions,
  normalizeShadow,
  setE12ControlsEnabled,
  useE12Controls,
} from '../fields';

describe('E12h Registry Switch & Feature Flag', () => {
  beforeEach(() => {
    setE12ControlsEnabled(null);
  });

  afterEach(() => {
    setE12ControlsEnabled(null);
  });

  it('checks default flag state and allows runtime toggling', () => {
    assert.equal(isE12ControlsEnabled(), false);

    setE12ControlsEnabled(true);
    assert.equal(isE12ControlsEnabled(), true);

    setE12ControlsEnabled(false);
    assert.equal(isE12ControlsEnabled(), false);

    setE12ControlsEnabled(null);
    assert.equal(isE12ControlsEnabled(), false);
  });

  it('provides correct built-in fields map based on flag', () => {
    const classicFields = getBuiltInFields(false);
    assert.ok(classicFields.text);
    assert.ok(classicFields.slider);
    assert.ok(classicFields.dimensions);
    assert.ok(classicFields.typography);
    // In classic mode, number/color/select are the original ones
    assert.equal(classicFields.number, BUILT_IN_FIELDS.number);
    assert.equal(classicFields.color, BUILT_IN_FIELDS.color);

    const e12Fields = getBuiltInFields(true);
    assert.ok(e12Fields.slider);
    assert.ok(e12Fields.dimensions);
    assert.ok(e12Fields.typography);
    assert.ok(e12Fields.border);
    assert.ok(e12Fields.shadow);
    assert.ok(e12Fields.background);
    assert.ok(e12Fields.flex);
    assert.ok(e12Fields.alignment);
    // In E12 mode, number/color/select are upgraded
    assert.equal(e12Fields.number, E12_UPGRADED_BUILT_IN_FIELDS.number);
    assert.equal(e12Fields.color, E12_UPGRADED_BUILT_IN_FIELDS.color);
    assert.equal(e12Fields.select, E12_UPGRADED_BUILT_IN_FIELDS.select);
  });

  it('E12ControlsProvider overrides context value for children', () => {
    function FlagConsumer() {
      const active = useE12Controls();
      return <output data-active={String(active)}>{active ? 'active' : 'inactive'}</output>;
    }

    const defaultHtml = renderToStaticMarkup(<FlagConsumer />);
    assert.match(defaultHtml, /inactive/);

    const activeHtml = renderToStaticMarkup(
      <E12ControlsProvider value={true}>
        <FlagConsumer />
      </E12ControlsProvider>
    );
    assert.match(activeHtml, /active/);
  });
});

describe('E12h Field Components Rendering', () => {
  beforeEach(() => {
    setE12ControlsEnabled(true);
  });

  afterEach(() => {
    setE12ControlsEnabled(null);
  });

  it('renders slider control', () => {
    const field: FieldDef = {
      type: 'slider',
      label: 'Opacity',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      ticks: [0, 50, 100],
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="opacity"
        field={field}
        value={75}
        onChange={() => {}}
        props={{ opacity: 75 }}
      />
    );

    assert.ok(html.includes('Opacity'));
    assert.ok(html.includes('75'));
  });

  it('renders choose control', () => {
    const field: FieldDef = {
      type: 'choose',
      label: 'Text Align',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ],
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="align"
        field={field}
        value="center"
        onChange={() => {}}
        props={{ align: 'center' }}
      />
    );

    assert.ok(html.includes('Text Align'));
    assert.ok(html.includes('Center'));
  });

  it('renders dimensions control', () => {
    const field: FieldDef = {
      type: 'dimensions',
      label: 'Padding',
      units: ['px', 'rem', '%'],
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="padding"
        field={field}
        value={{ top: 12, right: 16, bottom: 12, left: 16, unit: 'px' }}
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Padding'));
    assert.ok(html.includes('12'));
    assert.ok(html.includes('16'));
  });

  it('renders typography group control', () => {
    const field: FieldDef = {
      type: 'typography',
      label: 'Typography',
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="typography"
        field={field}
        value={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 600 }}
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Typography'));
  });

  it('renders border group control', () => {
    const field: FieldDef = {
      type: 'border',
      label: 'Border',
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="border"
        field={field}
        value={{ width: 1, style: 'solid', color: '#e2e8f0', radius: 8 }}
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Border'));
  });

  it('renders shadow editor control', () => {
    const field: FieldDef = {
      type: 'shadow',
      label: 'Box Shadow',
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="shadow"
        field={field}
        value={[{ x: 0, y: 4, blur: 6, spread: 0, color: 'rgba(0,0,0,0.1)' }]}
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Shadow'));
  });

  it('renders background group control', () => {
    const field: FieldDef = {
      type: 'background',
      label: 'Background',
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="background"
        field={field}
        value={{ type: 'color', color: '#f8fafc' }}
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Background'));
  });

  it('renders flex container group control', () => {
    const field: FieldDef = {
      type: 'flex',
      label: 'Flex Container',
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="flex"
        field={field}
        value={{ direction: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 }}
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Flex Container'));
  });

  it('renders alignment pad control', () => {
    const field: FieldDef = {
      type: 'alignment',
      label: 'Alignment',
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="alignment"
        field={field}
        value={{ justify: 'center', align: 'center' }}
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Alignment'));
  });

  it('renders upgraded number and color fields when E12 is active', () => {
    const numberField: FieldDef = {
      type: 'number',
      label: 'Count',
      min: 1,
      max: 10,
      step: 1,
      unit: 'items',
    };

    const colorField: FieldDef = {
      type: 'color',
      label: 'Accent Color',
      tokens: [
        { label: 'Primary', value: 'var(--ne-primary)', color: '#4f46e5' },
      ],
    };

    const numberHtml = renderToStaticMarkup(
      <FieldControl
        name="count"
        field={numberField}
        value={5}
        onChange={() => {}}
        props={{ count: 5 }}
      />
    );
    assert.ok(numberHtml.includes('Count'));
    assert.ok(numberHtml.includes('5'));

    const colorHtml = renderToStaticMarkup(
      <FieldControl
        name="accent"
        field={colorField}
        value="#4f46e5"
        onChange={() => {}}
        props={{ accent: '#4f46e5' }}
      />
    );
    assert.ok(colorHtml.includes('Accent Color'));
    assert.ok(colorHtml.includes('#4f46e5'));
  });
});

describe('E12 Normalization & Migration Helpers', () => {
  it('normalizes legacy number, string, and object dimensions', () => {
    assert.deepEqual(normalizeDimensions(16), {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
      unit: 'px',
    });

    assert.deepEqual(normalizeDimensions('24rem'), {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
      unit: 'rem',
    });

    assert.deepEqual(
      normalizeDimensions({ top: 10, right: 20, bottom: 10, left: 20, unit: 'px' }),
      {
        top: 10,
        right: 20,
        bottom: 10,
        left: 20,
        unit: 'px',
      }
    );

    assert.deepEqual(normalizeDimensions(null), {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      unit: 'px',
    });
  });

  it('normalizes legacy border strings and objects', () => {
    assert.deepEqual(normalizeBorder('2px dashed #ff0000'), {
      width: 2,
      style: 'dashed',
      color: '#ff0000',
    });

    assert.deepEqual(
      normalizeBorder({ width: 1, style: 'solid', color: '#000000', radius: 4 }),
      {
        width: 1,
        style: 'solid',
        color: '#000000',
        radius: 4,
      }
    );

    assert.deepEqual(normalizeBorder(null), {});
  });

  it('normalizes legacy shadow strings, objects, and arrays', () => {
    const fromString = normalizeShadow('#000000');
    assert.equal(fromString.length, 1);
    assert.equal(fromString[0].color, '#000000');

    const fromObj = normalizeShadow({ x: 2, y: 4, blur: 8, color: '#333333' });
    assert.equal(fromObj.length, 1);
    assert.equal(fromObj[0].x, 2);

    const fromArr = normalizeShadow([
      { x: 0, y: 1, blur: 2, color: 'rgba(0,0,0,0.1)' },
      { x: 0, y: 4, blur: 8, color: 'rgba(0,0,0,0.2)' },
    ]);
    assert.equal(fromArr.length, 2);
  });

  it('normalizes background strings (color and gradient) and objects', () => {
    assert.deepEqual(normalizeBackground('#ffffff'), {
      type: 'color',
      color: '#ffffff',
    });

    const grad = normalizeBackground('linear-gradient(...)');
    assert.equal(grad.type, 'gradient');
    assert.ok(grad.gradient);

    assert.deepEqual(normalizeBackground(null), {
      type: 'color',
      color: 'transparent',
    });
  });

  it('migrates legacy flat block props to E12 structured style shapes', () => {
    const legacyProps = {
      title: 'Welcome',
      // Flat typography
      fontFamily: 'Roboto',
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.4,
      textColor: '#1e293b',
      // Flat border
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: '#cbd5e1',
      borderRadius: 12,
      // Spacing
      padding: '16px',
      margin: 8,
      // Flat background
      backgroundColor: '#ffffff',
    };

    const migrated = migrateLegacyBlockProps(legacyProps);

    assert.equal(migrated.title, 'Welcome');

    // Typography structured object
    assert.deepEqual(migrated.typography, {
      fontFamily: 'Roboto',
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.4,
      color: '#1e293b',
    });

    // Border structured object
    assert.deepEqual(migrated.border, {
      width: 2,
      style: 'solid',
      color: '#cbd5e1',
      radius: 12,
    });

    // Dimensions
    assert.deepEqual(migrated.padding, {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
      unit: 'px',
    });
    assert.deepEqual(migrated.margin, {
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
      unit: 'px',
    });

    // Background
    assert.deepEqual(migrated.background, {
      type: 'color',
      color: '#ffffff',
    });
  });

  it('migrates responsive props per device', () => {
    const legacyProps = {
      padding: {
        desktop: '32px',
        tablet: '24px',
        mobile: '16px',
      },
    };

    const fields: Record<string, FieldDef> = {
      padding: {
        type: 'dimensions',
        responsive: true,
      },
    };

    const migrated = migrateLegacyBlockProps(legacyProps, fields);

    const pad = migrated.padding as Record<string, unknown>;
    assert.deepEqual(pad.desktop, {
      top: 32,
      right: 32,
      bottom: 32,
      left: 32,
      unit: 'px',
    });
    assert.deepEqual(pad.tablet, {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
      unit: 'px',
    });
    assert.deepEqual(pad.mobile, {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
      unit: 'px',
    });
  });

  it('renders migrated block values in FieldControl without crashing', () => {
    const legacyProps = {
      fontSize: 18,
      fontWeight: '500',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#000000',
      padding: '12px',
    };

    const migrated = migrateLegacyBlockProps(legacyProps);

    const typoField: FieldDef = { type: 'typography', label: 'Typography' };
    const borderField: FieldDef = { type: 'border', label: 'Border' };
    const paddingField: FieldDef = { type: 'dimensions', label: 'Padding' };

    const typoHtml = renderToStaticMarkup(
      <FieldControl
        name="typography"
        field={typoField}
        value={migrated.typography}
        onChange={() => {}}
        props={migrated}
      />
    );
    assert.ok(typoHtml.includes('Typography'));

    const borderHtml = renderToStaticMarkup(
      <FieldControl
        name="border"
        field={borderField}
        value={migrated.border}
        onChange={() => {}}
        props={migrated}
      />
    );
    assert.ok(borderHtml.includes('Border'));

    const paddingHtml = renderToStaticMarkup(
      <FieldControl
        name="padding"
        field={paddingField}
        value={migrated.padding}
        onChange={() => {}}
        props={migrated}
      />
    );
    assert.ok(paddingHtml.includes('Padding'));
  });
});
