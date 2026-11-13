import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CLASS_CONTENT_PROPERTY,
  CLASS_STATE_OPTIONS,
  CLASS_STYLE_GROUPS,
  resolveClassValue,
  setClassVariantValue,
  statesWithValues,
} from '../class-style-fields';
import { compileStyleClasses } from '../compile-classes';
import { DEFAULT_BREAKPOINTS } from '../fields';
import { forcedStateSelectorSuffix, isValidState, STYLE_CLASS_CSS_PROPERTIES, type StyleClass } from '../style-classes';

const cls = (variants: StyleClass['variants']): StyleClass => ({
  id: 'a',
  siteId: 's',
  name: 'card',
  kind: 'class',
  variants,
  createdAt: '',
  updatedAt: '',
});

describe('class style fields (KRK-03)', () => {
  it('offers only properties a class may store, and only valid states', () => {
    const props = CLASS_STYLE_GROUPS.flatMap(group => group.properties.map(p => p.prop));
    assert.deepEqual(props.filter(p => !STYLE_CLASS_CSS_PROPERTIES.has(p)), []);
    assert.equal(new Set(props).size, props.length, 'no duplicate properties');
    assert.equal(CLASS_CONTENT_PROPERTY.prop, 'content');
    assert.deepEqual(CLASS_STATE_OPTIONS.filter(o => !isValidState(o.value)), []);
  });

  describe('resolveClassValue', () => {
    const c = cls({
      desktop: { color: '#000', paddingTop: '8px' },
      tablet: { color: '#111' },
      'desktop:hover': { color: '#f00' },
    });

    it('reports a value set on the edited variant as own', () => {
      assert.deepEqual(resolveClassValue(c, 'color', 'tablet', null), { kind: 'own', value: '#111' });
    });

    it('inherits from a wider breakpoint, as the CSS cascades', () => {
      assert.deepEqual(resolveClassValue(c, 'color', 'mobile', null), {
        kind: 'inherited',
        value: '#111',
        from: { device: 'tablet', state: null },
      });
      assert.deepEqual(resolveClassValue(c, 'paddingTop', 'mobile', null), {
        kind: 'inherited',
        value: '8px',
        from: { device: 'desktop', state: null },
      });
    });

    it('prefers the same state on a wider breakpoint, then the state-less style', () => {
      assert.deepEqual(resolveClassValue(c, 'color', 'tablet', 'hover'), {
        kind: 'inherited',
        value: '#f00',
        from: { device: 'desktop', state: 'hover' },
      });
      assert.deepEqual(resolveClassValue(c, 'paddingTop', 'desktop', 'hover'), {
        kind: 'inherited',
        value: '8px',
        from: { device: 'desktop', state: null },
      });
    });

    it('is none when nothing sets the property', () => {
      assert.deepEqual(resolveClassValue(c, 'opacity', 'mobile', 'hover'), { kind: 'none' });
    });
  });

  describe('setClassVariantValue', () => {
    it('sets, trims, clears, and removes an emptied variant', () => {
      const set = setClassVariantValue({}, 'tablet', 'hover', 'color', '  #f00 ');
      assert.deepEqual(set, { 'tablet:hover': { color: '#f00' } });
      assert.deepEqual(setClassVariantValue(set, 'tablet', 'hover', 'color', ''), {});
      const both = setClassVariantValue(set, 'tablet', 'hover', 'opacity', '0.5');
      assert.deepEqual(setClassVariantValue(both, 'tablet', 'hover', 'color', undefined), {
        'tablet:hover': { opacity: '0.5' },
      });
    });

    it('does not change the input, and ignores invalid states', () => {
      const variants = { desktop: { color: '#000' } };
      setClassVariantValue(variants, 'desktop', null, 'color', '#fff');
      assert.deepEqual(variants, { desktop: { color: '#000' } });
      assert.equal(setClassVariantValue(variants, 'desktop', 'bogus', 'color', '#fff'), variants);
    });
  });

  it('lists states that have values on any breakpoint', () => {
    const used = statesWithValues(cls({ desktop: { color: '#000' }, 'mobile:hover': { color: '#f00' }, 'desktop:before': {} }));
    assert.deepEqual([...used], ['hover']);
  });

  describe('forced state preview', () => {
    it('maps forceable pseudo-classes to a data attribute', () => {
      assert.equal(forcedStateSelectorSuffix('hover'), '[data-force-state~="hover"]');
      assert.equal(forcedStateSelectorSuffix('hover:before'), '[data-force-state~="hover"]::before');
      assert.equal(forcedStateSelectorSuffix('before'), null);
      assert.equal(forcedStateSelectorSuffix('first-child'), null);
      assert.equal(forcedStateSelectorSuffix('bogus'), null);
      assert.equal(forcedStateSelectorSuffix(null), null);
    });

    it('adds the forced selector only when compiling for the editor', () => {
      const classes = [cls({ 'desktop:hover': { color: '#f00' } })];
      const site = compileStyleClasses({ classes, breakpoints: DEFAULT_BREAKPOINTS });
      const editor = compileStyleClasses({ classes, breakpoints: DEFAULT_BREAKPOINTS, forceStates: true });
      assert.equal(site, ':where(.site-root) .c-card:hover{color:#f00;}');
      assert.equal(
        editor,
        ':where(.site-root) .c-card:hover,:where(.site-root) .c-card[data-force-state~="hover"]{color:#f00;}'
      );
    });
  });
});
