import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterAndValidateFormPayload,
  findFormNode,
  sniffFile,
} from '../forms.service';
import {
  assertSafeUrl,
  isPrivateOrReservedIp,
} from '@/server/lib/safe-fetch';
import {
  getMailchimpDc,
  mailchimpMemberHash,
  upsertMailchimpMember,
} from '@/server/integrations/mailchimp';

describe('server forms service & integrations', () => {
  describe('findFormNode', () => {
    it('finds node in BuilderDocument format by nodeId', () => {
      const doc = {
        version: 1,
        root: { props: {} },
        rootSlot: ['cf-1', 'other-1'],
        nodes: {
          'cf-1': {
            id: 'cf-1',
            type: 'ContactForm',
            props: {
              title: 'Contact Us',
              fields: [{ name: 'email', type: 'email' }],
              actions: ['email'],
            },
            slots: {},
          },
          'other-1': {
            id: 'other-1',
            type: 'Heading',
            props: { text: 'Hello' },
            slots: {},
          },
        },
      };

      const found = findFormNode(doc, 'cf-1');
      assert.ok(found);
      assert.equal(found.title, 'Contact Us');
      assert.deepEqual(found.actions, ['email']);
    });

    it('finds node in tree / Puck data format by id', () => {
      const puckData = {
        content: [
          {
            type: 'Hero',
            props: { title: 'Welcome' },
          },
          {
            type: 'ContactForm',
            props: {
              id: 'form-inline-1',
              title: 'Inline Form',
              fields: [{ name: 'feedback', type: 'textarea' }],
            },
          },
        ],
      };

      const found = findFormNode(puckData, 'form-inline-1');
      assert.ok(found);
      assert.equal(found.title, 'Inline Form');
    });

    it('falls back to first ContactForm when nodeId is omitted', () => {
      const doc = {
        nodes: {
          'f-1': {
            id: 'f-1',
            type: 'ContactForm',
            props: { title: 'First Form' },
          },
        },
      };

      const found = findFormNode(doc);
      assert.ok(found);
      assert.equal(found.title, 'First Form');
    });

    it('returns null if no ContactForm is found', () => {
      const doc = {
        nodes: {
          h1: { type: 'Heading', props: {} },
        },
      };
      assert.equal(findFormNode(doc, 'nonexistent'), null);
    });
  });

  describe('sniffFile (type checks and magic bytes)', () => {
    it('accepts valid JPEG magic bytes', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const res = sniffFile('photo.jpg', jpegBuffer, 'images');
      assert.equal(res.valid, true);
      assert.equal(res.mime, 'image/jpeg');
    });

    it('accepts valid PNG magic bytes', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);
      const res = sniffFile('image.png', pngBuffer, 'images');
      assert.equal(res.valid, true);
      assert.equal(res.mime, 'image/png');
    });

    it('accepts valid PDF magic bytes', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n...');
      const res = sniffFile('document.pdf', pdfBuffer, 'documents');
      assert.equal(res.valid, true);
      assert.equal(res.mime, 'application/pdf');
    });

    it('rejects spoofed extension with invalid magic bytes', () => {
      // Renamed text or executable to .pdf
      const fakePdf = Buffer.from('This is not a real PDF file');
      const res = sniffFile('fake.pdf', fakePdf, 'documents');
      assert.equal(res.valid, false);
      assert.match(res.error || '', /do not match PDF format/);
    });

    it('rejects extension mismatch for images preset', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n...');
      const res = sniffFile('document.pdf', pdfBuffer, 'images');
      assert.equal(res.valid, false);
      assert.match(res.error || '', /Invalid image file extension/);
    });

    it('rejects binary file with null bytes when renamed to txt/csv', () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const res = sniffFile('data.csv', binaryData, 'documents');
      assert.equal(res.valid, false);
      assert.match(res.error || '', /Binary data found/);
    });
  });

  describe('SSRF guard', () => {
    it('identifies private, loopback, and link-local IPs', () => {
      // 10.x
      assert.equal(isPrivateOrReservedIp('10.0.0.1'), true);
      assert.equal(isPrivateOrReservedIp('10.255.255.255'), true);

      // 127.x
      assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
      assert.equal(isPrivateOrReservedIp('127.1.2.3'), true);

      // 169.254.x (Link-local)
      assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);

      // 172.16-31.x
      assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
      assert.equal(isPrivateOrReservedIp('172.31.255.255'), true);

      // 192.168.x
      assert.equal(isPrivateOrReservedIp('192.168.1.1'), true);

      // IPv6 loopback and link-local
      assert.equal(isPrivateOrReservedIp('::1'), true);
      assert.equal(isPrivateOrReservedIp('fe80::1'), true);
      assert.equal(isPrivateOrReservedIp('fc00::1'), true);

      // Public IP
      assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
      assert.equal(isPrivateOrReservedIp('1.1.1.1'), false);
      assert.equal(isPrivateOrReservedIp('93.184.216.34'), false);
    });

    it('rejects private IP URLs in assertSafeUrl', async () => {
      await assert.rejects(
        () => assertSafeUrl('https://10.0.0.1/webhook'),
        /prohibited IP address/
      );
      await assert.rejects(
        () =>
          assertSafeUrl('https://127.0.0.1/webhook', {
            nodeEnv: 'production',
          }),
        /prohibited IP address/
      );
      await assert.rejects(
        () => assertSafeUrl('https://169.254.169.254/latest/meta-data'),
        /prohibited IP address/
      );
      await assert.rejects(
        () =>
          assertSafeUrl('https://[::1]/webhook', {
            nodeEnv: 'production',
          }),
        /prohibited IP address/
      );
    });

    it('rejects domain names that resolve to private IPs', async () => {
      const mockLookup = async () => [
        { address: '192.168.1.50', family: 4 },
      ];
      await assert.rejects(
        () =>
          assertSafeUrl('https://internal.mycorp.local/webhook', {
            lookup: mockLookup,
          }),
        /prohibited IP address 192\.168\.1\.50/
      );
    });

    it('allows public HTTPS URLs', async () => {
      const mockLookup = async () => [
        { address: '93.184.216.34', family: 4 },
      ];
      const url = await assertSafeUrl('https://example.com/webhook', {
        lookup: mockLookup,
      });
      assert.equal(url.hostname, 'example.com');
    });

    it('allows http://localhost only when NODE_ENV=development', async () => {
      // In development
      const devUrl = await assertSafeUrl('http://localhost:3000/webhook', {
        nodeEnv: 'development',
      });
      assert.equal(devUrl.hostname, 'localhost');

      // In production
      await assert.rejects(
        () =>
          assertSafeUrl('http://localhost:3000/webhook', {
            nodeEnv: 'production',
          }),
        /Only HTTPS URLs are allowed/
      );
    });
  });

  describe('Mailchimp integration', () => {
    it('extracts datacenter from API key suffix', () => {
      assert.equal(getMailchimpDc('abcdef123456-us21'), 'us21');
      assert.equal(getMailchimpDc('xyz-US6'), 'us6');
      assert.throws(() => getMailchimpDc('invalidkey'), /missing datacenter/);
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
        return new Response(JSON.stringify({ id: 'member-1', status: 'subscribed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
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

      // 1. Member PUT request
      const putReq = requests[0];
      assert.equal(
        putReq.url,
        'https://us21.api.mailchimp.com/3.0/lists/list-abc/members/9650ef957e71f654013e1319f3c72268'
      );
      assert.equal(putReq.method, 'PUT');
      assert.equal(putReq.body.email_address, 'Test@Domain.com');
      assert.equal(putReq.body.status, 'subscribed');
      assert.equal(putReq.body.merge_fields.FNAME, 'Alice');
      assert.equal(putReq.body.merge_fields.LNAME, 'Smith');

      // 2. Tags POST request
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

  describe('server payload filtering & validation', () => {
    const fields = [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      {
        name: 'vatNumber',
        type: 'text',
        required: true,
        conditions: [{ field: 'isCompany', operator: 'equals' as const, value: 'yes' }],
      },
      { name: 'resume', type: 'file', required: true },
      { name: 'terms', type: 'acceptance', label: 'Terms' },
    ];

    it('hidden required field is not enforced and its posted value is dropped', () => {
      // isCompany is not yes, so vatNumber is hidden
      const rawValues = {
        name: 'John Doe',
        email: 'john@example.com',
        isCompany: 'no',
        vatNumber: 'SECRET_VAT_123',
        terms: 'yes',
      };

      const result = filterAndValidateFormPayload(fields, rawValues, {
        resume: 1,
      });

      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.payload.name, 'John Doe');
        assert.equal(result.payload.email, 'john@example.com');
        // vatNumber should be dropped because it is hidden!
        assert.equal(result.payload.vatNumber, undefined);
      }
    });

    it('drops unknown fields that are not in the form configuration', () => {
      const rawValues = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        terms: 'yes',
        injectedAdminRole: 'true',
        hackedField: 'DROP TABLE users',
      };

      const result = filterAndValidateFormPayload(fields, rawValues, {
        resume: 1,
      });

      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.payload.name, 'Jane Doe');
        assert.equal(result.payload.email, 'jane@example.com');
        assert.equal(result.payload.injectedAdminRole, undefined);
        assert.equal(result.payload.hackedField, undefined);
      }
    });

    it('enforces required field when visible', () => {
      // isCompany = yes -> vatNumber is visible and required, but empty
      const rawValues = {
        name: 'John Doe',
        email: 'john@example.com',
        isCompany: 'yes',
        vatNumber: '',
        terms: 'yes',
      };

      const result = filterAndValidateFormPayload(fields, rawValues, {
        resume: 1,
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.match(result.error, /vatNumber is required/);
      }
    });

    it('requires acceptance field to be accepted', () => {
      const rawValues = {
        name: 'John Doe',
        email: 'john@example.com',
        terms: '',
      };

      const result = filterAndValidateFormPayload(fields, rawValues, {
        resume: 1,
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.match(result.error, /Terms must be accepted/);
      }
    });

    it('requires file when required file count is 0', () => {
      const rawValues = {
        name: 'John Doe',
        email: 'john@example.com',
        terms: 'yes',
      };

      const result = filterAndValidateFormPayload(fields, rawValues, {
        resume: 0,
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.match(result.error, /resume is required/);
      }
    });
  });
});
