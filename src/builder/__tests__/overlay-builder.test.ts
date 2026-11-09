import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedUri } from '@tiptap/extension-link';
import { validateProps } from '@nextcms/builder-core';
import { editorSetup } from '../definitions';
import {
  ButtonBlock,
  FeaturesBlock,
  GalleryBlock,
  ImageNativeBlock,
  ImageMorphBlock,
  TeamBlock,
  TestimonialsBlock,
  VideoBlock,
} from '../definitions/native';
import { Features, Team, Testimonials } from '../blocks/marketing';
import { Gallery, ImageBlock as ImageComponent, Video } from '../blocks/content';
import { ImageMorph } from '../blocks/image-morph';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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

    // Columns hold only Column blocks, and a Column allows overlay blocks
    assert.deepEqual(setup.definitions.Columns?.slots?.columns?.allow, ['Column']);
    const colSlot = setup.definitions.Column?.slots?.content;
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

  it('correctly manages when rules for overlay trigger fields on all supported blocks', () => {
    // Image
    assert.equal(ImageNativeBlock.fields?.overlayId?.when?.({ popupTrigger: false }), false);
    assert.equal(ImageNativeBlock.fields?.overlayId?.when?.({ popupTrigger: true }), true);
    assert.equal(ImageNativeBlock.fields?.link?.when?.({ popupTrigger: false }), true);
    assert.equal(ImageNativeBlock.fields?.link?.when?.({ popupTrigger: true }), false);

    // Gallery
    assert.equal(GalleryBlock.fields?.overlayId?.when?.({ popupTrigger: false }), false);
    assert.equal(GalleryBlock.fields?.overlayId?.when?.({ popupTrigger: true }), true);
    const galleryItemOverlay = (GalleryBlock.fields?.items as any)?.item?.overlayId;
    assert.ok(galleryItemOverlay);
    assert.equal(galleryItemOverlay.when?.({}, { popupTrigger: false }), false);
    assert.equal(galleryItemOverlay.when?.({}, { popupTrigger: true }), true);

    // Video
    assert.equal(VideoBlock.fields?.overlayId?.when?.({ popupTrigger: false }), false);
    assert.equal(VideoBlock.fields?.overlayId?.when?.({ popupTrigger: true }), true);
    assert.equal(VideoBlock.fields?.posterUrl?.when?.({ popupTrigger: false }), false);
    assert.equal(VideoBlock.fields?.posterUrl?.when?.({ popupTrigger: true }), true);

    // Image morph
    assert.equal(ImageMorphBlock.fields?.overlayId?.when?.({ popupTrigger: false }), false);
    assert.equal(ImageMorphBlock.fields?.overlayId?.when?.({ popupTrigger: true }), true);

    // Features list item
    const featureItemOverlay = (FeaturesBlock.fields?.items as any)?.item?.overlayId;
    assert.ok(featureItemOverlay);
    assert.equal(featureItemOverlay.when?.({ popupTrigger: false }), false);
    assert.equal(featureItemOverlay.when?.({ popupTrigger: true }), true);

    // Team list item
    const teamItemOverlay = (TeamBlock.fields?.items as any)?.item?.overlayId;
    assert.ok(teamItemOverlay);
    assert.equal(teamItemOverlay.when?.({ popupTrigger: false }), false);
    assert.equal(teamItemOverlay.when?.({ popupTrigger: true }), true);

    // Testimonials list item
    const testimonialItemOverlay = (TestimonialsBlock.fields?.items as any)?.item?.overlayId;
    assert.ok(testimonialItemOverlay);
    assert.equal(testimonialItemOverlay.when?.({ popupTrigger: false }), false);
    assert.equal(testimonialItemOverlay.when?.({ popupTrigger: true }), true);
  });

  it('renders triggers with data-overlay-open and allows Gallery item overrides to beat block default', () => {
    // 1. Image
    const imgOffHtml = renderToStaticMarkup(
      createElement(ImageComponent, {
        url: 'https://example.com/test.jpg',
        popupTrigger: false,
        overlayId: 'popup-1',
      })
    );
    assert.ok(!imgOffHtml.includes('data-overlay-open'));

    const imgOnHtml = renderToStaticMarkup(
      createElement(ImageComponent, {
        url: 'https://example.com/test.jpg',
        popupTrigger: true,
        overlayId: 'popup-1',
      })
    );
    assert.ok(imgOnHtml.includes('data-overlay-open="popup-1"'));
    assert.ok(imgOnHtml.includes('href="#overlay:popup-1"'));

    // 2. Gallery (item override beats default)
    const galleryHtml = renderToStaticMarkup(
      createElement(Gallery, {
        popupTrigger: true,
        overlayId: 'default-popup',
        items: [
          { url: 'https://example.com/1.jpg' },
          { url: 'https://example.com/2.jpg', overlayId: 'override-popup' },
        ],
      })
    );
    assert.ok(galleryHtml.includes('data-overlay-open="default-popup"'));
    assert.ok(galleryHtml.includes('data-overlay-open="override-popup"'));
    assert.ok(galleryHtml.includes('href="#overlay:default-popup"'));
    assert.ok(galleryHtml.includes('href="#overlay:override-popup"'));

    // Gallery with popupTrigger off
    const galleryOffHtml = renderToStaticMarkup(
      createElement(Gallery, {
        popupTrigger: false,
        overlayId: 'default-popup',
        items: [
          { url: 'https://example.com/1.jpg' },
          { url: 'https://example.com/2.jpg', overlayId: 'override-popup' },
        ],
      })
    );
    assert.ok(!galleryOffHtml.includes('data-overlay-open'));

    // 3. Features
    const featuresHtml = renderToStaticMarkup(
      createElement(Features, {
        items: [
          { title: 'Normal feature' },
          {
            title: 'Trigger feature',
            popupTrigger: true,
            overlayId: 'feat-drawer',
          },
        ],
      })
    );
    assert.ok(featuresHtml.includes('data-overlay-open="feat-drawer"'));
    assert.ok(featuresHtml.includes('href="#overlay:feat-drawer"'));

    // 4. Testimonials
    const testimonialsHtml = renderToStaticMarkup(
      createElement(Testimonials, {
        items: [
          { quote: 'Normal quote', author: 'Author 1' },
          {
            quote: 'Trigger quote',
            author: 'Author 2',
            popupTrigger: true,
            overlayId: 'testi-popup',
          },
        ],
      })
    );
    assert.ok(testimonialsHtml.includes('data-overlay-open="testi-popup"'));
    assert.ok(testimonialsHtml.includes('href="#overlay:testi-popup"'));

    // 5. Team
    const teamHtml = renderToStaticMarkup(
      createElement(Team, {
        items: [
          { name: 'Alice' },
          {
            name: 'Bob',
            popupTrigger: true,
            overlayId: 'team-drawer',
          },
        ],
      })
    );
    assert.ok(teamHtml.includes('data-overlay-open="team-drawer"'));
    assert.ok(teamHtml.includes('href="#overlay:team-drawer"'));

    // 6. Video
    const videoNormalHtml = renderToStaticMarkup(
      createElement(Video, {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
    );
    assert.ok(videoNormalHtml.includes('<iframe'));
    assert.ok(!videoNormalHtml.includes('data-overlay-open'));

    const videoTriggerHtml = renderToStaticMarkup(
      createElement(Video, {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        posterUrl: 'https://example.com/poster.jpg',
        popupTrigger: true,
        overlayId: 'vid-popup',
      })
    );
    assert.ok(!videoTriggerHtml.includes('<iframe'));
    assert.ok(videoTriggerHtml.includes('data-overlay-open="vid-popup"'));
    assert.ok(videoTriggerHtml.includes('href="#overlay:vid-popup"'));
    assert.ok(videoTriggerHtml.includes('src="https://example.com/poster.jpg"'));

    // 7. Image morph
    const morphHtml = renderToStaticMarkup(
      createElement(ImageMorph, {
        popupTrigger: true,
        overlayId: 'morph-popup',
      })
    );
    assert.ok(morphHtml.includes('data-overlay-open="morph-popup"'));
    assert.ok(morphHtml.includes('href="#overlay:morph-popup"'));

    const morphOffHtml = renderToStaticMarkup(
      createElement(ImageMorph, {
        popupTrigger: false,
        overlayId: 'morph-popup',
      })
    );
    assert.ok(!morphOffHtml.includes('data-overlay-open'));
  });
});
