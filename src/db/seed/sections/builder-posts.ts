/**
 * Blog content for the demo site: one article per builder topic, from the
 * first page to custom blocks. Bodies are plain HTML (the post body), so they
 * render with the post templates and show up in search.
 */

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Landscape images used as featured images on the blog. */
export const POST_IMAGES = {
  office: img('photo-1497366216548-37526070297c'),
  laptop: img('photo-1498050108023-c5249f4df085'),
  desk: img('photo-1499951360447-b19be8fe80f5'),
  meeting: img('photo-1552664730-d307ca884978'),
  team: img('photo-1522071820081-009f0129c71c'),
  analytics: img('photo-1460925895917-afdab827c52f'),
  charts: img('photo-1504868584819-f8e8b4b6d7e3'),
  code: img('photo-1555066931-4365d14bab8c'),
  laptopCode: img('photo-1517694712202-14dd9538aa97'),
  design: img('photo-1561070791-2526d30994b5'),
  wireframe: img('photo-1586717791821-3f44a563fa4c'),
  workspace: img('photo-1519389950473-47ba0277781c'),
};

export type BlogCategoryKey =
  | 'getting-started'
  | 'layout-design'
  | 'dynamic-content'
  | 'post-types'
  | 'templates'
  | 'publishing'
  | 'developers'
  | 'release-notes';

export type BlogTagKey =
  | 'featured'
  | 'tutorial'
  | 'tips'
  | 'beginner'
  | 'advanced'
  | 'release';

export const BLOG_CATEGORIES: {
  key: BlogCategoryKey;
  name: string;
  description: string;
}[] = [
  { key: 'getting-started', name: 'Getting started', description: 'Your first pages, the editor, and the basics.' },
  { key: 'layout-design', name: 'Layout & design', description: 'Containers, columns, responsive settings, theme tokens and motion.' },
  { key: 'dynamic-content', name: 'Dynamic content', description: 'Bindings, Loop Grids, Query Filters and search.' },
  { key: 'post-types', name: 'Post types', description: 'Collections with fields, taxonomies, single templates and collection blocks.' },
  { key: 'templates', name: 'Templates', description: 'Global blocks, headers and footers, post and page templates.' },
  { key: 'publishing', name: 'Publishing', description: 'Review, scheduling, revisions, translations, SEO and analytics.' },
  { key: 'developers', name: 'Developers', description: 'The content API, webhooks, custom blocks and multisite.' },
  { key: 'release-notes', name: 'Release notes', description: 'What changed in each release.' },
];

export const BLOG_TAGS: { key: BlogTagKey; name: string; color: string }[] = [
  { key: 'featured', name: 'Featured', color: '#ef4444' },
  { key: 'tutorial', name: 'Tutorial', color: '#3b82f6' },
  { key: 'tips', name: 'Tips', color: '#f59e0b' },
  { key: 'beginner', name: 'Beginner', color: '#10b981' },
  { key: 'advanced', name: 'Advanced', color: '#8b5cf6' },
  { key: 'release', name: 'Release', color: '#0ea5e9' },
];

export type BuilderPostDef = {
  title: string;
  slug: string;
  category: BlogCategoryKey;
  tags: BlogTagKey[];
  image: string;
  /** Who wrote it: picks a seeded user. */
  author: 'admin' | 'editor' | 'author';
  status?: 'published' | 'draft' | 'review' | 'scheduled';
  /** `featured` uses the featured post layout; `custom` gets its own canvas. */
  layout?: 'template' | 'featured' | 'custom';
  excerpt: string;
  body: string;
  /** Spanish translation, linked to this post by translation group. */
  es?: { title: string; slug: string; excerpt: string; body: string };
};

const steps = (items: string[]) =>
  `<ol>${items.map(item => `<li>${item}</li>`).join('')}</ol>`;
