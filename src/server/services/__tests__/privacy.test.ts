import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrivacyConfirmationToken,
  hashPrivacyToken,
  verifyPrivacyConfirmationToken,
} from '@/lib/privacy-token';
import { submissionMatchesEmail } from '@/server/services/privacy.service';

describe('GDPR privacy tokens and email matching', () => {
  it('signs and verifies 24h confirmation tokens and rejects tampered or expired ones', () => {
    const now = 1_700_000_000_000;
    const token = createPrivacyConfirmationToken(
      {
        siteId: 'default',
        email: 'Visitor@Example.COM ',
        type: 'erase',
        visitorId: 'vid-123',
      },
      { nowMs: now, secret: 'test-secret' }
    );

    const valid = verifyPrivacyConfirmationToken(token, {
      nowMs: now + 60_000,
      secret: 'test-secret',
    });
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.payload.email, 'visitor@example.com');
      assert.equal(valid.payload.type, 'erase');
      assert.equal(valid.payload.visitorId, 'vid-123');
    }

    const tampered = `${token.slice(0, -3)}xxx`;
    assert.deepEqual(
      verifyPrivacyConfirmationToken(tampered, { nowMs: now, secret: 'test-secret' }),
      { ok: false, error: 'invalid' }
    );

    const expired = verifyPrivacyConfirmationToken(token, {
      nowMs: now + 24 * 60 * 60 * 1000 + 1,
      secret: 'test-secret',
    });
    assert.deepEqual(expired, { ok: false, error: 'expired' });

    assert.equal(hashPrivacyToken(token).length, 64);
  });

  it('matches email across arbitrary form submission payload keys case-insensitively', () => {
    assert.equal(
      submissionMatchesEmail(
        { full_name: 'Alice', contact_email: ' Alice@Example.org ' },
        'alice@example.org'
      ),
      true
    );
    assert.equal(
      submissionMatchesEmail(
        { name: 'Bob', email: 'bob@example.org' },
        'alice@example.org'
      ),
      false
    );
    assert.equal(submissionMatchesEmail(null, 'alice@example.org'), false);
  });
});
