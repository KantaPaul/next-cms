import { isBuilderData, type BuilderItem } from './data';

const NON_COPY_KEY = /(^id$|url|href|src|image|icon|color|variant|align|layout|theme|padding|columns|hide|style|width|target|globalblockid|avatar|logo|type$)/i;

const looksLikeCopy = (value: string) =>
  value.trim().length > 0 && !/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(value.trim());

/** Flattens every user-facing string inside a block's props into `path -> text`. */
export function collectCopy(props: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(props)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (NON_COPY_KEY.test(key)) continue;

    if (typeof value === 'string') {
      if (looksLikeCopy(value)) out[path] = value;
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object' && !('type' in item && 'props' in item)) {
          Object.assign(out, collectCopy(item as Record<string, unknown>, `${path}.${index}`));
        } else if (typeof item === 'string' && looksLikeCopy(item)) {
          out[`${path}.${index}`] = item;
        }
      });
    } else if (value && typeof value === 'object') {
      Object.assign(out, collectCopy(value as Record<string, unknown>, path));
    }
  }

  return out;
}

/** Writes `path -> text` back into a deep copy of props, ignoring unknown paths. */
export function applyCopy<T extends Record<string, unknown>>(props: T, copy: Record<string, string>): T {
  const next = structuredClone(props);
  const known = collectCopy(props);

  for (const [path, text] of Object.entries(copy)) {
    if (!(path in known) || typeof text !== 'string') continue;
    const keys = path.split('.');
    let cursor: Record<string, unknown> | unknown[] = next;
    for (const key of keys.slice(0, -1)) {
      cursor = (cursor as Record<string, unknown>)[key] as Record<string, unknown>;
      if (!cursor || typeof cursor !== 'object') break;
    }
    if (cursor && typeof cursor === 'object') {
      (cursor as Record<string, unknown>)[keys[keys.length - 1]] = text;
    }
  }

  return next;
}

const stripHtml = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

function walk(items: BuilderItem[], out: string[]) {
  for (const item of items) {
    for (const value of Object.values(item.props)) {
      if (Array.isArray(value) && value.length && value.every(v => v && typeof v === 'object' && 'type' in v && 'props' in v)) {
        walk(value as BuilderItem[], out);
      }
    }
    Object.values(collectCopy(item.props)).forEach(text => out.push(stripHtml(text)));
  }
}

/** Plain text for a page body, used for AI prompts and search snippets. */
export function extractPlainText(content: unknown, maxLength = 6000) {
  if (typeof content === 'string') return stripHtml(content).slice(0, maxLength);
  if (!isBuilderData(content)) return '';

  const out: string[] = [];
  walk(content.content, out);
  Object.values(content.zones ?? {}).forEach(zone => walk(zone, out));
  return [...new Set(out)].join('\n').slice(0, maxLength);
}
