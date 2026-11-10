/**
 * Safe parser for WordPress post meta (PHP serialized values + Yoast / Rank Math SEO).
 * Never uses eval or class instantiation; operates on UTF-8 byte offsets so multi-byte
 * characters inside PHP `s:<bytes>:"..."` strings parse accurately.
 */

export type WpMetaEntry = {
  key: string;
  value: string;
};

export type ExtractedSeoMeta = {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
};

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_PHP_DEPTH = 32;
const MAX_PHP_BYTES = 2_000_000;

/**
 * Parses a PHP-serialized string safely into JS primitives, arrays, and plain objects.
 * Returns `undefined` if the input is not valid PHP-serialized data.
 */
export function parsePhpSerialized(input: string): unknown {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_PHP_BYTES) return undefined;

  const buf = Buffer.from(trimmed, 'utf8');
  let offset = 0;

  function readUntil(byte: number): string | null {
    const idx = buf.indexOf(byte, offset);
    if (idx === -1) return null;
    const str = buf.subarray(offset, idx).toString('utf8');
    offset = idx + 1;
    return str;
  }

  function expectByte(byte: number): boolean {
    if (offset >= buf.length || buf[offset] !== byte) return false;
    offset += 1;
    return true;
  }

  function parseValue(depth: number): { ok: true; value: unknown } | { ok: false } {
    if (depth > MAX_PHP_DEPTH || offset >= buf.length) return { ok: false };

    const typeByte = buf[offset];
    const typeChar = String.fromCharCode(typeByte);
    offset += 1;

    if (typeChar === 'N') {
      if (!expectByte(0x3b)) return { ok: false }; // ';'
      return { ok: true, value: null };
    }

    if (!expectByte(0x3a)) return { ok: false }; // ':'

    switch (typeChar) {
      case 'b': {
        const raw = readUntil(0x3b);
        if (raw !== '0' && raw !== '1') return { ok: false };
        return { ok: true, value: raw === '1' };
      }
      case 'i': {
        const raw = readUntil(0x3b);
        if (raw === null || !/^-?\d+$/.test(raw)) return { ok: false };
        const n = Number(raw);
        return { ok: true, value: Number.isSafeInteger(n) ? n : raw };
      }
      case 'd': {
        const raw = readUntil(0x3b);
        if (raw === null) return { ok: false };
        if (raw === 'INF') return { ok: true, value: Number.POSITIVE_INFINITY };
        if (raw === '-INF') return { ok: true, value: Number.NEGATIVE_INFINITY };
        if (raw === 'NAN') return { ok: true, value: Number.NaN };
        const n = Number(raw);
        if (Number.isNaN(n)) return { ok: false };
        return { ok: true, value: n };
      }
      case 's': {
        const lenStr = readUntil(0x3a);
        if (lenStr === null || !/^\d+$/.test(lenStr)) return { ok: false };
        const byteLen = Number(lenStr);
        if (!Number.isSafeInteger(byteLen) || byteLen < 0) return { ok: false };
        if (!expectByte(0x22)) return { ok: false }; // '"'
        if (offset + byteLen > buf.length) return { ok: false };
        const str = buf.subarray(offset, offset + byteLen).toString('utf8');
        offset += byteLen;
        if (!expectByte(0x22) || !expectByte(0x3b)) return { ok: false }; // '";'
        return { ok: true, value: str };
      }
      case 'a': {
        const countStr = readUntil(0x3a);
        if (countStr === null || !/^\d+$/.test(countStr)) return { ok: false };
        const count = Number(countStr);
        if (!Number.isSafeInteger(count) || count < 0 || count > 100_000) {
          return { ok: false };
        }
        if (!expectByte(0x7b)) return { ok: false }; // '{'
        const entries: Array<[string | number, unknown]> = [];
        let isSequentialList = true;
        for (let i = 0; i < count; i++) {
          const keyRes = parseValue(depth + 1);
          if (!keyRes.ok) return { ok: false };
          const valRes = parseValue(depth + 1);
          if (!valRes.ok) return { ok: false };
          const k = keyRes.value;
          if (typeof k !== 'string' && typeof k !== 'number') {
            return { ok: false };
          }
          if (k !== i) isSequentialList = false;
          entries.push([k, valRes.value]);
        }
        if (!expectByte(0x7d)) return { ok: false }; // '}'
        if (isSequentialList) {
          return { ok: true, value: entries.map(([, v]) => v) };
        }
        const obj: Record<string, unknown> = {};
        for (const [k, v] of entries) {
          const key = String(k);
          if (!FORBIDDEN_KEYS.has(key)) {
            obj[key] = v;
          }
        }
        return { ok: true, value: obj };
      }
      case 'O': {
        // Object: O:<classLen>:"<className>":<propCount>:{...}
        const clsLenStr = readUntil(0x3a);
        if (clsLenStr === null || !/^\d+$/.test(clsLenStr)) return { ok: false };
        const clsLen = Number(clsLenStr);
        if (!expectByte(0x22)) return { ok: false };
        if (offset + clsLen > buf.length) return { ok: false };
        offset += clsLen;
        if (!expectByte(0x22) || !expectByte(0x3a)) return { ok: false };
        const propCountStr = readUntil(0x3a);
        if (propCountStr === null || !/^\d+$/.test(propCountStr)) return { ok: false };
        const propCount = Number(propCountStr);
        if (!Number.isSafeInteger(propCount) || propCount < 0 || propCount > 100_000) {
          return { ok: false };
        }
        if (!expectByte(0x7b)) return { ok: false };
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < propCount; i++) {
          const keyRes = parseValue(depth + 1);
          if (!keyRes.ok) return { ok: false };
          const valRes = parseValue(depth + 1);
          if (!valRes.ok) return { ok: false };
          // Strip PHP protected/private visibility prefixes (\0*\0 or \0ClassName\0)
          const rawKey = String(keyRes.value);
          const cleanKey = rawKey.includes('\0')
            ? rawKey.slice(rawKey.lastIndexOf('\0') + 1)
            : rawKey;
          if (cleanKey && !FORBIDDEN_KEYS.has(cleanKey)) {
            obj[cleanKey] = valRes.value;
          }
        }
        if (!expectByte(0x7d)) return { ok: false };
        return { ok: true, value: obj };
      }
      default:
        return { ok: false };
    }
  }

  const res = parseValue(0);
  if (!res.ok || offset !== buf.length) return undefined;
  return res.value;
}

