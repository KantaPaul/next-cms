import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LogoCloudBlock,
  SliderBlock,
  TeamBlock,
  TestimonialsBlock,
} from '../definitions/native';
import { sliderFields } from '../definitions/fields';
import { LogoCloud, Team, Testimonials } from '../blocks/marketing';
import {
  chunkItemsIntoPages,
  ItemSlider,
  pageToScroll,
  scrollToPage,
} from '../blocks/item-slider-client';

describe('sliderFields definition and visibility rules', () => {
  it('shows slider settings only when slider switch is on', () => {
    const fields = sliderFields({ desktop: 3, tablet: 2, mobile: 1 });

    // slider switch is always present
    assert.ok(fields.slider);
    assert.equal(fields.slider.type, 'toggle');
    assert.equal(fields.slider.when, undefined);

    // sub-settings are hidden when slider is off
    assert.equal(fields.sliderPerView?.when?.({ slider: false }), false);
    assert.equal(fields.sliderPerViewTablet?.when?.({ slider: false }), false);
    assert.equal(fields.sliderPerViewMobile?.when?.({ slider: false }), false);
    assert.equal(fields.sliderGap?.when?.({ slider: false }), false);
    assert.equal(fields.sliderAutoplay?.when?.({ slider: false }), false);
    assert.equal(fields.sliderLoop?.when?.({ slider: false }), false);
    assert.equal(fields.sliderArrows?.when?.({ slider: false }), false);
    assert.equal(fields.sliderDots?.when?.({ slider: false }), false);
    assert.equal(fields.arrow_style?.when?.({ slider: false }), false);
    assert.equal(fields.dot_style?.when?.({ slider: false }), false);

    // sub-settings are shown when slider is on
    assert.equal(fields.sliderPerView?.when?.({ slider: true }), true);
    assert.equal(fields.sliderPerViewTablet?.when?.({ slider: true }), true);
    assert.equal(fields.sliderPerViewMobile?.when?.({ slider: true }), true);
    assert.equal(fields.sliderGap?.when?.({ slider: true }), true);
    assert.equal(fields.sliderAutoplay?.when?.({ slider: true }), true);
    assert.equal(fields.sliderLoop?.when?.({ slider: true }), true);
    assert.equal(fields.sliderArrows?.when?.({ slider: true }), true);
    assert.equal(fields.sliderDots?.when?.({ slider: true }), true);
    assert.equal(fields.arrow_style?.when?.({ slider: true }), true);
    assert.equal(fields.dot_style?.when?.({ slider: true }), true);

    // autoplay intervals require both slider and sliderAutoplay
    assert.equal(
      fields.sliderInterval?.when?.({ slider: false, sliderAutoplay: false }),
      false
    );
    assert.equal(
      fields.sliderInterval?.when?.({ slider: true, sliderAutoplay: false }),
      false
    );
    assert.equal(
      fields.sliderInterval?.when?.({ slider: true, sliderAutoplay: true }),
      true
    );

    assert.equal(
      fields.sliderPauseOnHover?.when?.({ slider: true, sliderAutoplay: false }),
      false
    );
    assert.equal(
      fields.sliderPauseOnHover?.when?.({ slider: true, sliderAutoplay: true }),
      true
    );
  });

  it('hides columns control when slider is on for Testimonials and Team', () => {
    const testiColumns = TestimonialsBlock.fields?.columns;
    assert.ok(testiColumns);
    assert.equal(testiColumns.when?.({ slider: true }), false);
    assert.equal(testiColumns.when?.({ slider: false }), true);
    assert.equal(testiColumns.when?.({}), true);

    const teamColumns = TeamBlock.fields?.columns;
    assert.ok(teamColumns);
    assert.equal(teamColumns.when?.({ slider: true }), false);
    assert.equal(teamColumns.when?.({ slider: false }), true);
    assert.equal(teamColumns.when?.({}), true);
  });
});

