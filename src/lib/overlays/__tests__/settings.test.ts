import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeOverlaySettings, parsePathRules } from '../settings';
import { matchTargeting } from '../targeting';

describe('Overlay settings normalisation', () => {
  it('fills popup and drawer defaults from empty root props', () => {
    const popup = normalizeOverlaySettings({}, 'Popup');
    assert.equal(popup.layout.position, 'center');
    assert.equal(popup.trigger.type, 'delay');
    assert.deepEqual(popup.targeting.include, [{ kind: 'all', value: '' }]);

    const drawer = normalizeOverlaySettings(undefined, 'Drawer');
    assert.equal(drawer.layout.position, 'right');
    assert.equal(drawer.trigger.type, 'click');
  });

  it('coerces numbers typed as strings and clamps them', () => {
    const s = normalizeOverlaySettings(
      { trigger: { type: 'scroll', scrollPercent: '250', delaySec: '-4' } },
      'Popup'
    );
    assert.equal(s.trigger.scrollPercent, 100);
    assert.equal(s.trigger.delaySec, 0);
  });

  it('maps the Devices select to a device list', () => {
    const s = normalizeOverlaySettings(
      { targeting: { deviceSet: 'mobile' } },
      'Popup'
    );
    assert.deepEqual(s.targeting.devices, ['mobile']);
  });

  it('drops empty path rules and treats an empty include list as everywhere', () => {
    const s = normalizeOverlaySettings(
      { targeting: { include: [{ kind: 'prefix', value: '' }] } },
      'Popup'
    );
    assert.deepEqual(s.targeting.include, [{ kind: 'all', value: '' }]);
  });

  it('parses legacy string path lists', () => {
    assert.deepEqual(parsePathRules('/blog*, /about\n/docs/'), [
      { kind: 'prefix', value: '/blog' },
      { kind: 'exact', value: '/about' },
      { kind: 'prefix', value: '/docs/' },
    ]);
  });

  it('targets a /blog prefix end to end', () => {
    const s = normalizeOverlaySettings(
      { targeting: { include: [{ kind: 'prefix', value: '/blog' }] } },
      'Popup'
    );
    assert.equal(matchTargeting(s, { pathname: '/blog/hello' }), true);
    assert.equal(matchTargeting(s, { pathname: '/' }), false);
    assert.equal(matchTargeting(s, { pathname: '/blogger' }), false);
  });
});
