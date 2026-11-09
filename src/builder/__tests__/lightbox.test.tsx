import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateProps } from '@nextcms/builder-core';
import { editorSetup } from '../definitions';
import { ImageBlock as ImageComponent, Gallery } from '../blocks/content';
import { LightboxImage } from '../blocks/lightbox-client';
import {
  clampLightboxPan,
  collectLightboxItems,
  LightboxProvider,
  stepLightboxIndex,
} from '@/components/site/lightbox-context';
import { NOT_A_CONVERSION } from '@/components/site/overlay-host';
import { POPUP_STARTERS } from '@/db/seed/header-footer-starters';

describe('Lightbox block for the popup builder', () => {
  it('Triggers output the image, alt and caption attributes; Image uses the original URL', () => {
    const originalUrl = 'https://example.com/photos/high-res-hero.jpg';
    const alt = 'Mountain sunrise view';
    const caption = 'Early morning in the Alps';

    const imageHtml = renderToStaticMarkup(
      createElement(ImageComponent, {
        url: originalUrl,
        alt,
        caption,
        popupTrigger: true,
        overlayId: 'popup-lightbox',
      })
    );

    assert.ok(imageHtml.includes('data-overlay-open="popup-lightbox"'));
    assert.ok(imageHtml.includes(`data-overlay-image="${originalUrl}"`));
    assert.ok(imageHtml.includes(`data-overlay-alt="${alt}"`));
    assert.ok(imageHtml.includes(`data-overlay-caption="${caption}"`));

    const galleryHtml = renderToStaticMarkup(
      createElement(Gallery, {
        popupTrigger: true,
        overlayId: 'popup-gallery',
        items: [
          { url: 'https://example.com/gallery-1.jpg', alt: 'Photo 1', caption: 'First' },
          { url: 'https://example.com/gallery-2.jpg', alt: 'Photo 2', overlayId: 'popup-override' },
        ],
      })
    );

    assert.ok(galleryHtml.includes('data-overlay-group=""'));
    assert.ok(galleryHtml.includes('data-overlay-open="popup-gallery"'));
    assert.ok(galleryHtml.includes('data-overlay-image="https://example.com/gallery-1.jpg"'));
    assert.ok(galleryHtml.includes('data-overlay-open="popup-override"'));
    assert.ok(galleryHtml.includes('data-overlay-image="https://example.com/gallery-2.jpg"'));
  });

  it('Group collection keeps only triggers for the same popup, so Gallery overrides stay separate', () => {
    // Simulate DOM elements inside a group container
    type MockElement = {
      attributes: Record<string, string>;
      getAttribute(name: string): string | null;
      closest(sel: string): MockElement | null;
      querySelectorAll(sel: string): MockElement[];
      parent?: MockElement;
      children?: MockElement[];
    };

    const groupEl: MockElement = {
      attributes: { 'data-overlay-group': '' },
      getAttribute(name: string) { return this.attributes[name] ?? null; },
      closest(sel: string) { return sel === '[data-overlay-group]' ? this : null; },
      querySelectorAll(_sel: string) {
        return (this.children ?? []).filter(c => c.getAttribute('data-overlay-image'));
      },
    };

    const trigger1: MockElement = {
      attributes: {
        'data-overlay-open': 'popup-A',
        'data-overlay-image': 'img1.jpg',
        'data-overlay-alt': 'Image 1',
      },
      getAttribute(name: string) { return this.attributes[name] ?? null; },
      closest(sel: string) { return sel === '[data-overlay-group]' ? groupEl : null; },
      querySelectorAll() { return []; },
    };

    const trigger2Override: MockElement = {
      attributes: {
        'data-overlay-open': 'popup-B',
        'data-overlay-image': 'img2.jpg',
        'data-overlay-alt': 'Image 2 Override',
      },
      getAttribute(name: string) { return this.attributes[name] ?? null; },
      closest(sel: string) { return sel === '[data-overlay-group]' ? groupEl : null; },
      querySelectorAll() { return []; },
    };

    const trigger3: MockElement = {
      attributes: {
        'data-overlay-open': 'popup-A',
        'data-overlay-image': 'img3.jpg',
        'data-overlay-alt': 'Image 3',
      },
      getAttribute(name: string) { return this.attributes[name] ?? null; },
      closest(sel: string) { return sel === '[data-overlay-group]' ? groupEl : null; },
      querySelectorAll() { return []; },
    };

    groupEl.children = [trigger1, trigger2Override, trigger3];

    const collectGroupTriggers = (clicked: MockElement) => {
      const result = collectLightboxItems(clicked as never);
      assert.ok(result);
      return { items: result.images, index: result.initialIndex };
    };

    // Clicking trigger 1 for popup-A collects only trigger 1 and trigger 3
    const resultA = collectGroupTriggers(trigger1);
    assert.equal(resultA.items.length, 2);
    assert.equal(resultA.items[0].url, 'img1.jpg');
    assert.equal(resultA.items[1].url, 'img3.jpg');
    assert.equal(resultA.index, 0);

    // Clicking trigger 3 for popup-A collects trigger 1 and 3 with index 1
    const resultA3 = collectGroupTriggers(trigger3);
    assert.equal(resultA3.items.length, 2);
    assert.equal(resultA3.index, 1);

    // Clicking trigger 2 for popup-B collects only trigger 2
    const resultB = collectGroupTriggers(trigger2Override);
    assert.equal(resultB.items.length, 1);
    assert.equal(resultB.items[0].url, 'img2.jpg');
    assert.equal(resultB.index, 0);
  });

  it('Next and previous wrap with loop on and stop with it off', () => {
    const images = [
      { url: 'img1.jpg', alt: 'One' },
      { url: 'img2.jpg', alt: 'Two' },
      { url: 'img3.jpg', alt: 'Three' },
    ];

    // With loop: true (default) at index 0, prev button is not disabled
    const loopHtml = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images, initialIndex: 0 } },
        createElement(LightboxImage, { loop: true, showArrows: true })
      )
    );
    assert.ok(loopHtml.includes('aria-label="Previous image"'));
    assert.ok(!loopHtml.includes('disabled=""'));

    // With loop: false at index 0, previous button is disabled
    const noLoopFirstHtml = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images, initialIndex: 0 } },
        createElement(LightboxImage, { loop: false, showArrows: true })
      )
    );
    assert.ok(noLoopFirstHtml.includes('aria-label="Previous image" disabled=""'));

    // With loop: false at index 2 (last), next button is disabled
    const noLoopLastHtml = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images, initialIndex: 2 } },
        createElement(LightboxImage, { loop: false, showArrows: true })
      )
    );
    assert.ok(noLoopLastHtml.includes('aria-label="Next image" disabled=""'));

    // The step itself
    assert.equal(stepLightboxIndex(2, 3, 1, true), 0);
    assert.equal(stepLightboxIndex(0, 3, -1, true), 2);
    assert.equal(stepLightboxIndex(2, 3, 1, false), 2);
    assert.equal(stepLightboxIndex(0, 3, -1, false), 0);
    assert.equal(stepLightboxIndex(1, 3, 1, false), 2);
    assert.equal(stepLightboxIndex(0, 1, 1, true), 0);
  });

  it('Panning a zoomed image stops where its edge would come into view', () => {
    assert.equal(clampLightboxPan(500, 400, 2), 200);
    assert.equal(clampLightboxPan(-500, 400, 2), -200);
    assert.equal(clampLightboxPan(50, 400, 2), 50);
    assert.equal(clampLightboxPan(50, 400, 1), 0);
  });

  it('A trigger with no image is not a lightbox, and an odd overlay ID does not throw', () => {
    const plain = {
      getAttribute: () => null,
      closest: () => null,
    };
    assert.equal(collectLightboxItems(plain as never), null);

    const odd = {
      getAttribute: (name: string) =>
        ({ 'data-overlay-open': 'a"]b', 'data-overlay-image': 'x.jpg' })[name] ??
        null,
      closest: () => null,
    };
    assert.equal(collectLightboxItems(odd as never)?.images[0].url, 'x.jpg');
  });

  it('Arrows, counter and thumbnails are hidden for a single image', () => {
    const images = [{ url: 'single.jpg', alt: 'Only one' }];

    const html = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images, initialIndex: 0 } },
        createElement(LightboxImage, {
          showArrows: true,
          showCounter: true,
          showThumbnails: true,
        })
      )
    );

    assert.ok(!html.includes('aria-label="Previous image"'));
    assert.ok(!html.includes('aria-label="Next image"'));
    assert.ok(!html.includes('1 of 1'));
    assert.ok(!html.includes('aria-label="Go to image 1"'));
    assert.ok(html.includes('src="single.jpg"'));
  });

  it('Fallback image shows when there’s no clicked image', () => {
    const fallbackUrl = 'https://example.com/fallback-placeholder.jpg';
    const fallbackAlt = 'Default banner';

    const html = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: null },
        createElement(LightboxImage, {
          fallbackImage: fallbackUrl,
          fallbackAlt,
          fallbackCaption: 'Default caption',
        })
      )
    );

    assert.ok(html.includes(`src="${fallbackUrl}"`));
    assert.ok(html.includes(`alt="${fallbackAlt}"`));
    assert.ok(html.includes('Default caption'));
  });

  it('The block is in the popup and drawer palettes, not the page palette', () => {
    const popupSetup = editorSetup('popup');
    const popupPalette = popupSetup.groups.flatMap(g => g.types);
    assert.ok(popupPalette.includes('LightboxImage'));
    assert.ok(popupSetup.definitions.LightboxImage);

    const drawerSetup = editorSetup('drawer');
    const drawerPalette = drawerSetup.groups.flatMap(g => g.types);
    assert.ok(drawerPalette.includes('LightboxImage'));
    assert.ok(drawerSetup.definitions.LightboxImage);

    const pageSetup = editorSetup('page');
    const pagePalette = pageSetup.groups.flatMap(g => g.types);
    assert.ok(!pagePalette.includes('LightboxImage'), 'LightboxImage must not be in the page palette');
  });

  it('The starter passes the existing allowed-block checks in overlay-builder.test.ts', () => {
    const popupSetup = editorSetup('popup');
    const lightboxStarter = POPUP_STARTERS.find(s => s.key === 'image-lightbox');
    assert.ok(lightboxStarter, 'image-lightbox starter should be in POPUP_STARTERS');
    assert.equal(lightboxStarter.category, 'Popup');

    const allBlocks = [
      ...lightboxStarter.content.content,
      ...Object.values(lightboxStarter.content.zones ?? {}).flat(),
    ] as { type: string; props: Record<string, unknown> }[];

    assert.ok(allBlocks.length > 0);
    for (const block of allBlocks) {
      const def = popupSetup.definitions[block.type];
      assert.ok(def, `${block.type} not in popup definitions`);
      const val = validateProps(def, block.props);
      assert.equal(val.ok, true, `Props validation failed for ${block.type}`);
    }
  });

  it('Clicks on data-overlay-ui controls don’t count as conversions', () => {
    const html = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        {
          value: {
            images: [
              { url: 'a.jpg', alt: 'A' },
              { url: 'b.jpg', alt: 'B' },
            ],
            initialIndex: 0,
          },
        },
        createElement(LightboxImage, {
          showArrows: true,
          showCounter: true,
          showThumbnails: true,
        })
      )
    );

    // All controls have data-overlay-ui
    assert.ok(html.includes('data-overlay-ui="" aria-label="Previous image"'));
    assert.ok(html.includes('data-overlay-ui="" aria-label="Next image"'));
    assert.ok(html.includes('data-overlay-ui="" aria-label="Go to image 1"'));
    assert.ok(html.includes('data-overlay-ui="" class="absolute top-3 left-3'));

    // The selector onInteract uses to skip non-conversion clicks covers them.
    assert.ok(NOT_A_CONVERSION.includes('[data-overlay-ui]'));
  });
});
