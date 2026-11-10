import { definePlugin } from '@nextcms/plugin-sdk';
import { z } from 'zod';
import { getMailchimpLists, upsertMailchimpMember } from './src/mailchimp';

export default definePlugin({
  id: 'mailchimp',
  name: 'Mailchimp',
  version: '1.0.0',
  description:
    'Subscribe contact form visitors to Mailchimp audiences and pick audiences in the form builder.',
  requires: '>=0.1.0',

  settings: {
    schema: z.object({
      apiKey: z.string().optional(),
    }),
    fields: {
      apiKey: {
        label: 'API Key',
        secret: true,
        placeholder: 'e.g. 1234567890abcdef-us21',
        description:
          'Create an API key in your Mailchimp account under Account > Extras > API keys. Include the datacenter suffix (e.g. -us21).',
      },
    },
  },

  permissions: [
    {
      key: 'mailchimp.manage',
      label: 'Manage Mailchimp integration and test connections',
      roles: { Admin: true, Editor: false, Author: false, Viewer: false },
    },
  ],

  routes: [
    {
      method: 'GET',
      path: '/lists',
      auth: 'pages.edit',
      handler: async (_req, ctx) => {
        const apiKey =
          typeof ctx.settings.apiKey === 'string'
            ? ctx.settings.apiKey.trim()
            : '';
        if (!apiKey) {
          return Response.json({ lists: [] });
        }
        try {
          const lists = await getMailchimpLists(apiKey, ctx.safeFetch);
          return Response.json({ lists });
        } catch (err: unknown) {
          return Response.json(
            {
              error:
                err instanceof Error ? err.message : 'Failed to fetch lists',
            },
            { status: 500 }
          );
        }
      },
    },
    {
      method: 'POST',
      path: '/test',
      auth: 'mailchimp.manage',
      handler: async (req, ctx) => {
        let key =
          typeof ctx.settings.apiKey === 'string'
            ? ctx.settings.apiKey.trim()
            : '';
        try {
          const body = (await req.request.json().catch(() => ({}))) as {
            apiKey?: string;
          };
          if (body.apiKey && !body.apiKey.startsWith('••••')) {
            key = body.apiKey.trim();
          }
        } catch {
          // ignore invalid json
        }
        if (!key) {
          return Response.json(
            { ok: false, error: 'No Mailchimp API key provided.' },
            { status: 400 }
          );
        }
        try {
          const lists = await getMailchimpLists(key, ctx.safeFetch);
          return Response.json({
            ok: true,
            message: `Connected successfully! Found ${lists.length} audience(s).`,
            count: lists.length,
            lists,
          });
        } catch (err: unknown) {
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 400 }
          );
        }
      },
    },
  ],

  formActions: [
    {
      id: 'mailchimp',
      label: 'Mailchimp',
      fields: {
        mailchimpListId: {
          label: 'Mailchimp audience',
          type: 'custom',
          fieldKey: 'mailchimp-audience',
        },
        mailchimpEmailField: {
          label: 'Subscriber email field name',
          type: 'text',
        },
        mailchimpFirstNameField: {
          label: 'First name field name (optional)',
          type: 'text',
        },
        mailchimpLastNameField: {
          label: 'Last name field name (optional)',
          type: 'text',
        },
        mailchimpTags: {
          label: 'Tags (comma separated)',
          type: 'text',
        },
        mailchimpDoubleOptIn: {
          label: 'Require double opt-in',
          type: 'radio',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
      },
      run: async ({ payload, config }, ctx) => {
        const apiKey =
          typeof ctx.settings.apiKey === 'string'
            ? ctx.settings.apiKey.trim()
            : '';
        const listId =
          typeof config.mailchimpListId === 'string'
            ? config.mailchimpListId.trim()
            : '';

        if (!apiKey) {
          return {
            status: 'skipped',
            message: 'No Mailchimp API key configured in Plugins > Mailchimp.',
          };
        }
        if (!listId) {
          return {
            status: 'error',
            error: 'No Mailchimp audience (list) selected.',
          };
        }

        const emailFieldName =
          (typeof config.mailchimpEmailField === 'string'
            ? config.mailchimpEmailField.trim()
            : '') || 'email';
        const email = payload[emailFieldName]?.trim();

        if (!email) {
          return {
            status: 'error',
            error: `Field "${emailFieldName}" was empty or not submitted.`,
          };
        }

        const firstName =
          typeof config.mailchimpFirstNameField === 'string' &&
          config.mailchimpFirstNameField
            ? payload[config.mailchimpFirstNameField]?.trim()
            : payload.firstName?.trim() || payload.name?.trim();
        const lastName =
          typeof config.mailchimpLastNameField === 'string' &&
          config.mailchimpLastNameField
            ? payload[config.mailchimpLastNameField]?.trim()
            : payload.lastName?.trim();
        const tags =
          typeof config.mailchimpTags === 'string' && config.mailchimpTags
            ? config.mailchimpTags
                .split(',')
                .map(t => t.trim())
                .filter(Boolean)
            : undefined;

        await upsertMailchimpMember(
          apiKey,
          listId,
          {
            email,
            firstName,
            lastName,
            tags,
            doubleOptIn: Boolean(config.mailchimpDoubleOptIn),
          },
          ctx.safeFetch
        );

        return {
          status: 'success',
          message: `Member ${email} upserted to audience ${listId}.`,
        };
      },
    },
  ],
});
