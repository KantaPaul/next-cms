import type common from './src/i18n/messages/en/common.json';
import type nav from './src/i18n/messages/en/nav.json';
import type pages from './src/i18n/messages/en/pages.json';
import type posts from './src/i18n/messages/en/posts.json';
import type collections from './src/i18n/messages/en/collections.json';
import type media from './src/i18n/messages/en/media.json';
import type menus from './src/i18n/messages/en/menus.json';
import type forms from './src/i18n/messages/en/forms.json';
import type settings from './src/i18n/messages/en/settings.json';
import type users from './src/i18n/messages/en/users.json';
import type analytics from './src/i18n/messages/en/analytics.json';
import type builder from './src/i18n/messages/en/builder.json';
import type errors from './src/i18n/messages/en/errors.json';
import type validation from './src/i18n/messages/en/validation.json';
import type account from './src/i18n/messages/en/account.json';

type Messages = {
  common: typeof common;
  nav: typeof nav;
  pages: typeof pages;
  posts: typeof posts;
  collections: typeof collections;
  media: typeof media;
  menus: typeof menus;
  forms: typeof forms;
  settings: typeof settings;
  users: typeof users;
  analytics: typeof analytics;
  builder: typeof builder;
  errors: typeof errors;
  validation: typeof validation;
  account: typeof account;
};

declare global {
  interface IntlMessages extends Messages {}
}
