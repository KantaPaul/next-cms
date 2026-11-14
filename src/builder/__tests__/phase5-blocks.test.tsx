import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ApiTable,
  BeforeAfter,
  Callout,
  DocSearch,
  DocsPager,
  DocsSidebar,
  Kbd,
  PortfolioGrid,
  ProjectMeta,
  ReadingProgress,
  Steps,
} from '../blocks/phase5-blocks';
import { builtInComponents } from '../blocks/registry';
import { PHASE5_BLOCKS } from '../definitions/phase5';

describe('Phase 5 builder blocks', () => {
  it('registers all 11 blocks in definitions and component registry', () => {
    for (const def of PHASE5_BLOCKS) {
      assert.ok(
        builtInComponents[def.type as keyof typeof builtInComponents],
        `Missing component in registry: ${def.type}`
      );
    }
  });

  it('renders Callout, Steps, Kbd, ApiTable, DocsPager, and ProjectMeta to HTML', () => {
    const html = renderToStaticMarkup(
      <div>
        <Callout variant="tip" title="Pro tip" body="<p>Use logical CSS.</p>" />
        <Steps items={[{ title: 'Step 1', body: 'Do thing' }]} />
        <Kbd keys="⌘, K" />
        <ApiTable rows={[{ name: 'title', type: 'string', description: 'Heading' }]} />
        <DocsPager prev={{ title: 'Intro', href: '/docs/intro' }} next={{ title: 'Setup', href: '/docs/setup' }} />
        <ProjectMeta client="Acme" year="2026" role="Design" services="Brand" liveUrl="https://example.com" />
        <BeforeAfter beforeImage="/a.jpg" afterImage="/b.jpg" />
        <ReadingProgress />
        <DocsSidebar items={[{ id: '1', title: 'Intro', href: '/docs/intro' }]} currentHref="/docs/intro" />
        <DocSearch />
        <PortfolioGrid projects={[{ id: '1', title: 'Work', href: '/work/1', discipline: 'Brand' }]} />
      </div>
    );
    assert.ok(html.includes('Pro tip'));
    assert.ok(html.includes('Step 1'));
    assert.ok(html.includes('<kbd'));
    assert.ok(html.includes('Acme'));
    assert.ok(html.includes('Comparison slider'));
  });
});
