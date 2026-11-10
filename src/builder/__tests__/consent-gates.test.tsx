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

  it('supports dynamic fields on Video and Embed/Iframe blocks and renders arbitrary https iframe URLs and shorts/relative videos', () => {
    const { VideoBlock, EmbedBlock } = require('@/builder/definitions/native');

    assert.equal((VideoBlock.fields?.url as any)?.dynamic, true);
    assert.equal((VideoBlock.fields?.posterUrl as any)?.dynamic, true);
    assert.equal((EmbedBlock.fields?.url as any)?.dynamic, true);

    const html = renderToStaticMarkup(
      <ConsentProvider settings={DEFAULT_CONSENT_SETTINGS} initialCookie={null}>
        <Video url="https://www.youtube.com/shorts/dQw4w9WgXcQ" editing={true} />
        <Video url="/uploads/demo-reel.mp4" editing={true} />
        <Embed url="https://northwind.example.com/demo" editing={true} />
        <Embed
          url='<iframe src="https://iframe.example.com/widget" title="Widget"></iframe>'
          editing={true}
        />
        <Embed url="javascript:alert(1)" editing={true} />
        <Embed url="{custom.live_url}" editing={true} />
      </ConsentProvider>
    );

    assert.ok(html.includes('https://www.youtube.com/embed/dQw4w9WgXcQ'));
    assert.ok(html.includes('src="/uploads/demo-reel.mp4"'));
    assert.ok(html.includes('src="https://northwind.example.com/demo"'));
    assert.ok(html.includes('src="https://iframe.example.com/widget"'));
    assert.ok(!html.includes('javascript:alert(1)'));
    assert.ok(!html.includes('{custom.live_url}'));
    assert.ok(html.includes('snippet or URL in the sidebar'));

    // SettingsPanel (E12 inspector) must render the Dynamic trigger button for Video & Embed/Iframe fields
    const {
      SettingsPanel,
      EditorProvider,
      createEditorStore,
      DynamicSourcesProvider,
    } = require('@nextcms/builder-react');
    const { inspectorOf } = (() => {
      const { fieldsOf } = require('@nextcms/builder-core');
      return {
        inspectorOf: (def: any) => fieldsOf(def),
      };
    })();
    const store = createEditorStore({
      document: {
        version: 1,
        root: { id: 'root', type: 'root', props: {} },
        nodes: {},
        slots: {},
      } as any,
      schemas: {},
    });
    const videoPanelHtml = renderToStaticMarkup(
      <EditorProvider store={store}>
        <DynamicSourcesProvider
          value={{
            sources: {},
            defaultSource: 'custom',
            defaultPath: 'video_url',
          }}
        >
          <SettingsPanel
            panelKey="video-1"
            label="Video"
            fields={inspectorOf(VideoBlock)}
            props={{ url: '' }}
            onPatch={() => {}}
          />
          <SettingsPanel
            panelKey="embed-1"
            label="Embed / Iframe"
            fields={inspectorOf(EmbedBlock)}
            props={{ url: '' }}
            onPatch={() => {}}
          />
        </DynamicSourcesProvider>
      </EditorProvider>
    );
    assert.equal(videoPanelHtml.match(/data-dynamic-trigger=""/g)?.length, 2);
  });
});
