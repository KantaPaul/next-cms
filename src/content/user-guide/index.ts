import { COMPONENT_TOPICS } from './components';
import { ROUTE_TOPICS } from './routes';
import type { GuideTopic } from './types';

export type { GuideSection, GuideTopic } from './types';
export { DOCUMENTED_BLOCKS } from './components';

/** Where the generated PDF is written and served from. */
export const GUIDE_PDF_PATH = '/docs/user-guide.pdf';
export const GUIDE_PRINT_PATH = '/user-guide/print';

const OVERVIEW: GuideTopic = {
  slug: 'guide-overview',
  title: 'User guide: start here',
  group: 'overview',
  summary: 'How this guide is organised and the fastest way to build your first page.',
  sections: [
    {
      heading: 'How the guide is organised',
      html: '<ul><li><strong>Dashboard</strong>: one article per screen of the admin dashboard.</li><li><strong>Public site</strong>: the URLs visitors use, and how to sign in.</li><li><strong>Builder components</strong>: every block in the page builder, grouped as in the insert panel.</li></ul>',
    },
    {
      heading: 'Your first page in five minutes',
      html: '<ol><li>Sign in and open <strong>Pages → New page</strong>.</li><li>Choose the <em>Builder</em> editor and a starter template.</li><li>Replace the text on the canvas and swap the images from the media library.</li><li>Check the mobile view, then choose <strong>Publish</strong>.</li><li>Add the page to the header menu under <strong>Menus</strong>.</li></ol>',
    },
    {
      heading: 'Other formats',
      html: `<p>Read the whole guide on one page at <a href="${GUIDE_PRINT_PATH}">${GUIDE_PRINT_PATH}</a>, or download it as a <a href="${GUIDE_PDF_PATH}">PDF</a>.</p>`,
    },
  ],
};

/** Every topic, in reading order. */
export const GUIDE_TOPICS: GuideTopic[] = [OVERVIEW, ...ROUTE_TOPICS, ...COMPONENT_TOPICS];

export const GUIDE_GROUP_TITLES: Record<GuideTopic['group'], string> = {
  overview: 'Overview',
  dashboard: 'Dashboard',
  site: 'Public site',
  components: 'Builder components',
};

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The body of one topic, as stored in its blog post. */
export function topicBodyHtml(topic: GuideTopic) {
  const path = topic.path ? `<p><em>Where:</em> <code>${escape(topic.path)}</code></p>` : '';
  const sections = topic.sections
    .map(section => `<h2>${escape(section.heading)}</h2>${section.html}`)
    .join('');
  return `<p>${topic.summary}</p>${path}${sections}`;
}

export const GUIDE_CSS = `
.guide{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1f2328;background:#fff;line-height:1.6;max-width:820px;margin:0 auto;padding:32px 16px}
.guide a{color:#0969da}
.guide h1{font-size:2rem;margin:0 0 .25rem}
.guide h2{font-size:1.15rem;margin:1.25rem 0 .35rem}
.guide h3{font-size:1rem;margin:1rem 0 .25rem}
.guide code{font-family:ui-monospace,Menlo,monospace;font-size:.9em;background:#f3f4f6;padding:0 .25em;border-radius:4px}
.guide .lead{color:#57606a;margin:0 0 1.5rem}
.guide .toc ol{columns:2;column-gap:2rem;padding-left:1.25rem}
.guide .group{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:#57606a;margin:2rem 0 0}
.guide article{border-top:1px solid #d0d7de;padding-top:1rem;margin-top:1.5rem}
.guide .summary{color:#57606a;margin-top:0}
.guide .actions{display:flex;gap:12px;margin:0 0 1.5rem}
.guide .actions a{border:1px solid #d0d7de;border-radius:6px;padding:6px 12px;text-decoration:none;color:inherit}
@media (max-width:640px){.guide .toc ol{columns:1}}
@media print{
  .guide{max-width:none;padding:0}
  .guide .actions{display:none}
  .guide article{break-before:page;border-top:none;margin-top:0}
  .guide a{color:inherit;text-decoration:none}
}
`;

/** The whole guide as HTML for the print page and the PDF. */
export function renderGuideBody(topics: GuideTopic[] = GUIDE_TOPICS) {
  const groups = Object.keys(GUIDE_GROUP_TITLES) as GuideTopic['group'][];
  const toc = groups
    .map(group => {
      const items = topics.filter(topic => topic.group === group);
      if (!items.length) return '';
      return `<p class="group">${GUIDE_GROUP_TITLES[group]}</p><ol>${items
        .map(topic => `<li><a href="#${topic.slug}">${escape(topic.title)}</a></li>`)
        .join('')}</ol>`;
    })
    .join('');
  const articles = topics
    .map(
      topic =>
        `<article id="${topic.slug}"><h1>${escape(topic.title)}</h1>${topicBodyHtml(topic).replace(
          /^<p>/,
          '<p class="summary">'
        )}</article>`
    )
    .join('');
  return `<div class="guide"><h1>Meridian user guide</h1><p class="lead">Every dashboard screen, public route, and builder component.</p><div class="actions"><a href="${GUIDE_PDF_PATH}" download>Download PDF</a><a href="/blog/category/user-guide">Read as blog posts</a></div><nav class="toc"><h2>Contents</h2>${toc}</nav>${articles}</div>`;
}

/** A standalone HTML document, used to render the PDF. */
export function renderGuideHtml(topics: GuideTopic[] = GUIDE_TOPICS) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Meridian user guide</title><style>${GUIDE_CSS}</style></head><body>${renderGuideBody(topics)}</body></html>`;
}
