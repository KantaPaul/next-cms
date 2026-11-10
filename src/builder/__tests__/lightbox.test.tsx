import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateProps } from '@nextcms/builder-core';
import { editorSetup } from '../definitions';
import { ImageBlock as ImageComponent, Gallery, Video } from '../blocks/content';
import {
  getThumbnail,
  LightboxImage,
  resolveLightboxTransition,
} from '../blocks/lightbox-client';
import { LightboxImageBlock } from '../definitions/native';
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

  it('Lightbox items: mixed image and video groups produce the right types and order', () => {
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
      getAttribute(name: string) {
        return this.attributes[name] ?? null;
      },
      closest(sel: string) {
        return sel === '[data-overlay-group]' ? this : null;
      },
      querySelectorAll(_sel: string) {
        return (this.children ?? []).filter(
          c =>
            c.getAttribute('data-overlay-image') ||
            c.getAttribute('data-overlay-video')
        );
      },
    };

    const trigger1: MockElement = {
      attributes: {
        'data-overlay-open': 'popup-mixed',
        'data-overlay-image': 'https://example.com/photo.jpg',
        'data-overlay-alt': 'A photo',
      },
      getAttribute(name: string) {
        return this.attributes[name] ?? null;
      },
      closest(sel: string) {
        return sel === '[data-overlay-group]' ? groupEl : null;
      },
      querySelectorAll() {
        return [];
      },
    };

    const trigger2: MockElement = {
      attributes: {
        'data-overlay-open': 'popup-mixed',
        'data-overlay-video': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'data-overlay-poster': 'https://example.com/poster.jpg',
        'data-overlay-caption': 'Rick Astley',
        'data-overlay-video-id': 'vid-123',
      },
      getAttribute(name: string) {
        return this.attributes[name] ?? null;
      },
      closest(sel: string) {
        return sel === '[data-overlay-group]' ? groupEl : null;
      },
      querySelectorAll() {
        return [];
      },
    };

    groupEl.children = [trigger1, trigger2];

    const result = collectLightboxItems(trigger1 as never);
    assert.ok(result);
    assert.equal(result.images.length, 2);
    assert.equal(result.images[0].type, 'image');
    assert.equal(result.images[0].url, 'https://example.com/photo.jpg');
    assert.equal(result.images[1].type, 'video');
    assert.equal(
      result.images[1].url,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    assert.equal(result.images[1].poster, 'https://example.com/poster.jpg');
    assert.equal(result.images[1].videoId, 'vid-123');
    assert.equal(result.initialIndex, 0);

    const resultFromVideo = collectLightboxItems(trigger2 as never);
    assert.ok(resultFromVideo);
    assert.equal(resultFromVideo.initialIndex, 1);
  });

  it('Video block popup trigger outputs data-overlay-video and poster attributes', () => {
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const posterUrl = 'https://example.com/custom-poster.jpg';

    const html = renderToStaticMarkup(
      createElement(Video, {
        url: videoUrl,
        posterUrl,
        popupTrigger: true,
        overlayId: 'popup-lightbox',
      })
    );

    assert.ok(html.includes('data-overlay-open="popup-lightbox"'));
    assert.ok(html.includes(`data-overlay-video="${videoUrl}"`));
    assert.ok(html.includes(`data-overlay-poster="${posterUrl}"`));
  });

  it('Lightbox rendering: video renders a player without zoom controls', () => {
    const videoItem = {
      type: 'video' as const,
      url: 'https://example.com/video.mp4',
      caption: 'Sample Video',
    };

    const html = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images: [videoItem], initialIndex: 0 } },
        createElement(LightboxImage, {
          enableZoom: true,
          showArrows: false,
          showCounter: false,
          showThumbnails: false,
        })
      )
    );

    // Video renders native player
    assert.ok(html.includes('<video'));
    assert.ok(html.includes('src="https://example.com/video.mp4"'));
    // Zoom cursor is disabled for videos
    assert.ok(!html.includes('cursor-zoom-in'));
    assert.ok(!html.includes('cursor-grab'));
  });

  it('Lightbox rendering: transitions render the right classes and reduced motion switches to none', () => {
    const imgItem = {
      type: 'image' as const,
      url: 'https://example.com/pic.jpg',
    };

    const htmlFade = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images: [imgItem], initialIndex: 0 } },
        createElement(LightboxImage, {
          transition: 'fade',
          transitionSpeed: 'fast',
        })
      )
    );
    assert.ok(htmlFade.includes('lightbox-transition-fade'));
    assert.ok(htmlFade.includes('200ms'));

    const htmlSlide = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images: [imgItem], initialIndex: 0 } },
        createElement(LightboxImage, {
          transition: 'slide',
          transitionSpeed: 'slow',
        })
      )
    );
    assert.ok(htmlSlide.includes('lightbox-transition-slide'));
    assert.ok(htmlSlide.includes('lightbox-slide-next'));
    assert.ok(htmlSlide.includes('600ms'));

    const htmlZoom = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images: [imgItem], initialIndex: 0 } },
        createElement(LightboxImage, {
          transition: 'zoom',
          transitionSpeed: 'normal',
        })
      )
    );
    assert.ok(htmlZoom.includes('lightbox-transition-zoom'));
    assert.ok(htmlZoom.includes('350ms'));

    const htmlNone = renderToStaticMarkup(
      createElement(
        LightboxProvider,
        { value: { images: [imgItem], initialIndex: 0 } },
        createElement(LightboxImage, {
          transition: 'none',
        })
      )
    );
    assert.ok(htmlNone.includes('lightbox-transition-none'));

    // Reduced motion resolution logic
    assert.equal(resolveLightboxTransition('fade', true), 'none');
    assert.equal(resolveLightboxTransition('slide', true), 'none');
    assert.equal(resolveLightboxTransition('zoom', true), 'none');
    assert.equal(resolveLightboxTransition('fade', false), 'fade');
  });

  it('Lightbox field rules and naming: label is Lightbox, speed hides for none', () => {
    assert.equal(LightboxImageBlock.label, 'Lightbox');
    assert.equal(
      LightboxImageBlock.fields?.transitionSpeed?.when?.({
        transition: 'none',
      }),
      false
    );
    assert.equal(
      LightboxImageBlock.fields?.transitionSpeed?.when?.({
        transition: 'fade',
      }),
      true
    );
    assert.equal(
      LightboxImageBlock.fields?.transitionSpeed?.when?.({
        transition: 'slide',
      }),
      true
    );
  });

  it('Gives a video with no poster a play icon, not a broken image', () => {
    assert.equal(
      getThumbnail({ type: 'video', url: 'https://example.com/clip.mp4' }),
      ''
    );
    assert.equal(
      getThumbnail({ type: 'video', url: 'https://vimeo.com/76979871' }),
      ''
    );
    assert.equal(
      getThumbnail({ type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' }),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
    assert.equal(
      getThumbnail({ type: 'video', url: 'https://vimeo.com/1', poster: 'p.jpg' }),
      'p.jpg'
    );
    assert.equal(getThumbnail({ type: 'image', url: 'a.jpg' }), 'a.jpg');
  });

  it('CollectionItem wraps media fields in OverlayTrigger when popupTrigger and overlayId are set', async () => {
    const { CollectionItem } = await import('../blocks/collection-item-client');
    const { CollectionItemBlock } = await import('../definitions/native');
    const { EntryProvider } = await import('@/components/analytics/entry-context');

    const entry = {
      id: 'entry-1',
      collectionId: 'col-1',
      slug: 'open-classroom',
      status: 'published',
      data: {
        title: 'Open Classroom',
        screenshot: 'https://example.com/screen.png',
      },
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
      collection: {
        id: 'col-1',
        siteId: 'site-1',
        name: 'Showcase',
        slug: 'showcase',
        templatePageId: null,
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          {
            key: 'screenshot',
            label: 'Screenshot',
            type: 'media',
            config: { isFeatured: true },
          },
          {
            key: 'extra_image',
            label: 'Extra Image',
            type: 'media',
            config: { isFeatured: false },
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      createElement(EntryProvider, {
        entry,
        children: createElement(CollectionItem, {
          items: [
            {
              field: 'screenshot',
              popupTrigger: true,
              overlayId: 'popup-lightbox',
              motion: { mouseTrack: { strength: 15, direction: 'opposite' } },
            },
            {
              field: 'extra_image',
              motion: { mouseTrack: { strength: 15, direction: 'opposite' } },
            },
            {
              field: 'title',
              popupTrigger: true,
              overlayId: 'popup-lightbox',
              motion: { mouseTrack: { strength: 15, direction: 'opposite' } },
            },
          ],
        }),
      })
    );

    assert.ok(html.includes('data-overlay-group=""'));
    assert.ok(html.includes('data-overlay-open="popup-lightbox"'));
    assert.ok(
      html.includes('data-overlay-image="https://example.com/screen.png"')
    );
    assert.ok(html.includes('data-overlay-alt="Screenshot"'));
    assert.ok(html.includes('overflow-hidden'));
    assert.ok(html.includes('data-motion="'));
    // Motion only renders on the media field with isFeatured enabled (not text or non-featured media fields)
    assert.equal(html.match(/data-overlay-open="popup-lightbox"/g)?.length, 1);
    assert.equal(html.match(/data-motion="/g)?.length, 1);

    // Default field rules keep motion/lightbox hidden until media field context enables them
    assert.equal(
      CollectionItemBlock.fields?.section_motion_effects?.when?.({}),
      false
    );

    // Disabled / empty motion or legacy section.motion on CollectionItem must not emit data-motion
    const disabledHtml = renderToStaticMarkup(
      createElement(EntryProvider, {
        entry,
        children: createElement(CollectionItem, {
          section: { motion: { mouseTrack: { strength: 20, direction: 'opposite' } } },
          items: [
            {
              field: 'screenshot',
              motion: { devices: [] },
            },
          ],
        }),
      })
    );
    assert.equal(disabledHtml.includes('data-motion='), false);
  });

  it('renders CollectionItem multi-image Facebook gallery with featured image always first', () => {
    const { EntryProvider } = require('@/components/analytics/entry-context');
    const { CollectionItem } = require('../blocks/collection-item-client');

    const entry = {
      id: 'entry-gallery-1',
      collectionId: 'col-1',
      slug: 'multi-showcase',
      status: 'published',
      data: {
        title: 'Showcase Gallery',
        hero: 'https://example.com/featured.jpg',
        screenshots: [
          'https://example.com/shot-1.jpg',
          'https://example.com/shot-2.jpg',
          'https://example.com/shot-3.jpg',
          'https://example.com/shot-4.jpg',
          'https://example.com/shot-5.jpg',
        ],
      },
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
      collection: {
        id: 'col-1',
        siteId: 'site-1',
        name: 'Showcase',
        slug: 'showcase',
        templatePageId: null,
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          {
            key: 'hero',
            label: 'Featured Shot',
            type: 'media',
            config: { isFeatured: true },
          },
          {
            key: 'screenshots',
            label: 'Screenshots',
            type: 'media',
            config: { multiple: true },
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      createElement(EntryProvider, {
        entry,
        children: createElement(CollectionItem, {
          items: [
            {
              field: 'screenshots',
              galleryStyle: 'fb-mosaic',
              galleryAspect: 'landscape',
            },
          ],
        }),
      })
    );

    assert.ok(html.includes('data-gallery-style="fb-mosaic"'));
    assert.ok(html.includes('data-gallery-aspect="landscape"'));
    // Featured image must appear before the gallery shots, with +1 overflow for 6 total images
    const featuredIdx = html.indexOf('https://example.com/featured.jpg');
    const shot1Idx = html.indexOf('https://example.com/shot-1.jpg');
    assert.ok(featuredIdx !== -1 && shot1Idx !== -1 && featuredIdx < shot1Idx);
    assert.ok(html.includes('+1'));

    // With popupTrigger + overlayId enabled, every gallery image emits its own OverlayTrigger inside data-overlay-group (no nested buttons)
    const popupHtml = renderToStaticMarkup(
      createElement(EntryProvider, {
        entry,
        children: createElement(CollectionItem, {
          items: [
            {
              field: 'screenshots',
              galleryStyle: 'fb-mosaic',
              popupTrigger: true,
              overlayId: 'popup-lightbox',
            },
          ],
        }),
      })
    );
    assert.equal(popupHtml.match(/data-overlay-open="popup-lightbox"/g)?.length, 6);
    assert.ok(popupHtml.includes('data-overlay-image="https://example.com/featured.jpg"'));
    assert.ok(popupHtml.includes('data-overlay-image="https://example.com/shot-5.jpg"'));
    assert.equal(popupHtml.includes('<button'), false);
  });

  it('renders round gallery icon badge over listing images and respects editor toggle', () => {
    const { QueryLoop } = require('../blocks/query-loop');
    const { LoopItemField } = require('../blocks/loop-item-field');
    const { LoopItemProvider } = require('../blocks/query-loop-client');
    const { PostTypeEntries } = require('../blocks/post-type-entries');

    const items = [
      {
        id: 'item-gallery',
        title: 'Multi Photo Post',
        slug: 'multi-photo-post',
        url: '/collections/showcase/multi-photo-post',
        excerpt: 'Has a gallery',
        image: 'https://example.com/featured.jpg',
        hasGallery: true,
        galleryCount: 4,
        source: 'collection-entries' as const,
      },
      {
        id: 'item-single',
        title: 'Single Photo Post',
        slug: 'single-photo-post',
        url: '/collections/showcase/single-photo-post',
        excerpt: 'Only one photo',
        image: 'https://example.com/single.jpg',
        hasGallery: false,
        galleryCount: 1,
        source: 'collection-entries' as const,
      },
    ];

    const loopOn = renderToStaticMarkup(
      createElement(QueryLoop, {
        items,
        showGalleryBadge: true,
        galleryBadgePosition: 'bottom-left',
      })
    );
    assert.equal(loopOn.match(/data-gallery-badge=""/g)?.length, 1);
    assert.ok(loopOn.includes('rounded-full'));
    assert.ok(loopOn.includes('bottom-2.5 left-2.5'));

    const loopOff = renderToStaticMarkup(
      createElement(QueryLoop, {
        items,
        showGalleryBadge: false,
      })
    );
    assert.equal(loopOff.includes('data-gallery-badge='), false);

    const fieldHtml = renderToStaticMarkup(
      createElement(LoopItemProvider, {
        item: items[0],
        children: createElement(LoopItemField, {
          field: 'image',
          showGalleryBadge: true,
        }),
      })
    );
    assert.equal(fieldHtml.match(/data-gallery-badge=""/g)?.length, 1);

    const entriesHtml = renderToStaticMarkup(
      createElement(PostTypeEntries, {
        collectionId: 'col-1',
        resolvedCollectionId: 'col-1',
        display: 'cards',
        items,
        showGalleryBadge: true,
      })
    );
    assert.equal(entriesHtml.match(/data-gallery-badge=""/g)?.length, 1);

    const entriesHiddenHtml = renderToStaticMarkup(
      createElement(PostTypeEntries, {
        collectionId: 'col-1',
        resolvedCollectionId: 'col-1',
        display: 'cards',
        items,
        showGalleryBadge: false,
      })
    );
    assert.equal(entriesHiddenHtml.includes('data-gallery-badge='), false);
  });

  it('renders PostFeaturedImage Content-tab motion with overflow clipping and ignores disabled/legacy section motion', () => {
    const { PostFeaturedImage } = require('../blocks/blog');
    const { PostFeaturedImageBlock } = require('../definitions/native');

    assert.ok(PostFeaturedImageBlock.fields?.motion);
    assert.equal(
      PostFeaturedImageBlock.fields?.section_motion_effects?.when?.({}),
      false
    );

    const post = {
      id: 'p-featured-1',
      title: 'Featured Showcase',
      slug: 'featured-showcase',
      language: 'en',
      excerpt: null,
      featuredImage: 'https://example.com/featured.jpg',
      body: '',
      publishedAt: null,
      authorName: null,
      categories: [],
      tags: [],
    };

    const withMotion = renderToStaticMarkup(
      createElement(PostFeaturedImage, {
        post,
        motion: { mouseTrack: { strength: 15, direction: 'opposite' } },
      })
    );
    assert.ok(withMotion.includes('overflow-hidden'));
    assert.ok(withMotion.includes('data-motion="'));

    const disabledMotion = renderToStaticMarkup(
      createElement(PostFeaturedImage, {
        post,
        section: { motion: { mouseTrack: { strength: 20, direction: 'opposite' } } },
        motion: { devices: [] },
      })
    );
    assert.equal(disabledMotion.includes('data-motion='), false);
  });

  it('renders CollectionItem video (with lightbox), embed iframe, URL controls, and plain text based on field config switches', () => {
    const { EntryProvider } = require('@/components/analytics/entry-context');
    const { CollectionItem } = require('../blocks/collection-item-client');
    const { ConsentProvider } = require('@/components/site/consent-provider');
    const { DEFAULT_CONSENT_SETTINGS } = require('@/lib/site-essentials-types');

    const entry = {
      id: 'entry-modes-1',
      collectionId: 'col-1',
      slug: 'mode-showcase',
      status: 'published',
      data: {
        subtitle: 'Plain studio tagline',
        video_text: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        video_lightbox: 'https://youtu.be/dQw4w9WgXcQ',
        embed_text:
          '<iframe width="560" height="315" src="https://demo.example.com/app" title="Studio Demo"></iframe>',
        site_link: 'https://northwind.example.com',
      },
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
      collection: {
        id: 'col-1',
        siteId: 'site-1',
        name: 'Showcase',
        slug: 'showcase',
        templatePageId: null,
        fields: [
          {
            key: 'subtitle',
            label: 'Subtitle',
            type: 'text',
            config: { textMode: 'plain' },
          },
          {
            key: 'video_text',
            label: 'Inline Video',
            type: 'text',
            config: { textMode: 'video' },
          },
          {
            key: 'video_lightbox',
            label: 'Lightbox Video',
            type: 'url',
            config: { urlMode: 'video' },
          },
          {
            key: 'embed_text',
            label: 'Live Embed',
            type: 'text',
            config: { textMode: 'embed' },
          },
          {
            key: 'site_link',
            label: 'Live Site',
            type: 'url',
            config: { urlMode: 'other' },
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      createElement(
        ConsentProvider,
        { settings: DEFAULT_CONSENT_SETTINGS, initialCookie: null },
        createElement(EntryProvider, {
          entry,
          children: createElement(CollectionItem, {
            editing: true,
            items: [
              { field: 'subtitle', textSize: 'lead' },
              { field: 'video_text' },
              {
                field: 'video_lightbox',
                popupTrigger: true,
                overlayId: 'video-popup',
                posterUrl: 'https://example.com/poster.jpg',
              },
              { field: 'embed_text' },
              {
                field: 'site_link',
                urlDisplay: 'button',
                urlLinkText: 'Visit Studio',
                urlNewTab: true,
              },
            ],
          }),
        })
      )
    );

    assert.ok(html.includes('Plain studio tagline'));
    assert.ok(html.includes('src="https://www.youtube.com/embed/dQw4w9WgXcQ"'));
    assert.ok(html.includes('data-overlay-open="video-popup"'));
    assert.ok(html.includes('data-overlay-video="https://youtu.be/dQw4w9WgXcQ"'));
    assert.ok(html.includes('src="https://example.com/poster.jpg"'));
    assert.ok(html.includes('src="https://demo.example.com/app"'));
    assert.ok(html.includes('href="https://northwind.example.com"'));
    assert.ok(html.includes('Visit Studio'));
    assert.ok(html.includes('target="_blank"'));
  });

  it('hides text and background style controls in CollectionItem Value style for Image, Gallery, Video, and Embed fields', () => {
    const {
      ALL_PARTS,
      VISUAL_MEDIA_PARTS,
      styleControl,
    } = require('../definitions/fields');

    const visualSet = new Set(['hero', 'gallery', 'promo_video', 'embed_code']);
    const renderValueStyle = styleControl(ALL_PARTS, (item?: Record<string, unknown>) =>
      typeof item?.field === 'string' && visualSet.has(item.field)
        ? VISUAL_MEDIA_PARTS
        : ALL_PARTS
    );

    // Visual parts exclude text color, typography, text stroke, text shadow, and background (normal & hover)
    for (const omitted of [
      'color',
      'typography',
      'textStroke',
      'textShadow',
      'background',
    ] as const) {
      assert.equal(VISUAL_MEDIA_PARTS.includes(omitted), false);
    }

    for (const fieldKey of ['hero', 'gallery', 'promo_video', 'embed_code']) {
      const mediaStyleHtml = renderToStaticMarkup(
        createElement(renderValueStyle as React.ComponentType<any>, {
          value: undefined,
          onChange: () => {},
          props: { field: fieldKey },
        })
      );
      assert.equal(mediaStyleHtml.includes('Text color'), false);
      assert.equal(mediaStyleHtml.includes('Typography'), false);
      assert.equal(mediaStyleHtml.includes('Text Stroke'), false);
      assert.equal(mediaStyleHtml.includes('Text Shadow'), false);
      assert.equal(mediaStyleHtml.includes('Background'), false);
      assert.ok(mediaStyleHtml.includes('Border'));
      assert.ok(mediaStyleHtml.includes('Box Shadow'));
      assert.ok(mediaStyleHtml.includes('Padding'));
      assert.ok(mediaStyleHtml.includes('Margin'));
      assert.ok(mediaStyleHtml.includes('CSS Filters'));
    }

    const plainTextHtml = renderToStaticMarkup(
      createElement(renderValueStyle as React.ComponentType<any>, {
        value: undefined,
        onChange: () => {},
        props: { field: 'subtitle' },
      })
    );
    assert.ok(plainTextHtml.includes('Text color'));
    assert.ok(plainTextHtml.includes('Typography'));
    assert.ok(plainTextHtml.includes('Text Stroke'));
    assert.ok(plainTextHtml.includes('Text Shadow'));
    assert.ok(plainTextHtml.includes('Background'));
  });
});
