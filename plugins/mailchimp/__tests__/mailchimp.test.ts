import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getMailchimpDc,
  mailchimpMemberHash,
  upsertMailchimpMember,
} from '../src/mailchimp';

describe('Mailchimp plugin integration', () => {
  it('extracts datacenter from API key suffix and rejects host-injection suffixes', () => {
    assert.equal(getMailchimpDc('abcdef123456-us21'), 'us21');
    assert.equal(getMailchimpDc('xyz-US6'), 'us6');
    assert.throws(() => getMailchimpDc('invalidkey'), /missing datacenter/);
    assert.throws(() => getMailchimpDc('abc-evil.com/x'), /datacenter/);
  });

  it('hashes email with md5 in lowercase and trimmed', () => {
    const hash1 = mailchimpMemberHash('User@Example.COM ');
    const hash2 = mailchimpMemberHash('user@example.com');
    assert.equal(hash1, hash2);
    assert.equal(hash1, 'b58996c504c5638798eb6b511e6f49af');
  });

  it('builds upsert member and tags requests with correct parameters', async () => {
    const requests: { url: string; method: string; body: any }[] = [];

    const mockFetch: typeof fetch = async (input, init) => {
      requests.push({
        url: input.toString(),
        method: init?.method || 'GET',
        body: init?.body ? JSON.parse(init.body as string) : null,
      });
      return new Response(
        JSON.stringify({ id: 'member-1', status: 'subscribed' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    await upsertMailchimpMember(
      'testkey-us21',
      'list-abc',
      {
        email: 'Test@Domain.com',
        firstName: 'Alice',
        lastName: 'Smith',
        tags: ['lead', 'vip'],
        doubleOptIn: false,
      },
      mockFetch
    );

    assert.equal(requests.length, 2);

    const putReq = requests[0];
    assert.equal(
      putReq.url,
      'https://us21.api.mailchimp.com/3.0/lists/list-abc/members/9650ef957e71f654013e1319f3c72268'
    );
    assert.equal(putReq.method, 'PUT');
    assert.equal(putReq.body.email_address, 'Test@Domain.com');
    assert.equal(putReq.body.status_if_new, 'subscribed');
    assert.equal(putReq.body.status, undefined);
    assert.equal(putReq.body.merge_fields.FNAME, 'Alice');
    assert.equal(putReq.body.merge_fields.LNAME, 'Smith');

    const tagsReq = requests[1];
    assert.equal(
      tagsReq.url,
      'https://us21.api.mailchimp.com/3.0/lists/list-abc/members/9650ef957e71f654013e1319f3c72268/tags'
    );
    assert.equal(tagsReq.method, 'POST');
    assert.deepEqual(tagsReq.body.tags, [
      { name: 'lead', status: 'active' },
      { name: 'vip', status: 'active' },
    ]);
  });
});
