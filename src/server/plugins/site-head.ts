import 'server-only';
import type {
  PluginConsentCategory,
  SiteHeadItem,
} from '@nextcms/plugin-sdk';
import { applyFilters } from './hooks';

const VALID_CATEGORIES = new Set<PluginConsentCategory>([
  'necessary',
  'functional',
  'analytics',
  'marketing',
]);

function normalizeConsentCategory(
  raw: unknown
): PluginConsentCategory | null {
  if (raw === 'essential') return 'necessary';
  if (raw === 'preferences') return 'functional';
  if (
    typeof raw === 'string' &&
    VALID_CATEGORIES.has(raw as PluginConsentCategory)
  ) {
    return raw as PluginConsentCategory;
  }
  return null;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function serializeAttrs(attrs: Record<string, string> = {}): string {
  return Object.entries(attrs)
    .filter(([k]) => /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(k))
    .map(([k, v]) => `${k}="${escapeAttr(String(v))}"`)
    .join(' ');
}

function containsScriptTag(html: string): boolean {
  return /<\s*script\b/i.test(html);
}

/**
 * Raw HTML that can't run code or load third-party content: only meta, link,
 * style and title tags, with no event handlers or javascript: URLs. Anything
 * else (iframes, tracking pixels, <img onerror>, ...) needs a consent
 * category, like scripts; checking for <script> alone let those through.
 */
function isPassiveHeadHtml(html: string): boolean {
  if (/\son[a-z]+\s*=/i.test(html) || /javascript\s*:/i.test(html)) return false;
  const tags = html.match(/<\s*([a-z][a-z0-9-]*)/gi) ?? [];
  return tags.every(tag =>
    /^<\s*(?:meta|link|style|title)$/i.test(tag.replace(/\s+/g, ''))
  );
}

export type PartitionedSiteHead = {
  /** Safe non-script tags (`<meta>`, `<link>`, etc.) rendered directly in `<head>`. */
  nonScriptItems: SiteHeadItem[];
  /** Script snippets grouped by consent category so they go through `<CustomCode />`. */
  scriptSnippets: Array<{
    id: string;
    category: PluginConsentCategory;
    html: string;
  }>;
};

/**
 * Separates `site.head` filter outputs into non-script head tags and
 * consent-gated script snippets. Any script without a valid `consentCategory`
 * is rejected and logged.
 */
export function partitionSiteHeadItems(
  items: SiteHeadItem[],
  warn: (msg: string) => void = msg => console.warn(msg)
): PartitionedSiteHead {
  const nonScriptItems: SiteHeadItem[] = [];
  const byCategory = new Map<PluginConsentCategory, string[]>();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    if (item.type === 'script') {
      const cat = normalizeConsentCategory(item.consentCategory);
      if (!cat) {
        warn(
          '[plugins/site.head] Rejected <script> item without a valid consentCategory.'
        );
        continue;
      }
      const attrs: Record<string, string> = { ...(item.attrs ?? {}) };
      if (item.src) attrs.src = item.src;
      const flags = [item.async ? 'async' : '', item.defer ? 'defer' : '']
        .filter(Boolean)
        .join(' ');
      const attrStr = [serializeAttrs(attrs), flags].filter(Boolean).join(' ');
      const body = item.inline ? String(item.inline) : '';
      const tag = `<script${attrStr ? ` ${attrStr}` : ''}>${body}</script>`;
      const list = byCategory.get(cat) ?? [];
      list.push(tag);
      byCategory.set(cat, list);
      continue;
    }

    if (item.type === 'html') {
      if (containsScriptTag(item.html) || !isPassiveHeadHtml(item.html)) {
        const cat = normalizeConsentCategory(item.consentCategory);
        if (!cat) {
          warn(
            '[plugins/site.head] Rejected active raw HTML (script, iframe, handlers, ...) without a valid consentCategory.'
          );
          continue;
        }
        const list = byCategory.get(cat) ?? [];
        list.push(item.html);
        byCategory.set(cat, list);
        continue;
      }
      nonScriptItems.push(item);
      continue;
    }

    if (item.type === 'meta' || item.type === 'link') {
      nonScriptItems.push(item);
    }
  }

  const scriptSnippets = Array.from(byCategory.entries()).map(
    ([category, tags]) => ({
      id: `plugin-${category}`,
      category,
      html: tags.join('\n'),
    })
  );

  return { nonScriptItems, scriptSnippets };
}

export async function resolveSiteHead(siteId: string): Promise<PartitionedSiteHead> {
  const items = await applyFilters('site.head', [], { siteId });
  return partitionSiteHeadItems(items);
}
