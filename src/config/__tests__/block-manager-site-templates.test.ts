import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BLOCK_EDITOR_KINDS,
  BLOCK_EDITOR_TYPES,
  blockSettingsKindFor,
  blockSetupKind,
  hiddenBlocksFor,
} from '@/config/block-manager';

describe('Block manager: site templates', () => {
  it('lists every site template type in its own section', () => {
    const siteTemplates = BLOCK_EDITOR_TYPES.filter(t => t.group === 'site-templates').map(t => t.kind);
    assert.deepEqual(siteTemplates, ['header', 'footer', 'mega-menu', 'search', 'archive', 'popup', 'drawer']);
    for (const kind of ['search', 'archive', 'popup', 'drawer']) {
      assert.ok((BLOCK_EDITOR_KINDS as readonly string[]).includes(kind), kind);
    }
  });

  it('gives Search and Archive templates their own settings in the global editor', () => {
    assert.equal(blockSettingsKindFor('global', 'Search'), 'search');
    assert.equal(blockSettingsKindFor('global', 'Archive'), 'archive');
    assert.equal(blockSettingsKindFor('global', 'Call to action'), 'global');
    assert.equal(blockSettingsKindFor('popup', 'Popup'), 'popup');
    assert.equal(blockSettingsKindFor('page'), 'page');
  });

  it('lists the global editor blocks for Search and Archive', () => {
    assert.equal(blockSetupKind('search'), 'global');
    assert.equal(blockSetupKind('archive'), 'global');
    assert.equal(blockSetupKind('popup'), 'popup');
  });

  it('keeps each site template list separate from Global blocks', () => {
    const settings = { hidden: { global: ['Map'], search: ['Video'] } };
    assert.deepEqual(hiddenBlocksFor(settings, blockSettingsKindFor('global', 'Search'), []), ['Video']);
    assert.deepEqual(hiddenBlocksFor(settings, blockSettingsKindFor('global', 'Archive'), []), []);
    assert.deepEqual(hiddenBlocksFor(settings, 'global', []), ['Map']);
  });
});
