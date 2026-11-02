import type { GuideTopic } from './types';

const list = (items: string[]) => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const steps = (items: string[]) => `<ol>${items.map(item => `<li>${item}</li>`).join('')}</ol>`;
const tip = (text: string) => `<p><strong>Tip:</strong> ${text}</p>`;

/** One topic per dashboard screen, plus the public and sign-in routes. */
export const ROUTE_TOPICS: GuideTopic[] = [
  {
    slug: 'guide-dashboard-home',
    title: 'Dashboard home',
    group: 'dashboard',
    path: '/dashboard',
    summary: 'Your starting point: recent content, quick actions, and the site switcher.',
    sections: [
      {
        heading: 'What you see',
        html: list([
          'Recent pages and posts, with their status and who changed them last.',
          'Quick actions to create a page, post, or form.',
          'The <em>site switcher</em> in the sidebar, which picks the site every other screen works on.',
        ]),
      },
      {
        heading: 'Getting around',
        html: `<p>The sidebar groups screens into Content, Design, Data, and Settings. Screens you have no permission for are hidden, so an Author sees fewer items than an Admin.</p>${tip('Switch sites first if you manage more than one; lists only show the current site.')}`,
      },
    ],
  },
  {
    slug: 'guide-pages',
    title: 'Pages',
    group: 'dashboard',
    path: '/dashboard/pages',
    summary: 'Create, edit, publish, and schedule the pages of your site.',
    sections: [
      {
        heading: 'Create a page',
        html: steps([
          'Open <strong>Pages</strong> and choose <strong>New page</strong>.',
          'Enter a title. The slug is filled in for you and can be changed.',
          'Pick an editor: <em>Builder</em> for visual layouts, or <em>Rich text</em> for simple documents.',
          'Optionally start from a page template.',
          'Save. The page opens in the editor you picked.',
        ]),
      },
      {
        heading: 'Status, scheduling, and visibility',
        html: list([
          '<strong>Draft</strong> pages are only visible in the dashboard and in preview links.',
          '<strong>Published</strong> pages are live at their slug.',
          'Set a <strong>scheduled</strong> date and the scheduled publish job makes it live for you.',
          'Mark one page as <strong>Home</strong> and one as <strong>Blog index</strong> in the page settings.',
        ]),
      },
      {
        heading: 'SEO and taxonomy',
        html: `<p>Each page has an SEO tab with title, description, Open Graph image, and a no-index switch. Categories and tags help organise pages and drive template rules.</p>${tip('Use the preview link to share a draft with someone who has no dashboard account.')}`,
      },
    ],
  },
  {
    slug: 'guide-page-builder',
    title: 'Page builder',
    group: 'dashboard',
    path: '/dashboard/pages/[id]/builder',
    summary: 'Design pages visually by dragging blocks onto the canvas.',
    sections: [
      {
        heading: 'The editor layout',
        html: list([
          '<strong>Insert panel</strong> (left): every block, grouped by category. Drag one onto the canvas or click to append it.',
          '<strong>Canvas</strong> (centre): the live page. Click a block to select it; drag its handle to move it.',
          '<strong>Inspector</strong> (right): the selected block’s content, layout, and style settings.',
          '<strong>Layers</strong>: an outline of every block, useful for selecting nested items.',
        ]),
      },
      {
        heading: 'Saving and publishing',
        html: steps([
          'Changes autosave as a draft revision.',
          'Use the device switcher to check desktop, tablet, and mobile.',
          'Choose <strong>Publish</strong> to make the draft live. Earlier versions stay in the revision history.',
        ]),
      },
      {
        heading: 'Editing locks',
        html: `<p>Only one person can edit a page at a time. If someone else has it open you will see their name and can choose <strong>Take over</strong>.</p>${tip('Use the Layers panel to select blocks nested deep inside containers.')}`,
      },
    ],
  },
  {
    slug: 'guide-rich-text-editor',
    title: 'Rich text editor',
    group: 'dashboard',
    path: '/dashboard/pages/[id]/editor',
    summary: 'Write simple pages and posts as formatted documents.',
    sections: [
      {
        heading: 'Formatting',
        html: list([
          'Headings, bold, italic, links, lists, quotes, and code.',
          'Paste from other editors; formatting is cleaned up on paste.',
          'Insert images from the media library.',
        ]),
      },
      {
        heading: 'When to use it',
        html: '<p>Use rich text for legal pages, articles, and anything that is mostly words. Switch to the builder when you need columns, sections, or interactive blocks.</p>',
      },
    ],
  },
  {
    slug: 'guide-posts',
    title: 'Posts',
    group: 'dashboard',
    path: '/dashboard/posts',
    summary: 'Write blog posts with excerpts, featured images, categories, and tags.',
    sections: [
      {
        heading: 'Write a post',
        html: steps([
          'Open <strong>Posts</strong> and choose <strong>New post</strong>.',
          'Write the body, then add an excerpt and a featured image.',
          'Pick categories and tags; they build the category and tag archives.',
          'Publish now, or schedule a date.',
        ]),
      },
      {
        heading: 'Layouts',
        html: list([
          '<strong>Template</strong> layout: the post body is placed inside a post template (see Post templates).',
          '<strong>Custom</strong> layout: open the post builder and design this one post freely.',
        ]),
      },
      {
        heading: 'Where posts appear',
        html: '<p>Published posts live at <code>/blog/&lt;slug&gt;</code>, on the blog index page, and in category, tag, author, and date archives.</p>',
      },
    ],
  },
  {
    slug: 'guide-post-templates',
    title: 'Post templates',
    group: 'dashboard',
    path: '/dashboard/posts/templates',
    summary: 'Control how single posts are laid out.',
    sections: [
      {
        heading: 'How templates are chosen',
        html: steps([
          'A post with a <em>custom</em> layout uses its own design.',
          'Otherwise it uses the template assigned to it.',
          'Otherwise it uses the site’s default post template.',
        ]),
      },
      {
        heading: 'Editing a template',
        html: `<p>Templates are built with the Post blocks: Post title, Featured image, Post meta, Post content, and Related posts. Add any other block around them.</p>${tip('Only one template can be the default. Setting a new default clears the old one.')}`,
      },
    ],
  },
  {
    slug: 'guide-collections',
    title: 'Collections',
    group: 'dashboard',
    path: '/dashboard/collections',
    summary: 'Model structured content such as team members, products, or locations.',
    sections: [
      {
        heading: 'Create a collection',
        html: steps([
          'Open <strong>Collections</strong> and choose <strong>New collection</strong>.',
          'Add fields: text, rich text, number, date, boolean, media, select, or relation.',
          'Optionally choose a <strong>template page</strong>; each entry then gets its own public URL rendered with that page.',
        ]),
      },
      {
        heading: 'Entries',
        html: `<p>Open a collection and choose <strong>Entries</strong> to add items. Entries can be drafts or published, and are available through the Query loop block and the <code>/api/v1/collections</code> API.</p>${tip('Use the Collection item block inside the template page to show a field of the current entry.')}`,
      },
    ],
  },
  {
    slug: 'guide-media',
    title: 'Media library',
    group: 'dashboard',
    path: '/dashboard/media',
    summary: 'Upload and organise images, video, and documents.',
    sections: [
      {
        heading: 'Uploading',
        html: list([
          'Drag files onto the library or use <strong>Upload</strong>.',
          'Images, video, and PDF are accepted.',
          'Add alt text and a title to every image; screen readers and search engines use them.',
        ]),
      },
      {
        heading: 'Using media',
        html: '<p>Any image field in the builder opens the library picker. Files are served from <code>/api/media/…</code> and can be organised in folders.</p>',
      },
    ],
  },
  {
    slug: 'guide-menus',
    title: 'Menus',
    group: 'dashboard',
    path: '/dashboard/menus',
    summary: 'Build the navigation shown in your header and footer.',
    sections: [
      {
        heading: 'Build a menu',
        html: steps([
          'Open <strong>Menus</strong> and pick a location: header, footer, or sidebar.',
          'Add items with a label and a URL. Drag items to reorder or nest them.',
          'Optionally add a badge or open the link in a new tab.',
          'Save. The Nav menu and Footer links blocks read the menu for their location.',
        ]),
      },
      {
        heading: 'Languages',
        html: '<p>Each language can have its own menu for the same location.</p>',
      },
    ],
  },
  {
    slug: 'guide-header-footer',
    title: 'Header, footer, search, and archive templates',
    group: 'dashboard',
    path: '/dashboard/header-footer',
    summary: 'Design the parts of the site that wrap every page.',
    sections: [
      {
        heading: 'Template types',
        html: list([
          '<strong>Header</strong> and <strong>Footer</strong>: shown on every page. They have a draft and a published version.',
          '<strong>Search</strong>: the layout of <code>/search</code>.',
          '<strong>Archive</strong>: the layout of blog category, tag, author, and date listings.',
        ]),
      },
      {
        heading: 'Create and assign',
        html: steps([
          'Choose <strong>New template</strong>, pick a type, and start from a starter or blank.',
          'Design it in the builder with header or footer blocks.',
          'Choose <strong>Set as site default</strong>.',
        ]),
      },
      {
        heading: 'Which header is used',
        html: `<p>The first match wins: a page that hides the header, then the page’s own choice, then display rules (post type, category, tag), then the language override, then the site default.</p>${tip('Add a display rule to give the User Guide category its own header.')}`,
      },
    ],
  },
  {
    slug: 'guide-templates',
    title: 'Page templates and global blocks',
    group: 'dashboard',
    path: '/dashboard/templates',
    summary: 'Reuse layouts and keep shared sections in sync.',
    sections: [
      {
        heading: 'Page templates',
        html: '<p>A page template is a starting layout offered when you create a page. Changing a template does not change pages already created from it.</p>',
      },
      {
        heading: 'Global blocks',
        html: `<p>A global block is a section you edit once and place on many pages with the Global block element. Editing it updates every page that uses it.</p>${tip('Good candidates: call-to-action banners, trust bars, and legal notices.')}`,
      },
    ],
  },
  {
    slug: 'guide-contact-forms',
    title: 'Contact forms and inbox',
    group: 'dashboard',
    path: '/dashboard/contact-forms',
    summary: 'Build forms and read what visitors send.',
    sections: [
      {
        heading: 'Build a form',
        html: steps([
          'Open <strong>Contact forms</strong> and choose <strong>New form</strong>.',
          'Add fields and mark the required ones.',
          'Place the form on a page with the Global block element.',
        ]),
      },
      {
        heading: 'Inbox',
        html: `<p>Submissions arrive in <strong>Contact forms → Inbox</strong>. Mark them read, archive them, flag spam, or export all of them to CSV.</p>${tip('A hidden trap field and the Turnstile check (when configured) flag most spam automatically.')}`,
      },
    ],
  },
  {
    slug: 'guide-taxonomy',
    title: 'Categories and tags',
    group: 'dashboard',
    path: '/dashboard/taxonomy',
    summary: 'Group content so visitors and templates can find it.',
    sections: [
      {
        heading: 'Categories vs tags',
        html: list([
          '<strong>Categories</strong> are hierarchical. Use them for the main sections of your blog.',
          '<strong>Tags</strong> are flat and can have a colour. Use them for topics that cut across categories.',
        ]),
      },
      {
        heading: 'Public archives',
        html: '<p>Each category and tag gets an archive at <code>/blog/category/&lt;slug&gt;</code> or <code>/blog/tag/&lt;slug&gt;</code>, rendered with the Archive template.</p>',
      },
    ],
  },
  {
    slug: 'guide-users',
    title: 'Users and roles',
    group: 'dashboard',
    path: '/dashboard/users',
    summary: 'Invite people and control what they can do.',
    sections: [
      {
        heading: 'Roles',
        html: list([
          '<strong>Admin</strong>: everything, including settings and users.',
          '<strong>Editor</strong>: all content, templates, and media.',
          '<strong>Author</strong>: their own posts and pages.',
          '<strong>Viewer</strong>: read-only access to the dashboard.',
        ]),
      },
      {
        heading: 'Managing people',
        html: `<p>Invite a user by email, give them a role, and choose which sites they belong to. Inactive or locked users cannot sign in. When admin approval is on, new sign-ups wait here until approved.</p>${tip('Edit a role to fine-tune its permissions screen by screen.')}`,
      },
    ],
  },
  {
    slug: 'guide-sites',
    title: 'Sites',
    group: 'dashboard',
    path: '/dashboard/sites',
    summary: 'Run several sites from one dashboard.',
    sections: [
      {
        heading: 'Adding a site',
        html: steps([
          'Open <strong>Sites</strong> and choose <strong>New site</strong>.',
          'Give it a name, a slug, and optionally a domain.',
          'Choose its languages and default language.',
          'Add members. Content, menus, and settings are separate for each site.',
        ]),
      },
      {
        heading: 'How visitors reach a site',
        html: '<p>A site is matched by its domain first, or by its slug as the first path segment when path routing is on.</p>',
      },
    ],
  },
  {
    slug: 'guide-settings',
    title: 'Site settings',
    group: 'dashboard',
    path: '/dashboard/settings',
    summary: 'Name, branding, SEO defaults, sign-in, and more.',
    sections: [
      {
        heading: 'General',
        html: list([
          'Site name, description, URL, logo, and favicon.',
          'Default SEO title, description, and Open Graph image.',
          'Header and footer menus, and the default site templates.',
          'robots.txt and the Google Analytics id.',
        ]),
      },
      {
        heading: 'Sign-in settings',
        html: '<p>Turn password, magic-link, and Google sign-in on or off, require admin approval, and set the session lifetime and lockout rules. These apply to the whole install.</p>',
      },
    ],
  },
  {
    slug: 'guide-theme',
    title: 'Theme',
    group: 'dashboard',
    path: '/dashboard/theme',
    summary: 'Colours, fonts, spacing, and radius for the whole site.',
    sections: [
      {
        heading: 'Design tokens',
        html: `<p>The theme is a set of tokens: brand colours, text and surface colours for light and dark mode, font families, sizes, radius, and spacing. Every block uses these tokens, so one change restyles the site.</p>${tip('Check both light and dark previews before saving.')}`,
      },
    ],
  },
  {
    slug: 'guide-licenses',
    title: 'Licenses',
    group: 'dashboard',
    path: '/dashboard/licenses',
    summary: 'Issue and manage license keys for products you sell.',
    sections: [
      {
        heading: 'License keys',
        html: list([
          'Issue a key with a product, plan, seat limit, and expiry date.',
          'See every installation that activated the key, and revoke one if needed.',
          'Client apps call <code>/api/licenses/activate</code>, <code>validate</code>, and <code>heartbeat</code>.',
        ]),
      },
      {
        heading: 'This install’s license',
        html: '<p><strong>Settings → License</strong> shows the license of this CMS install itself.</p>',
      },
    ],
  },
  {
    slug: 'guide-videos',
    title: 'Videos',
    group: 'dashboard',
    path: '/dashboard/videos',
    summary: 'Organise videos into playlists and show them on your site.',
    sections: [
      {
        heading: 'Adding videos',
        html: steps([
          'Create a playlist.',
          'Add videos by pasting a YouTube, Vimeo, or file URL; the title and thumbnail are fetched for you.',
          'Publish them, then show them with the Video library block.',
        ]),
      },
      {
        heading: 'Progress',
        html: '<p>Signed-in viewers resume where they stopped; progress is stored per user.</p>',
      },
    ],
  },
  {
    slug: 'guide-redirects',
    title: 'Redirects',
    group: 'dashboard',
    path: '/dashboard/redirects',
    summary: 'Send old URLs to new ones.',
    sections: [
      {
        heading: 'Adding a redirect',
        html: `<p>Enter the old path and the new path, and choose <strong>301</strong> (permanent) or <strong>302</strong> (temporary).</p>${tip('Add a redirect whenever you change a published page’s slug, so links and search rankings keep working.')}`,
      },
    ],
  },
  {
    slug: 'guide-review',
    title: 'Review queue',
    group: 'dashboard',
    path: '/dashboard/review',
    summary: 'Approve content before it goes live.',
    sections: [
      {
        heading: 'How review works',
        html: steps([
          'An author submits a page or post for review.',
          'Editors see it in the review queue with a preview and the changes.',
          'Approve to publish, or send it back with a note.',
        ]),
      },
    ],
  },
  {
    slug: 'guide-analytics',
    title: 'Analytics',
    group: 'dashboard',
    path: '/dashboard/analytics',
    summary: 'Page views, top content, referrers, and A/B tests.',
    sections: [
      {
        heading: 'Boards',
        html: '<p>Analytics boards are dashboards you build from widgets: views over time, top pages, referrers, and experiment results. Open a board and choose <strong>Edit</strong> to arrange widgets.</p>',
      },
      {
        heading: 'Experiments',
        html: '<p>Create an A/B experiment on a page to show a variant to part of your visitors and compare results.</p>',
      },
    ],
  },
  {
    slug: 'guide-api-keys',
    title: 'API keys',
    group: 'dashboard',
    path: '/dashboard/api',
    summary: 'Read and write content from other apps.',
    sections: [
      {
        heading: 'Creating a key',
        html: `<p>Create a key, choose its scopes (for example <code>content:read</code>), and copy it. It is shown only once. Send it as a Bearer token to <code>/api/v1/…</code>. The full reference is at <code>/api/v1/openapi</code>.</p>${tip('Give each integration its own key so you can revoke one without breaking the others.')}`,
      },
      {
        heading: 'Webhooks',
        html: '<p>Webhook subscriptions call your URL when content is published or a collection entry changes. Each delivery and its response status are recorded.</p>',
      },
    ],
  },
  {
    slug: 'guide-account',
    title: 'Your account',
    group: 'dashboard',
    path: '/dashboard/account',
    summary: 'Your profile, password, and two-factor authentication.',
    sections: [
      {
        heading: 'Security',
        html: list([
          'Change your name, email, and password.',
          'Turn on two-factor authentication with an authenticator app.',
          'See and sign out of your active sessions.',
        ]),
      },
    ],
  },
  {
    slug: 'guide-public-site',
    title: 'Public site routes',
    group: 'site',
    path: '/',
    summary: 'Every URL a visitor can open, and what renders it.',
    sections: [
      {
        heading: 'Routes',
        html: list([
          '<code>/</code>: the page marked as Home.',
          '<code>/&lt;slug&gt;</code>: any published page.',
          '<code>/blog</code>: the page marked as Blog index.',
          '<code>/blog/&lt;slug&gt;</code>: a single post, laid out by its post template.',
          '<code>/blog/category/&lt;slug&gt;</code>, <code>/blog/tag/&lt;slug&gt;</code>, <code>/blog/author/&lt;id&gt;</code>, <code>/blog/archive/&lt;yyyy-mm&gt;</code>: archives, laid out by the Archive template.',
          '<code>/search?q=…</code>: search results, laid out by the Search template.',
          '<code>/&lt;lang&gt;/…</code>: the same routes in another language.',
          '<code>/user-guide/print</code>: this guide as one printable page.',
        ]),
      },
      {
        heading: 'Previews',
        html: '<p>Preview links show draft content to anyone with the link until it expires. An admin bar appears for signed-in editors with a shortcut back to the editor.</p>',
      },
    ],
  },
  {
    slug: 'guide-sign-in',
    title: 'Signing in',
    group: 'site',
    path: '/login',
    summary: 'Password, magic link, and Google sign-in.',
    sections: [
      {
        heading: 'Ways to sign in',
        html: list([
          '<strong>Email and password</strong>, with optional two-factor code.',
          '<strong>Email me a link</strong>: a one-time magic link.',
          '<strong>Login with Google</strong>, when it is turned on in settings.',
        ]),
      },
      {
        heading: 'Lockouts',
        html: '<p>Too many failed attempts lock the account for a while. An admin can unlock it from the Users screen.</p>',
      },
    ],
  },
];
