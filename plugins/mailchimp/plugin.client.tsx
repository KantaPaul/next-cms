import { defineClientPlugin } from '@nextcms/plugin-sdk/client';
import { MailchimpAudienceField } from './src/audience-field';
import { MailchimpConnectionPage } from './src/connection-test-page';

export default defineClientPlugin({
  id: 'mailchimp',
  fields: {
    'mailchimp-audience': MailchimpAudienceField,
  },
  adminPages: [
    {
      slug: 'connection',
      title: 'Connection test',
      navLabel: 'Mailchimp test',
      permission: 'mailchimp.manage',
      component: MailchimpConnectionPage,
    },
  ],
});