const list = (items: string[]) =>
  `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const tip = (text: string) => `<blockquote><p><strong>Tip:</strong> ${text}</p></blockquote>`;

export const BUILDER_POSTS: BuilderPostDef[] = [
  // ─── Getting started ──────────────────────────────────────────────
  {
    title: 'Your first page in five minutes',
    slug: 'your-first-page',
    category: 'getting-started',
    tags: ['featured', 'beginner', 'tutorial'],
    image: POST_IMAGES.laptop,
    author: 'admin',
    layout: 'featured',
    excerpt: 'Create a page, drop in a Hero, Features and a call to action, then publish it — without touching code.',
    body:
      '<p>Every page on this site was built with the visual builder. This walkthrough builds a small landing page from scratch so you can see the whole loop: create, edit, preview, publish.</p>' +
      '<h2>1. Create the page</h2>' +
      steps([
        'Open <strong>Dashboard → Pages</strong> and click <strong>New page</strong>.',
        'Give it a title such as <em>Spring launch</em>. The slug is filled in for you.',
        'Pick <strong>Blank</strong> or one of the starter templates, then click <strong>Open builder</strong>.',
      ]) +
      '<h2>2. Add blocks</h2>' +
      '<p>The Blocks panel lists everything you can insert, grouped by category. Click a block to add it at the end of the page, or drag it to the exact spot on the canvas. Start with a <strong>Hero</strong>, then add <strong>Features</strong> and a <strong>Call to action</strong>.</p>' +
      tip('Press <kbd>⌘K</kbd> to open the command palette and type a block name instead of scrolling the panel.') +
      '<h2>3. Edit content and style</h2>' +
      '<p>Select a block to see its settings. The <strong>Content</strong> tab holds text, images and links; <strong>Style</strong> holds colors, spacing and typography; <strong>Advanced</strong> holds visibility, anchors and animation. Text can also be edited directly on the canvas.</p>' +
      '<h2>4. Preview and publish</h2>' +
      '<p>Changes are saved as a draft while you work. Use <strong>Preview</strong> to open the real page in a new tab, switch between desktop, tablet and mobile widths, and click <strong>Publish</strong> when it looks right. Nothing changes on the live site until you publish.</p>',
    es: {
      title: 'Tu primera página en cinco minutos',
      slug: 'tu-primera-pagina',
      excerpt: 'Crea una página, añade un Hero, Características y una llamada a la acción, y publícala sin escribir código.',
      body:
        '<p>Todas las páginas de este sitio se crearon con el constructor visual. Esta guía construye una pequeña página de aterrizaje desde cero.</p>' +
        '<h2>1. Crea la página</h2>' +
        steps([
          'Abre <strong>Panel → Páginas</strong> y pulsa <strong>Nueva página</strong>.',
          'Escribe un título. El slug se rellena solo.',
          'Elige <strong>En blanco</strong> o una plantilla y pulsa <strong>Abrir constructor</strong>.',
        ]) +
        '<h2>2. Añade bloques</h2>' +
        '<p>El panel de bloques muestra todo lo que puedes insertar. Haz clic en un bloque o arrástralo al lienzo: empieza con un <strong>Hero</strong>, luego <strong>Características</strong> y una <strong>Llamada a la acción</strong>.</p>' +
        '<h2>3. Publica</h2>' +
        '<p>Los cambios se guardan como borrador. Usa <strong>Vista previa</strong> para revisar la página y pulsa <strong>Publicar</strong> cuando esté lista.</p>',
    },
  },
  {
    title: 'A tour of the editor: canvas, panels and shortcuts',
    slug: 'editor-tour',
    category: 'getting-started',
    tags: ['beginner'],
    image: POST_IMAGES.workspace,
    author: 'editor',
    excerpt: 'Where everything lives in the builder: the toolbar, the canvas, the Blocks, Layers and Settings panels, and the shortcuts worth learning.',
    body:
      '<p>The editor has three parts: the <strong>toolbar</strong> across the top, the <strong>canvas</strong> in the middle, and the <strong>panel</strong> on the side.</p>' +
      '<h2>The toolbar</h2>' +
      list([
        '<strong>Device switch</strong> — desktop, tablet and mobile widths, with zoom.',
        '<strong>Undo / redo</strong> — every change, including moves and style edits.',
        '<strong>Save draft</strong>, <strong>Preview</strong> and <strong>Publish</strong>.',
      ]) +
      '<h2>The panel</h2>' +
      '<p>The footer rail switches the panel between <strong>Blocks</strong> (insert), <strong>Layers</strong> (the page as a tree), <strong>Page settings</strong>, <strong>History</strong> and <strong>Animation</strong>. Selecting a block on the canvas opens its settings.</p>' +
      '<h2>Shortcuts worth learning</h2>' +
      list([
        '<kbd>⌘K</kbd> — command palette: insert blocks, jump to settings, run actions.',
        '<kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd> — undo and redo.',
        '<kbd>⌘D</kbd> — duplicate the selected block.',
        '<kbd>Delete</kbd> — remove the selected block.',
        '<kbd>Esc</kbd> — select the parent block.',
      ]) +
      tip('Focus mode hides the panels so you can review the page at full width.'),
  },
  {
    title: 'Panel or split: choosing an editor layout',
    slug: 'panel-or-split-layout',
    category: 'getting-started',
    tags: ['tips'],
    image: POST_IMAGES.desk,
    author: 'editor',
    excerpt: 'The single-panel layout keeps everything on one side; split puts blocks on the left and settings on the right. Here is when to use each.',
    body:
      '<p>The builder offers two layouts, switched from the toolbar. Your choice is remembered per browser.</p>' +
      '<h2>Panel</h2>' +
      '<p>One panel holds blocks, layers and settings. It leaves the most room for the canvas, which suits laptops and editors who mostly change text.</p>' +
      '<h2>Split</h2>' +
      '<p>Blocks and layers on the left, settings on the right. It suits wide screens and designers who move between inserting and styling all the time.</p>' +
      tip('You can dock the single panel on either side of the canvas.'),
  },

  // ─── Layout & design ──────────────────────────────────────────────
  {
    title: 'Containers, columns and spacing',
    slug: 'containers-columns-spacing',
    category: 'layout-design',
    tags: ['tutorial'],
    image: POST_IMAGES.wireframe,
    author: 'author',
    excerpt: 'How layout blocks nest, when to use Columns versus a Container, and how section spacing keeps pages consistent.',
    body:
      '<p>Most pages are a stack of sections. Layout blocks let you place content side by side inside a section.</p>' +
      '<h2>Columns</h2>' +
      '<p><strong>Columns</strong> splits a row into two to four slots with preset ratios such as 1-1, 2-1 or 1-2. Drop any block into a column. Columns stack on mobile by default.</p>' +
      '<h2>Container</h2>' +
      '<p><strong>Container</strong> is the flexible option: a flex or grid box with its own direction, gap, alignment, padding, background and border. Containers can nest, which is how complex layouts like cards with a footer row are built.</p>' +
      '<h2>Section spacing</h2>' +
      '<p>Every block has <strong>section</strong> settings: vertical padding, background, width and anchor. Use the preset spacing values instead of custom pixels so sections line up across pages.</p>' +
      tip('Open the Layers panel to drag blocks between containers precisely.'),
  },
  {
    title: 'Responsive design: desktop, tablet and mobile settings',
    slug: 'responsive-design',
    category: 'layout-design',
    tags: ['tutorial', 'advanced'],
    image: POST_IMAGES.design,
    author: 'author',
    excerpt: 'Settings with a device icon can differ per breakpoint. Learn how values inherit and how to hide blocks per device.',
    body:
      '<p>Settings marked with a device icon are responsive. Change the device in the toolbar, then edit the value: it applies to that width and smaller ones until another breakpoint overrides it.</p>' +
      '<h2>What is responsive</h2>' +
      list(['Columns and grid templates', 'Gap, padding and margins', 'Font size and alignment', 'Container direction (row on desktop, stack on mobile)']) +
      '<h2>Hiding blocks</h2>' +
      '<p>Under <strong>Advanced</strong>, <em>Hide on desktop</em>, <em>Hide on tablet</em> and <em>Hide on mobile</em> remove a block at that size. Use it for alternative images or shorter mobile copy.</p>' +
      tip('A dot next to a setting means it has a value for the current device; click the reset icon to inherit again.'),
  },
  {
    title: 'Theme tokens: colors, fonts and radius for the whole site',
    slug: 'theme-tokens',
    category: 'layout-design',
    tags: ['tips'],
    image: POST_IMAGES.design,
    author: 'admin',
    excerpt: 'Set your brand once in Settings → Theme and every block follows: primary colors, fonts, corner radius and dark mode.',
    body:
      '<p>Theme tokens are the site-wide design values every block reads. Change one and every page updates.</p>' +
      '<h2>What you can set</h2>' +
      list(['Primary, secondary and surface colors, with dark-mode values', 'Heading and body fonts (Google Fonts are loaded for you)', 'Corner radius and shadow strength', 'Maximum content width']) +
      '<h2>Tokens versus custom styles</h2>' +
      '<p>Block style settings can pick a token (<em>Primary</em>) or a custom value. Prefer tokens: a rebrand then becomes one change instead of a hunt through every page.</p>',
  },
  {
    title: 'Element styles and style classes',
    slug: 'element-styles-classes',
    category: 'layout-design',
    tags: ['advanced'],
    image: POST_IMAGES.code,
    author: 'author',
    excerpt: 'Style a single part of a block — a heading, a button, a card — and save the look as a class you can reuse.',
    body:
      '<p>Most blocks are made of parts: a Hero has a badge, title, subtitle, buttons and image. In the Style tab, pick a part to style it on its own.</p>' +
      '<h2>Style classes</h2>' +
      '<p>When a look should repeat, save it as a <strong>style class</strong>. Apply the class to another block part and edit it in one place later. Classes live in the Style classes panel.</p>' +
      tip('Copy and paste styles between blocks from the block menu.'),
  },
  {
    title: 'Motion: entrance animations and page transitions',
    slug: 'motion-animations',
    category: 'layout-design',
    tags: ['tips'],
    image: POST_IMAGES.workspace,
    author: 'editor',
    excerpt: 'Fade, slide or zoom blocks into view as visitors scroll, and add a transition between pages — with reduced-motion respected.',
    body:
      '<p>The Animation panel adds an entrance effect to the selected block: fade, slide, zoom or blur, with duration, delay and easing. Blocks animate once when they scroll into view.</p>' +
      '<h2>Page transitions</h2>' +
      '<p>In Page settings, <em>Page transition</em> animates the whole page on navigation. Keep it subtle: a short fade feels fast, a long slide feels slow.</p>' +
      '<p>Visitors who ask their system for reduced motion see no animation.</p>',
  },

  // ─── Dynamic content ──────────────────────────────────────────────
  {
    title: 'Dynamic bindings: show post, page and site data anywhere',
    slug: 'dynamic-bindings',
    category: 'dynamic-content',
    tags: ['tutorial'],
    image: POST_IMAGES.laptopCode,
    author: 'admin',
    excerpt: 'Bind a heading, image or link to live data — the current post title, a picked page, a site setting or a custom field.',
    body:
      '<p>Text, image and link settings show a <strong>dynamic</strong> button. Click it to bind the setting to data instead of typing a value.</p>' +
      '<h2>Sources</h2>' +
      list(['<strong>Post</strong> — the post or entry being rendered (title, excerpt, image, date, author)', '<strong>Specific page / post</strong> — a record you pick', '<strong>Site</strong> — name, description, logo', '<strong>Custom field</strong> — any field of the current collection entry', '<strong>Loop item</strong> — inside a Loop Item template']) +
      '<h2>Fallbacks and transforms</h2>' +
      '<p>Each binding can have a fallback for empty values and a transform such as uppercase or date format.</p>' +
      tip('Bindings resolve on the server, so search engines see the final text.'),
  },
  {
    title: 'Loop Grid and Loop Items',
    slug: 'loop-grid-loop-items',
    category: 'dynamic-content',
    tags: ['tutorial', 'advanced'],
    image: POST_IMAGES.wireframe,
    author: 'author',
    excerpt: 'Design one card as a Loop Item template, then let a Loop Grid repeat it for posts, pages or any post type.',
    body:
      '<p>A <strong>Loop Grid</strong> lists content — posts, pages, or entries of a post type — and renders each one with a <strong>Loop Item</strong> template you design.</p>' +
      '<h2>Design the card</h2>' +
      steps(['Open <strong>Templates → Loop items</strong> and create one.', 'Build the card with any blocks, binding them to <em>Loop item</em> fields.', 'Pick a real item under <em>Preview with</em> to see it with data.']) +
      '<h2>Place the grid</h2>' +
      '<p>Insert a Loop Grid on a page, choose the source, filters, order and columns, and pick your Loop Item. Pagination and “load more” are built in.</p>' +
      tip('On a term archive the Loop Grid locks to that term automatically.'),
  },
  {
    title: 'Query Filter and search results',
    slug: 'query-filter-search',
    category: 'dynamic-content',
    tags: ['advanced'],
    image: POST_IMAGES.analytics,
    author: 'author',
    excerpt: 'Let visitors filter a Loop Grid by category, tag or field, and build the search results page with the same blocks.',
    body:
      '<p>A <strong>Query Filter</strong> connects to a Loop Grid on the same page. It can show search, category, tag, taxonomy and sort controls; the grid updates through the URL, so filtered views can be shared.</p>' +
      '<h2>Search results</h2>' +
      '<p>The site search page is a template too. Its <strong>Search results</strong> block lists pages, posts and entries with counts per type. Edit it under Templates → Search.</p>',
  },

  // ─── Templates ────────────────────────────────────────────────────
  {
    title: 'Global blocks: edit once, update everywhere',
    slug: 'global-blocks',
    category: 'templates',
    tags: ['beginner'],
    image: POST_IMAGES.team,
    author: 'editor',
    excerpt: 'Turn a section you repeat — a CTA banner, a pricing table — into a global block, and every page that uses it stays in sync.',
    body:
      '<p>Select a block and choose <strong>Save as global</strong>. The block is replaced by a reference; edits to the global block show up on every page that uses it after you publish it.</p>' +
      '<h2>When to use one</h2>' +
      list(['Calls to action at the end of many pages', 'Legal notices and banners', 'Contact forms']) +
      '<p>Need a one-off variation? Detach the reference to get an editable copy on that page only.</p>',
  },
  {
    title: 'Header and footer builder with display rules',
    slug: 'header-footer-display-rules',
    category: 'templates',
    tags: ['tutorial'],
    image: POST_IMAGES.desk,
    author: 'admin',
    excerpt: 'Build headers and footers with the same editor, then use display rules to show a different one on the blog or a category.',
    body:
      '<p>Headers and footers are templates built with dedicated blocks: logo, navigation menu, mobile menu, search box, social icons, language switcher and more.</p>' +
      '<h2>Display rules</h2>' +
      '<p>Each template can have rules — show on the whole site, a page, the blog, a category or a post type — with a priority. The most specific rule wins. This site uses a rule to give user guide articles a header with a top bar.</p>',
  },
  {
    title: 'Post templates versus custom post layouts',
    slug: 'post-templates-vs-custom-layouts',
    category: 'templates',
    tags: ['tips'],
    image: POST_IMAGES.meeting,
    author: 'author',
    layout: 'custom',
    excerpt: 'Most posts should share a template. A few — launches, case studies — deserve their own canvas. This post is one of them.',
    body:
      '<p>A <strong>post template</strong> lays out every post that uses it: featured image, title, meta, content, related posts. Change the template and all those posts change.</p>' +
      '<h2>Custom layouts</h2>' +
      '<p>Switch a post to <strong>Custom layout</strong> to design it on its own canvas. The post body is still there — place it with the Post content block — but everything around it is yours.</p>' +
      tip('This article uses a custom layout: the sidebar with the call to action only exists here.'),
  },
  {
    title: 'Page templates and saved sections',
    slug: 'page-templates-saved-sections',
    category: 'templates',
    tags: ['beginner'],
    image: POST_IMAGES.workspace,
    author: 'editor',
    excerpt: 'Start new pages from a template and keep a library of saved sections and patterns for your team.',
    body:
      '<p>When you create a page you can start from a <strong>page template</strong>. Starter templates cover landing pages, about pages and pricing; you can save any page as a template too.</p>' +
      '<h2>Saved sections</h2>' +
      '<p>The Patterns tab holds ready-made sections. Save your own from the block menu: unlike global blocks, inserted patterns are independent copies.</p>',
  },

  // ─── Post types ───────────────────────────────────────────────────
  {
    title: 'Creating a post type: fields, features and icons',
    slug: 'creating-a-post-type',
    category: 'post-types',
    tags: ['featured', 'tutorial'],
    image: POST_IMAGES.laptopCode,
    author: 'admin',
    layout: 'featured',
    excerpt: 'Post types (collections) hold structured content such as team members, case studies or releases. Here is how to set one up.',
    body:
      '<p>Open <strong>Dashboard → Collections</strong> and click <strong>New post type</strong>. Start from a preset — Team members, Testimonials or FAQs — or from scratch.</p>' +
      '<h2>Fields</h2>' +
      '<p>Add the fields your entries need: text, rich text, number, yes/no, date, select, media, relation and URL. Fields can be required and reordered.</p>' +
      '<h2>Features</h2>' +
      list(['<strong>Single template & custom layout</strong> — public pages for each entry', '<strong>Taxonomies</strong> — categories, tags or your own', '<strong>Excerpt</strong>, <strong>Author</strong>, <strong>Status & schedule</strong>, <strong>SEO</strong>']) +
      '<p>This site has five post types: Team members, Showcase, Changelog, Testimonials and FAQs.</p>',
    es: {
      title: 'Crear un tipo de contenido: campos, funciones e iconos',
      slug: 'crear-un-tipo-de-contenido',
      excerpt: 'Los tipos de contenido guardan contenido estructurado como miembros del equipo, casos de éxito o versiones.',
      body:
        '<p>Abre <strong>Panel → Colecciones</strong> y pulsa <strong>Nuevo tipo de contenido</strong>. Empieza con una plantilla o desde cero.</p>' +
        '<h2>Campos</h2>' +
        '<p>Añade los campos que necesitas: texto, texto enriquecido, número, sí/no, fecha, selección, medios, relación y URL.</p>' +
        '<h2>Funciones</h2>' +
        list(['Plantilla individual y diseño propio', 'Taxonomías', 'Extracto, autor, estado y SEO']),
    },
  },
  {
    title: 'Taxonomies and term archives',
    slug: 'taxonomies-term-archives',
    category: 'post-types',
    tags: ['tutorial'],
    image: POST_IMAGES.charts,
    author: 'author',
    excerpt: 'Group entries with flat or hierarchical taxonomies, and get an archive page for every term automatically.',
    body:
      '<p>Each post type can have its own taxonomies: <em>Departments</em> for the team, <em>Industries</em> for the showcase, <em>Areas</em> for the changelog. A taxonomy is flat (like tags) or hierarchical (like categories).</p>' +
      '<h2>Terms</h2>' +
      '<p>Add terms from the taxonomy screen or while editing an entry. Slugs are generated for you and kept unique.</p>' +
      '<h2>Archives</h2>' +
      '<p>Every term gets a public archive listing its entries, and a Loop Grid on that archive filters to the term on its own.</p>',
  },
  {
    title: 'Single templates for post types',
    slug: 'single-templates',
    category: 'post-types',
    tags: ['tips'],
    image: POST_IMAGES.wireframe,
    author: 'editor',
    excerpt: 'Design how every entry of a post type looks, assign different templates to different entries, or give one entry a custom layout.',
    body:
      '<p>Under a post type’s <strong>Templates</strong> tab you design single templates with the builder. Collection Item blocks show the entry’s fields; post blocks show its title, image and meta.</p>' +
      '<h2>Which layout an entry uses</h2>' +
      steps(['A custom layout, if the entry has one', 'The template assigned to the entry', 'The post type’s default template', 'The built-in default']),
  },
  {
    title: 'Collection blocks: reusable designs for entries',
    slug: 'collection-blocks',
    category: 'post-types',
    tags: ['featured', 'advanced'],
    image: POST_IMAGES.design,
    author: 'admin',
    excerpt: 'Design a block once for a post type — a member card, a release summary — and drop it into any entry layout or single template.',
    body:
      '<p>A <strong>collection block</strong> belongs to one post type. You design it in its own builder, previewing it with any entry, and it shows each entry’s own data wherever it is placed.</p>' +
      '<h2>Using a block</h2>' +
      steps(['Open the post type’s <strong>Blocks</strong> tab and create a block.', 'Design it with Collection Item and post blocks; switch <em>Preview with</em> to check different entries.', 'Publish the block.', 'In an entry’s custom layout or a single template, insert it from the <em>Blocks</em> group named after the post type.']) +
      tip('Unpublished blocks show a warning on the canvas and stay hidden on the live site until you publish them.'),
  },

  // ─── Publishing ───────────────────────────────────────────────────
  {
    title: 'Drafts, review and scheduled publishing',
    slug: 'drafts-review-scheduling',
    category: 'publishing',
    tags: ['beginner'],
    image: POST_IMAGES.meeting,
    author: 'editor',
    excerpt: 'Authors submit work for review, editors approve it, and anything can be scheduled to go live later.',
    body:
      '<p>Content moves through <strong>draft → review → published</strong>. Authors can save drafts and submit for review; editors and admins approve from the <strong>Review</strong> queue.</p>' +
      '<h2>Scheduling</h2>' +
      '<p>Pick a date and time when publishing to schedule it. Scheduled posts and entries go live on their own, and the dashboard lists what is coming up.</p>' +
      '<h2>Editing locks</h2>' +
      '<p>When someone has a page open, others see who is editing it, so two people don’t overwrite each other.</p>',
  },
  {
    title: 'Revisions and restoring older versions',
    slug: 'revisions',
    category: 'publishing',
    tags: ['tips'],
    image: POST_IMAGES.desk,
    author: 'author',
    excerpt: 'Every publish creates a revision. Compare versions, restore one, or label important milestones.',
    body:
      '<p>Open the <strong>History</strong> view in the builder to see autosaves, manual saves and published versions. Restoring a revision loads it as a draft; nothing goes live until you publish.</p>' +
      tip('Name a revision before a big change — “Before redesign” is easier to find than a timestamp.'),
  },
  {
    title: 'Translating pages, posts and entries',
    slug: 'translations',
    category: 'publishing',
    tags: ['tutorial'],
    image: POST_IMAGES.team,
    author: 'admin',
    excerpt: 'Add languages to a site, create translations side by side, and let visitors switch with the language switcher.',
    body:
      '<p>Each site has a default language and extra locales (this one has English, Spanish, French, German and Japanese). Content in other languages lives at a language prefix such as <code>/es/</code>.</p>' +
      '<h2>Creating a translation</h2>' +
      '<p>From a page, post or entry, choose <strong>Add translation</strong> and a language. The copy starts with the original content and stays linked, so the language switcher can move between them.</p>' +
      '<p>A few articles and team members on this site have Spanish versions to try it out.</p>',
  },
  {
    title: 'SEO settings, redirects and sitemaps',
    slug: 'seo-redirects-sitemaps',
    category: 'publishing',
    tags: ['tips'],
    image: POST_IMAGES.analytics,
    author: 'editor',
    excerpt: 'Titles, descriptions, social images, noindex, 301s and an automatic sitemap — everything search engines need.',
    body:
      '<p>Every page, post and entry has an SEO panel: title, meta description, social image and <em>noindex</em>. Empty fields fall back to the site defaults in Settings.</p>' +
      '<h2>Redirects</h2>' +
      '<p>When a URL changes, add a 301 under <strong>Redirects</strong> so links and rankings carry over. Temporary campaigns can use a 302.</p>' +
      '<h2>Sitemap</h2>' +
      '<p>The sitemap and robots file are generated from published content and update on publish.</p>',
  },
  {
    title: 'Contact forms and submissions',
    slug: 'contact-forms',
    category: 'publishing',
    tags: ['beginner'],
    image: POST_IMAGES.workspace,
    author: 'author',
    excerpt: 'Build a form with the form builder, place it on any page, and read submissions — with spam filtered out.',
    body:
      '<p>Forms are global blocks built in the form editor: text, email, textarea, select, checkbox and more, each with validation. Place one with the <strong>Contact form</strong> block.</p>' +
      '<p>Submissions appear under the form with new/read status, and suspected spam is kept apart.</p>',
  },
  {
    title: 'A/B experiments and analytics',
    slug: 'experiments-analytics',
    category: 'publishing',
    tags: ['advanced'],
    image: POST_IMAGES.charts,
    author: 'admin',
    excerpt: 'See which pages people read, then test a variant of a page against the original with a traffic split.',
    body:
      '<p>The <strong>Analytics</strong> screen shows page views, top content and referrers for the last 7, 30 or 90 days. Views are counted without cookies.</p>' +
      '<h2>Experiments</h2>' +
      '<p>Create a variant of a page, set the traffic weight, and start the experiment. Each visitor keeps seeing the same version, and results show views per variant.</p>',
  },

  // ─── Developers ───────────────────────────────────────────────────
  {
    title: 'The content API, API keys and webhooks',
    slug: 'content-api-webhooks',
    category: 'developers',
    tags: ['advanced'],
    image: POST_IMAGES.code,
    author: 'admin',
    excerpt: 'Read and write content over REST with scoped API keys, and get notified on publish with signed webhooks.',
    body:
      '<p>Everything in the dashboard is also available over <code>/api/v1</code>: pages, posts, collections and entries. Create a key under <strong>API keys</strong> with only the scopes it needs.</p>' +
      '<pre><code>curl -H "Authorization: Bearer nc_live_…" \\\n  http://localhost:3001/api/v1/collections/team/entries</code></pre>' +
      '<h2>Webhooks</h2>' +
      '<p>Subscribe a URL to events such as <code>content.published</code> or <code>entry.changed</code>. Each delivery is signed with your secret and logged with its response.</p>',
  },
  {
    title: 'Registering custom blocks and loaders',
    slug: 'custom-blocks-loaders',
    category: 'developers',
    tags: ['advanced'],
    image: POST_IMAGES.laptopCode,
    author: 'author',
    status: 'review',
    excerpt: 'Define a block with a schema, fields and a render function, and give it a server loader when it needs data.',
    body:
      '<p>Blocks are defined with <code>defineBlock</code>: a type, a Zod schema for its props, the fields shown in the inspector, defaults, and a React render function.</p>' +
      '<pre><code>export const QuoteBlock = defineBlock({\n  type: \'Quote\',\n  schema: z.object({ text: z.string() }),\n  fields: { text: { type: \'textarea\', label: \'Quote\' } },\n  defaults: { text: \'\' },\n  render: Quote,\n});</code></pre>' +
      '<h2>Loaders</h2>' +
      '<p>A loader runs on the server before render and returns extra props, such as a list of posts. Batch loaders load every instance of a block in one query.</p>',
  },
  {
    title: 'Block manager: choosing which blocks editors see',
    slug: 'block-manager',
    category: 'developers',
    tags: ['tips'],
    image: POST_IMAGES.wireframe,
    author: 'editor',
    excerpt: 'Hide blocks your team should not use from the insert panel, per editor type, without breaking existing content.',
    body:
      '<p>In <strong>Settings → Block manager</strong>, turn blocks off for pages, posts, templates or headers and footers. Hidden blocks leave the insert panel only: pages that already use them keep rendering and stay editable.</p>',
  },
  {
    title: 'Multisite: several sites from one dashboard',
    slug: 'multisite',
    category: 'developers',
    tags: ['advanced'],
    image: POST_IMAGES.office,
    author: 'admin',
    excerpt: 'Run several sites with their own domains, languages, content and members from a single install.',
    body:
      '<p>Each site has its own pages, posts, post types, media, menus and settings. Switch sites from the dashboard header; members can have a different role per site.</p>' +
      '<p>Sites are reached by domain, or by a path prefix such as <code>/main</code> when developing locally.</p>',
  },

  // ─── Release notes ────────────────────────────────────────────────
  {
    title: 'Release notes: post types, taxonomies and collection blocks',
    slug: 'release-post-types',
    category: 'release-notes',
    tags: ['release', 'featured'],
    image: POST_IMAGES.team,
    author: 'admin',
    excerpt: 'Collections grew up: post-type features, taxonomies with term archives, single templates, collection blocks and entry translations.',
    body:
      '<p>This release turns collections into full post types.</p>' +
      list(['<strong>Features</strong> per post type: templates, taxonomies, excerpt, author, status, SEO', '<strong>Taxonomies</strong> with term archives and Loop Grid term locking', '<strong>Single templates</strong> and per-entry custom layouts', '<strong>Collection blocks</strong> with a preview-entry picker', '<strong>Translations</strong> for entries', 'Status cards, search and a collapsible menu in the dashboard']),
  },
  {
    title: 'Release notes: AI page drafts (preview)',
    slug: 'release-ai-drafts',
    category: 'release-notes',
    tags: ['release'],
    image: POST_IMAGES.laptop,
    author: 'admin',
    status: 'scheduled',
    excerpt: 'Describe a page and get a first draft built from real blocks, ready to edit.',
    body:
      '<p>Coming next: describe the page you need and the builder assembles a draft from real blocks — Hero, Features, Testimonials, FAQ — using your theme tokens. Everything stays editable.</p>',
  },
  {
    title: 'Ideas: keyboard-first editing',
    slug: 'ideas-keyboard-editing',
    category: 'getting-started',
    tags: ['tips'],
    image: POST_IMAGES.desk,
    author: 'author',
    status: 'draft',
    excerpt: 'Notes for a future article on editing a whole page without the mouse.',
    body: '<p>Draft notes: command palette, arrow-key selection, quick insert with <kbd>/</kbd>.</p>',
  },
];