/**
 * Safely decodes a WordPress meta value: JSON if it looks like JSON,
 * PHP serialized if it matches serialized syntax, otherwise the raw string.
 */
export function parseWpMetaValue(raw: string): unknown {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return raw;
    }
  }
  if (/^(?:N;|[bid]:[^;]+;|s:\d+:"|[aO]:\d+:)/.test(trimmed)) {
    const parsed = parsePhpSerialized(trimmed);
    if (parsed !== undefined) return parsed;
  }
  return raw;
}

function resolveSeoTokens(
  text: string | undefined,
  context: { title?: string; siteName?: string }
): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const resolved = trimmed
    .replace(/%%title%%|%title%/gi, context.title ?? '')
    .replace(/%%sitename%%|%sitename%/gi, context.siteName ?? '')
    .replace(/%%sep%%|%sep%/gi, '-')
    .replace(/%%page%%|%page%/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*-\s*|\s*-\s*$/g, '')
    .trim();
  return resolved || undefined;
}

function clampStr(val: string | undefined, max: number): string | undefined {
  if (!val) return undefined;
  const s = val.trim();
  return s ? s.slice(0, max) : undefined;
}

function parseRankMathRobots(raw: string | undefined): boolean | undefined {
  if (!raw) return undefined;
  const parsed = parseWpMetaValue(raw);
  if (Array.isArray(parsed)) {
    return parsed.some(v => String(v).toLowerCase() === 'noindex');
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return Object.values(parsed).some(v => String(v).toLowerCase() === 'noindex');
  }
  if (typeof raw === 'string') {
    return raw.toLowerCase().split(/[\s,]+/).includes('noindex');
  }
  return undefined;
}

/**
 * Extracts SEO fields from Yoast SEO and Rank Math post meta entries.
 * Returns `undefined` when no SEO fields are present.
 */
export function extractSeoFromMeta(
  meta: Record<string, string>,
  context: { title?: string; siteName?: string } = {}
): ExtractedSeoMeta | undefined {
  const title = clampStr(
    resolveSeoTokens(meta._yoast_wpseo_title || meta.rank_math_title, context),
    255
  );
  const description = resolveSeoTokens(
    meta._yoast_wpseo_metadesc || meta.rank_math_description,
    context
  );
  const keywords = clampStr(
    meta._yoast_wpseo_focuskw || meta.rank_math_focus_keyword,
    500
  );
  const canonicalUrl = clampStr(
    meta._yoast_wpseo_canonical || meta.rank_math_canonical_url,
    500
  );
  const ogTitle = clampStr(
    resolveSeoTokens(
      meta['_yoast_wpseo_opengraph-title'] || meta.rank_math_facebook_title,
      context
    ),
    255
  );
  const ogDescription = resolveSeoTokens(
    meta['_yoast_wpseo_opengraph-description'] ||
      meta.rank_math_facebook_description,
    context
  );
  const ogImage = clampStr(
    meta['_yoast_wpseo_opengraph-image'] || meta.rank_math_facebook_image,
    500
  );

  let noIndex: boolean | undefined;
  if (meta._yoast_wpseo_meta_robots_noindex !== undefined) {
    noIndex = meta._yoast_wpseo_meta_robots_noindex === '1';
  } else if (meta['_yoast_wpseo_meta-robots-noindex'] !== undefined) {
    noIndex = meta['_yoast_wpseo_meta-robots-noindex'] === '1';
  } else if (meta.rank_math_robots !== undefined) {
    noIndex = parseRankMathRobots(meta.rank_math_robots);
  }

  const out: ExtractedSeoMeta = {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(keywords !== undefined ? { keywords } : {}),
    ...(canonicalUrl !== undefined ? { canonicalUrl } : {}),
    ...(ogTitle !== undefined ? { ogTitle } : {}),
    ...(ogDescription !== undefined ? { ogDescription } : {}),
    ...(ogImage !== undefined ? { ogImage } : {}),
    ...(noIndex !== undefined ? { noIndex } : {}),
  };

  return Object.keys(out).length > 0 ? out : undefined;
}
