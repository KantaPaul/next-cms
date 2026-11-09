import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VideoLibraryNativeBlock } from '../definitions/native';
import {
  VideoLibrary,
  type VideoLibraryVideoItem,
} from '@/components/video/video-library';

const TEST_VIDEOS: VideoLibraryVideoItem[] = [
  {
    id: 'vid-1',
    siteId: 'test',
    playlistId: null,
    title: 'First Tutorial Video',
    slug: 'first-tutorial-video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    provider: 'youtube',
    providerId: 'dQw4w9WgXcQ',
    thumbnailUrl: 'https://example.com/thumb1.jpg',
    duration: 120,
    status: 'published',
    visibility: 'public',
  },
  {
    id: 'vid-2',
    siteId: 'test',
    playlistId: null,
    title: 'Second Masterclass Video',
    slug: 'second-masterclass-video',
    url: 'https://vimeo.com/76979871',
    provider: 'vimeo',
    providerId: '76979871',
    thumbnailUrl: 'https://example.com/thumb2.jpg',
    duration: 300,
    status: 'published',
    visibility: 'public',
  },
];

describe('Video Gallery Grid layout and field rules', () => {
  it('Field rules: columns and overlayId show only when layout is grid', () => {
    const layoutField = VideoLibraryNativeBlock.fields?.layout;
    assert.ok(layoutField);
    const layoutValues = (layoutField as any).options?.map(
      (o: any) => o.value
    );
    assert.ok(layoutValues.includes('sidebar'));
    assert.ok(layoutValues.includes('stacked'));
    assert.ok(layoutValues.includes('grid'));

    const columnsField = VideoLibraryNativeBlock.fields?.columns;
    assert.ok(columnsField);
    assert.equal(columnsField?.when?.({ layout: 'grid' }), true);
    assert.equal(columnsField?.when?.({ layout: 'sidebar' }), false);
    assert.equal(columnsField?.when?.({ layout: 'stacked' }), false);

    const overlayIdField = VideoLibraryNativeBlock.fields?.overlayId;
    assert.ok(overlayIdField);
    assert.equal(overlayIdField?.when?.({ layout: 'grid' }), true);
    assert.equal(overlayIdField?.when?.({ layout: 'sidebar' }), false);
    assert.equal(overlayIdField?.when?.({ layout: 'stacked' }), false);
  });

  it('Grid layout with popup: cards render overlay triggers and grid has data-overlay-group', () => {
    const html = renderToStaticMarkup(
      createElement(VideoLibrary, {
        videos: TEST_VIDEOS,
        layout: 'grid',
        columns: 3,
        overlayId: 'popup-lightbox',
      })
    );

    // Grid container is an overlay group
    assert.ok(html.includes('data-overlay-group=""'));
    assert.ok(html.includes('lg:grid-cols-3'));

    // Cards output trigger attributes
    assert.ok(html.includes('data-overlay-open="popup-lightbox"'));
    assert.ok(
      html.includes(
        'data-overlay-video="https://www.youtube.com/watch?v=dQw4w9WgXcQ"'
      )
    );
    assert.ok(
      html.includes('data-overlay-poster="https://example.com/thumb1.jpg"')
    );
    assert.ok(html.includes('data-overlay-video-id="vid-1"'));
    assert.ok(html.includes('data-overlay-caption="First Tutorial Video"'));

    assert.ok(
      html.includes('data-overlay-video="https://vimeo.com/76979871"')
    );
    assert.ok(
      html.includes('data-overlay-poster="https://example.com/thumb2.jpg"')
    );
    assert.ok(html.includes('data-overlay-video-id="vid-2"'));
    assert.ok(html.includes('data-overlay-caption="Second Masterclass Video"'));

    // Card shows play icon, title, and formatted duration (120s = 2:00, 300s = 5:00)
    assert.ok(html.includes('2:00'));
    assert.ok(html.includes('5:00'));
  });

  it('Grid layout columns: applies 2, 3, or 4 columns properly', () => {
    const html2 = renderToStaticMarkup(
      createElement(VideoLibrary, {
        videos: TEST_VIDEOS,
        layout: 'grid',
        columns: 2,
        overlayId: 'popup-lightbox',
      })
    );
    assert.ok(html2.includes('lg:grid-cols-2'));

    const html4 = renderToStaticMarkup(
      createElement(VideoLibrary, {
        videos: TEST_VIDEOS,
        layout: 'grid',
        columns: 4,
        overlayId: 'popup-lightbox',
      })
    );
    assert.ok(html4.includes('lg:grid-cols-4'));
  });

  it('Video library: Grid without a popup falls back to the inline player', () => {
    const html = renderToStaticMarkup(
      createElement(VideoLibrary, {
        videos: TEST_VIDEOS,
        layout: 'grid',
        columns: 3,
        // no overlayId
      })
    );

    // Renders the inline player above the grid
    assert.ok(
      html.includes('iframe') ||
        html.includes('youtube') ||
        html.includes('video')
    );
    // Does NOT render data-overlay-open links since there is no popup
    assert.ok(!html.includes('data-overlay-open='));
    // Renders buttons for clicking cards
    assert.ok(html.includes('aria-label="Play First Tutorial Video"'));
    assert.ok(html.includes('First Tutorial Video'));
  });
});