describe('ItemSlider and marketing blocks slider rendering', () => {
  it('renders standard markup when slider is off', () => {
    // 1. Testimonials off
    const testiHtml = renderToStaticMarkup(
      createElement(Testimonials, {
        slider: false,
        items: [
          { quote: 'Quote 1', author: 'Author 1' },
          { quote: 'Quote 2', author: 'Author 2' },
        ],
      })
    );
    assert.ok(!testiHtml.includes('aria-roledescription="carousel"'));
    assert.ok(testiHtml.includes('grid'));
    assert.ok(testiHtml.includes('Quote 1'));
    assert.ok(testiHtml.includes('Quote 2'));

    // 2. Team off
    const teamHtml = renderToStaticMarkup(
      createElement(Team, {
        slider: false,
        items: [{ name: 'Person 1' }, { name: 'Person 2' }],
      })
    );
    assert.ok(!teamHtml.includes('aria-roledescription="carousel"'));
    assert.ok(teamHtml.includes('grid'));
    assert.ok(teamHtml.includes('Person 1'));
    assert.ok(teamHtml.includes('Person 2'));

    // 3. LogoCloud off
    const logoHtml = renderToStaticMarkup(
      createElement(LogoCloud, {
        slider: false,
        items: [{ url: 'https://example.com/logo1.png' }, { url: 'https://example.com/logo2.png' }],
      })
    );
    assert.ok(!logoHtml.includes('aria-roledescription="carousel"'));
    assert.ok(logoHtml.includes('flex flex-wrap'));
  });

  it('renders ItemSlider with the expected slide count, track, and accessibility attributes when slider is on', () => {
    // 1. Testimonials slider on
    const testiSliderHtml = renderToStaticMarkup(
      createElement(Testimonials, {
        slider: true,
        sliderPerView: 2,
        items: [
          { quote: 'Slide 1', author: 'Author 1' },
          { quote: 'Slide 2', author: 'Author 2' },
          { quote: 'Slide 3', author: 'Author 3' },
          { quote: 'Slide 4', author: 'Author 4' },
        ],
      })
    );
    assert.ok(testiSliderHtml.includes('aria-roledescription="carousel"'));
    assert.ok(testiSliderHtml.includes('role="group" aria-label="Slides"'));
    assert.ok(testiSliderHtml.includes('Slide 1'));
    assert.ok(testiSliderHtml.includes('Slide 2'));
    assert.ok(testiSliderHtml.includes('Slide 3'));
    assert.ok(testiSliderHtml.includes('Slide 4'));
    assert.ok(testiSliderHtml.includes('aria-label="Previous slide"'));
    assert.ok(testiSliderHtml.includes('aria-label="Next slide"'));
    assert.ok(testiSliderHtml.includes('role="tablist" aria-label="Slide indicators"'));

    // 2. Team slider on
    const teamSliderHtml = renderToStaticMarkup(
      createElement(Team, {
        slider: true,
        items: [
          { name: 'Member 1' },
          { name: 'Member 2' },
          { name: 'Member 3' },
          { name: 'Member 4' },
          { name: 'Member 5' },
        ],
      })
    );
    assert.ok(teamSliderHtml.includes('aria-roledescription="carousel"'));
    assert.ok(teamSliderHtml.includes('Member 1'));
    assert.ok(teamSliderHtml.includes('Member 5'));

    // 3. LogoCloud slider on
    const logoSliderHtml = renderToStaticMarkup(
      createElement(LogoCloud, {
        slider: true,
        items: [
          { url: 'https://example.com/logo1.png' },
          { url: 'https://example.com/logo2.png' },
          { url: 'https://example.com/logo3.png' },
        ],
      })
    );
    assert.ok(logoSliderHtml.includes('aria-roledescription="carousel"'));
    assert.ok(logoSliderHtml.includes('https://example.com/logo1.png'));
    assert.ok(logoSliderHtml.includes('https://example.com/logo3.png'));
  });

  it('renders element styles for arrows and dots in ItemSlider', () => {
    const sliderHtml = renderToStaticMarkup(
      createElement(
        ItemSlider,
        {
          sliderPerView: 1,
          sliderArrows: true,
          sliderDots: true,
          elements: {
            arrow: {
              color: '#ff0000',
            },
            dot: {
              color: '#00ff00',
            },
          },
        },
        createElement('div', null, 'Slide 1'),
        createElement('div', null, 'Slide 2')
      )
    );

    assert.ok(sliderHtml.includes('aria-roledescription="carousel"'));
    assert.ok(sliderHtml.includes('color:#ff0000'));
    assert.ok(sliderHtml.includes('Slide 1'));
    assert.ok(sliderHtml.includes('Slide 2'));
  });
});

describe('ItemSlider paging', () => {
  // 7 slides, 3 per view, 300px slides with a 24px gap.
  const track = { clientWidth: 948, scrollWidth: 2244, gap: 24 };

  it('includes the gap in the page step, so later pages land on a slide start', () => {
    assert.equal(pageToScroll(1, track), 972);
  });

  it('stops the last short page at the end of the track', () => {
    assert.equal(pageToScroll(2, track), 1296);
  });

  it('reports the last page at the end of the track, even when it is short', () => {
    assert.equal(scrollToPage(1296, 3, track), 2);
    assert.equal(scrollToPage(972, 3, track), 1);
    assert.equal(scrollToPage(0, 3, track), 0);
  });

  it('does not set an inline slides-per-view, which would beat the responsive classes', () => {
    const html = renderToStaticMarkup(
      createElement(ItemSlider, {
        sliderPerView: 5,
        sliderPerViewTablet: 3,
        sliderPerViewMobile: 2,
        children: [createElement('div', { key: 'a' }, 'A')],
      })
    );
    assert.doesNotMatch(html, /style="[^"]*--slides-per-view/);
    assert.match(html, /\[--slides-per-view:2\]/);
    assert.match(html, /sm:\[--slides-per-view:3\]/);
    assert.match(html, /s-desk-spv-5/);
  });
});

