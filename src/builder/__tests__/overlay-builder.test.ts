import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedUri } from '@tiptap/extension-link';
import { validateProps } from '@nextcms/builder-core';
import { editorSetup } from '../definitions';
import { ButtonBlock } from '../definitions/native';
import { sanitizeRichText } from '../sanitize';
import { overlayHref, parseOverlayHref } from '@/lib/overlays/href';
import { menuHref } from '@/components/site/menu-links';
import {
  POPUP_STARTERS,
  DRAWER_STARTERS,
  getStarterContent,
} from '@/db/seed/header-footer-starters';

describe('Popup & Drawer builder palette and editor setup', () => {
  it('editorSetup(popup) surfaces only allow-listed overlay blocks', () => {
    const setup = editorSetup('popup');
    const palette = setup.groups.flatMap(g => g.types);

    const allowed = [
      'Container',
      'Columns',
      'Heading',
      'RichText',
      'Image',
      'Button',
      'Newsletter',
      'ContactForm',
      'Spacer',
      'Divider',
      'OverlayClose',
    ];

    for (const type of allowed) {
      assert.ok(palette.includes(type), `${type} should be in overlay palette`);
      assert.ok(setup.definitions[type], `${type} definition should exist`);
      assert.ok(setup.schemas[type], `${type} schema should exist`);
    }

    const disallowed = [
      'Hero',
      'Features',
      'Pricing',
      'QueryLoop',
      'Video',
      'NavMenu',
      'MobileMenu',
      'HeaderBar',
      'GlobalRef',
    ];

    for (const type of disallowed) {
      assert.ok(!palette.includes(type), `${type} should not be in overlay palette`);
      assert.ok(!setup.schemas[type], `${type} should not be insertable in popup`);
    }

    // Columns slot allows overlay blocks
    const colSlot = setup.definitions.Columns?.slots?.column1;
    assert.ok(colSlot?.allow?.includes('OverlayClose'));
    assert.ok(!colSlot?.allow?.includes('Hero'));
  });

  it('provides distinct position options for popup vs drawer', () => {
    const popupSetup = editorSetup('popup');
    const drawerSetup = editorSetup('drawer');

    // Position field exists in layout tab for both
    assert.ok(popupSetup.rootFields.position);
    assert.ok(drawerSetup.rootFields.position);
    assert.equal(popupSetup.rootFields.position.tab, 'layout');
    assert.equal(drawerSetup.rootFields.position.tab, 'layout');

    const popupPosField = popupSetup.rootFields.position as {
      options?: { label: string; value: string }[];
    };
    const drawerPosField = drawerSetup.rootFields.position as {
      options?: { label: string; value: string }[];
    };
    const popupPositions = popupPosField.options?.map(o => o.value);
    const drawerPositions = drawerPosField.options?.map(o => o.value);

    // Popup positions
    assert.ok(popupPositions?.includes('center'));
    assert.ok(popupPositions?.includes('top-left'));
    assert.ok(popupPositions?.includes('bottom-right'));

    // Drawer positions
    assert.ok(drawerPositions?.includes('left'));
    assert.ok(drawerPositions?.includes('right'));
    assert.ok(drawerPositions?.includes('top'));
    assert.ok(drawerPositions?.includes('bottom'));
    assert.ok(!drawerPositions?.includes('center'));
  });

  it('defines root fields grouped into layout, trigger, targeting, frequency, and schedule tabs', () => {
    const setup = editorSetup('popup');
    const fields = setup.rootFields;

    // Layout tab
    assert.ok(fields.width);
    assert.equal(fields.width.tab, 'layout');
    assert.ok(fields.background);
    assert.equal(fields.background.tab, 'layout');
    assert.ok(fields.overlay);
    assert.equal(fields.overlay.tab, 'layout');
    assert.ok(fields.closeOnEsc);
    assert.equal(fields.closeOnEsc.tab, 'layout');

    // Trigger tab
    assert.ok(fields.triggerType);
    assert.equal(fields.triggerType.tab, 'trigger');
    assert.ok(fields.delaySec);
    assert.equal(fields.delaySec.tab, 'trigger');

    // Targeting tab
    assert.ok(fields.userState);
    assert.equal(fields.userState.tab, 'targeting');

    // Frequency tab
    assert.ok(fields.frequencyMode);
    assert.equal(fields.frequencyMode.tab, 'frequency');
    assert.ok(fields.stopAfterConversion);
    assert.equal(fields.stopAfterConversion.tab, 'frequency');

    // Schedule tab
    assert.ok(fields.enabled);
    assert.equal(fields.enabled.tab, 'schedule');
    assert.ok(fields.startsAt);
    assert.equal(fields.startsAt.tab, 'schedule');
    assert.ok(fields.endsAt);
    assert.equal(fields.endsAt.tab, 'schedule');
  });

  it('provides valid popup starters built from allowed blocks', () => {
    const setup = editorSetup('popup');
    assert.ok(POPUP_STARTERS.length >= 2);
    for (const starter of POPUP_STARTERS) {
      assert.equal(starter.category, 'Popup');
      const all = [
        ...starter.content.content,
        ...Object.values(starter.content.zones ?? {}).flat(),
      ] as { type: string; props: Record<string, unknown> }[];
      for (const block of all) {
        const def = setup.definitions[block.type];
        assert.ok(def, `${starter.key}: ${block.type} not allowed in popup`);
        assert.equal(
          validateProps(def, block.props).ok,
          true,
          `${starter.key}/${block.type} props invalid`
        );
      }
      assert.deepEqual(getStarterContent('Popup', starter.key), starter.content);
    }
  });

  it('provides valid drawer starters built from allowed blocks', () => {
    const setup = editorSetup('drawer');
    assert.ok(DRAWER_STARTERS.length >= 2);
    for (const starter of DRAWER_STARTERS) {
      assert.equal(starter.category, 'Drawer');
      const all = [
        ...starter.content.content,
        ...Object.values(starter.content.zones ?? {}).flat(),
      ] as { type: string; props: Record<string, unknown> }[];
      for (const block of all) {
        const def = setup.definitions[block.type];
        assert.ok(def, `${starter.key}: ${block.type} not allowed in drawer`);
        assert.equal(
          validateProps(def, block.props).ok,
          true,
          `${starter.key}/${block.type} props invalid`
        );
      }
      assert.deepEqual(getStarterContent('Drawer', starter.key), starter.content);
    }
  });

  it('round-trips overlayHref and parseOverlayHref', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    assert.equal(overlayHref(id), `#overlay:${id}`);
    assert.equal(parseOverlayHref(overlayHref(id)), id);
    assert.equal(parseOverlayHref(`#overlay: ${id} `), id);
    assert.equal(parseOverlayHref('#overlay:'), null);
    assert.equal(parseOverlayHref('#section'), null);
    assert.equal(parseOverlayHref('https://example.com'), null);
    assert.equal(parseOverlayHref('/pricing'), null);
    assert.equal(parseOverlayHref(undefined), null);
    assert.equal(parseOverlayHref(null), null);
  });

  it('preserves #overlay:<id> hrefs in sanitizeRichText, TipTap Link, and menuHref', () => {
    const href = overlayHref('popup-uuid-1');
    const html = `<p><a href="${href}">Open offer</a></p>`;
    assert.equal(sanitizeRichText(html), html);
    assert.ok(isAllowedUri(href));
    assert.equal(menuHref(href, 'sub-site'), href);
  });

  it('configures Button overlayId field as a custom picker', () => {
    const overlayField = ButtonBlock.fields?.overlayId;
    assert.ok(overlayField);
    assert.equal(overlayField.type, 'custom');
    assert.equal(overlayField.label, 'Popup / Drawer');
    assert.equal(typeof (overlayField as { render?: unknown }).render, 'function');
  });
});
