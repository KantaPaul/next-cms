import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsentProvider } from '@/components/site/consent-provider';
import { ConsentBanner } from '@/components/site/consent-banner';
import { Embed, Video } from '@/builder/blocks/content';
import { Map as MapBlock } from '@/builder/blocks/map';
import { EmbedPlayer } from '@/components/video/embed-player';
import { serializeConsentCookie } from '@/lib/consent';
import { DEFAULT_CONSENT_SETTINGS } from '@/lib/site-essentials-types';

describe('consent UI gates', () => {
  it('shows consent banner and blocks YouTube/Embed/Map/EmbedPlayer iframes when marketing is not consented', () => {
    const html = renderToStaticMarkup(
      <ConsentProvider settings={DEFAULT_CONSENT_SETTINGS} initialCookie={null}>
        <Video url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
        <Embed url="https://player.vimeo.com/video/76979871" />
        <MapBlock address="Berlin, Germany" />
        <EmbedPlayer
          embed={{
            provider: 'youtube',
            src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
          }}
          thumbnailUrl="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          title="Demo Video"
        />
        <ConsentBanner />
      </ConsentProvider>
    );

    assert.ok(html.includes('data-testid="consent-banner"'));
    assert.ok(!html.includes('<iframe'), 'must not render any iframe before consent');
    assert.ok(!html.includes('i.ytimg.com'), 'must not fetch provider thumbnail');
    assert.ok(html.includes('YouTube video'));
    assert.ok(html.includes('Vimeo video'));
    assert.ok(html.includes('OpenStreetMap'));
    assert.ok(html.includes('Always allow'));
  });

  it('renders embeds and hides banner once marketing consent is granted', () => {
    const cookie = serializeConsentCookie({
      v: 1,
      d: '2026-11-10T00:00:00.000Z',
      c: { necessary: true, functional: true, analytics: true, marketing: true },
    });

    const html = renderToStaticMarkup(
      <ConsentProvider settings={DEFAULT_CONSENT_SETTINGS} initialCookie={cookie}>
        <Video url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
        <MapBlock address="Berlin, Germany" />
        <ConsentBanner />
      </ConsentProvider>
    );

    assert.ok(!html.includes('data-testid="consent-banner"'));
    assert.ok(html.includes('<iframe'));
    assert.ok(html.includes('https://www.youtube.com/embed/dQw4w9WgXcQ'));
    assert.ok(html.includes('openstreetmap.org/export/embed.html'));
  });

  it('renders normally in editor canvas (editing=true) without placeholders', () => {
    const html = renderToStaticMarkup(
      <ConsentProvider settings={DEFAULT_CONSENT_SETTINGS} initialCookie={null}>
        <Video
          url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          editing={true}
        />
        <MapBlock address="Paris, France" editing={true} />
      </ConsentProvider>
    );

    assert.ok(html.includes('<iframe'));
    assert.ok(!html.includes('data-consent-placeholder'));
  });
});
