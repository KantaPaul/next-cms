import { createHash } from 'node:crypto';

export type MailchimpMemberInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  doubleOptIn?: boolean;
};

export function getMailchimpDc(apiKey: string): string {
  const parts = apiKey.trim().split('-');
  if (parts.length < 2 || !parts[1]) {
    throw new Error(
      'Invalid Mailchimp API key: missing datacenter suffix (e.g. -us21)'
    );
  }
  const dc = parts[parts.length - 1].toLowerCase();
  // The datacenter becomes the API host, so only `us21`-style values pass.
  if (!/^[a-z]{2,4}\d{1,3}$/.test(dc)) {
    throw new Error('Invalid Mailchimp API key: unexpected datacenter suffix');
  }
  return dc;
}

export function mailchimpMemberHash(email: string): string {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}

export async function upsertMailchimpMember(
  apiKey: string,
  listId: string,
  input: MailchimpMemberInput,
  fetchFn: typeof fetch = fetch
) {
  const dc = getMailchimpDc(apiKey);
  const hash = mailchimpMemberHash(input.email);
  const status = input.doubleOptIn ? 'pending' : 'subscribed';

  const memberRes = await fetchFn(
    `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId)}/members/${hash}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: input.email.trim(),
        // New contacts only. Never set `status` here: it would re-subscribe
        // people who unsubscribed whenever they fill in any form.
        status_if_new: status,
        merge_fields: {
          FNAME: input.firstName || '',
          LNAME: input.lastName || '',
        },
      }),
    }
  );

  if (!memberRes.ok) {
    const errorText = await memberRes.text();
    throw new Error(
      `Mailchimp member upsert failed (${memberRes.status}): ${errorText}`
    );
  }

  if (input.tags && input.tags.length > 0) {
    const tagsRes = await fetchFn(
      `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId)}/members/${hash}/tags`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: input.tags.map(name => ({ name, status: 'active' })),
        }),
      }
    );

    if (!tagsRes.ok) {
      const errorText = await tagsRes.text();
      throw new Error(
        `Mailchimp tags update failed (${tagsRes.status}): ${errorText}`
      );
    }
  }

  return await memberRes.json();
}

export async function getMailchimpLists(
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<Array<{ id: string; name: string }>> {
  const dc = getMailchimpDc(apiKey);
  const res = await fetchFn(
    `https://${dc}.api.mailchimp.com/3.0/lists?count=100`,
    {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Mailchimp get lists failed (${res.status}): ${await res.text()}`
    );
  }

  const data = (await res.json()) as {
    lists?: Array<{ id: string; name: string }>;
  };
  return (data.lists ?? []).map(l => ({ id: l.id, name: l.name }));
}