describe('sliderFields defaults', () => {
  it('shows the values the slider really uses when nothing is saved', () => {
    const f = sliderFields({ desktop: 5, tablet: 3, mobile: 2 }) as Record<
      string,
      { defaultValue?: unknown }
    >;
    assert.equal(f.sliderPerView.defaultValue, 5);
    assert.equal(f.sliderPerViewTablet.defaultValue, 3);
    assert.equal(f.sliderPerViewMobile.defaultValue, 2);
    assert.equal(f.sliderArrows.defaultValue, true);
    assert.equal(f.sliderDots.defaultValue, true);
    assert.equal(f.sliderPauseOnHover.defaultValue, true);
    assert.equal(f.sliderGap.defaultValue, 'md');
    assert.equal(f.sliderInterval.defaultValue, 5);
    assert.equal(f.sliderEffect.defaultValue, 'slide');
    assert.equal(f.sliderSpeed.defaultValue, 'normal');
  });

  it('hides speed when effect is slide or unset, and shows for fade and zoom', () => {
    const fields = sliderFields();
    assert.equal(
      fields.sliderSpeed?.when?.({ slider: true, sliderEffect: 'slide' }),
      false
    );
    assert.equal(
      fields.sliderSpeed?.when?.({ slider: true, sliderEffect: undefined }),
      false
    );
    assert.equal(
      fields.sliderSpeed?.when?.({ slider: true, sliderEffect: 'fade' }),
      true
    );
    assert.equal(
      fields.sliderSpeed?.when?.({ slider: true, sliderEffect: 'zoom' }),
      true
    );

    const sliderBlockSpeed = SliderBlock.fields?.speed;
    assert.equal(sliderBlockSpeed?.when?.({ effect: 'slide' }), false);
    assert.equal(sliderBlockSpeed?.when?.({ effect: 'fade' }), true);
    assert.equal(sliderBlockSpeed?.when?.({ effect: 'zoom' }), true);
  });
});

describe('Slider Fade and Zoom effects', () => {
  it('groups items into pages per view with chunkItemsIntoPages', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const pagesAt3 = chunkItemsIntoPages(items, 3);
    assert.equal(pagesAt3.length, 3);
    assert.deepEqual(pagesAt3[0], [1, 2, 3]);
    assert.deepEqual(pagesAt3[1], [4, 5, 6]);
    assert.deepEqual(pagesAt3[2], [7]);

    const pagesAt2 = chunkItemsIntoPages(items, 2);
    assert.equal(pagesAt2.length, 4);
    assert.deepEqual(pagesAt2[0], [1, 2]);
    assert.deepEqual(pagesAt2[1], [3, 4]);
    assert.deepEqual(pagesAt2[2], [5, 6]);
    assert.deepEqual(pagesAt2[3], [7]);

    const pagesAt1 = chunkItemsIntoPages(items, 1);
    assert.equal(pagesAt1.length, 7);
  });

  it('renders stacked pages for fade and zoom, and unchanged scroll-snap markup when effect is unset', () => {
    const slides = [
      createElement('div', { key: '1' }, 'Card 1'),
      createElement('div', { key: '2' }, 'Card 2'),
      createElement('div', { key: '3' }, 'Card 3'),
      createElement('div', { key: '4' }, 'Card 4'),
    ];

    // 1. Unset effect renders standard scroll snap track
    const standardHtml = renderToStaticMarkup(
      createElement(ItemSlider, {
        sliderPerView: 2,
        children: slides,
      })
    );
    assert.ok(standardHtml.includes('snap-x snap-mandatory overflow-x-auto'));
    assert.ok(!standardHtml.includes('slider-effect-fade'));
    assert.ok(!standardHtml.includes('slider-effect-zoom'));

    // 2. Fade renders stacked pages
    const fadeHtml = renderToStaticMarkup(
      createElement(ItemSlider, {
        sliderEffect: 'fade',
        sliderSpeed: 'fast',
        sliderPerView: 2,
        children: slides,
      })
    );
    assert.ok(fadeHtml.includes('slider-effect-fade'));
    assert.ok(fadeHtml.includes('[grid-area:stack]'));
    assert.ok(fadeHtml.includes('opacity-100'));

    // 3. Zoom renders stacked pages with zoom classes
    const zoomHtml = renderToStaticMarkup(
      createElement(ItemSlider, {
        sliderEffect: 'zoom',
        sliderSpeed: 'slow',
        sliderPerView: 2,
        children: slides,
      })
    );
    assert.ok(zoomHtml.includes('slider-effect-zoom'));
    assert.ok(zoomHtml.includes('scale-100'));
  });
});
