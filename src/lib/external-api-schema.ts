import {
  EMBED_URL_ERROR,
  entryMediaValues,
  GENERAL_URL_ERROR,
  isValidEmbedUrl,
  isValidGeneralUrl,
  parseEmbedInput,
  parseVideoUrl,
  type TextFieldMode,
  type UrlFieldMode,
  VIDEO_URL_ERROR,
} from '@/config/post-types';

// ---------------------------------------------------------------------------
// External API Field & View Type Definitions
// Modeled after /dashboard/collections/[slug]/settings + nested array repeaters
// ---------------------------------------------------------------------------

export const EXTERNAL_API_FIELD_TYPES = [
  'text',
  'richtext',
  'media',
  'number',
  'date',
  'url',
  'boolean',
  'select',
  'object',
  'array',
] as const;

export type ExternalApiFieldType = (typeof EXTERNAL_API_FIELD_TYPES)[number];

export const EXTERNAL_API_FIELD_TYPE_OPTIONS: {
  label: string;
  value: ExternalApiFieldType;
}[] = [
  { label: 'Text', value: 'text' },
  { label: 'Rich Text', value: 'richtext' },
  { label: 'Media (Image / Gallery)', value: 'media' },
  { label: 'Number', value: 'number' },
  { label: 'Date', value: 'date' },
  { label: 'URL (Link / Video)', value: 'url' },
  { label: 'Boolean (Toggle)', value: 'boolean' },
  { label: 'Select / Badge', value: 'select' },
  { label: 'Object (Multi-select Group)', value: 'object' },
  { label: 'Array (Nested Repeatable)', value: 'array' },
];

export const EXTERNAL_API_NESTED_FIELD_TYPE_OPTIONS: {
  label: string;
  value: Exclude<ExternalApiFieldType, 'array' | 'object'>;
}[] = EXTERNAL_API_FIELD_TYPE_OPTIONS.filter(
  (
    o
  ): o is {
    label: string;
    value: Exclude<ExternalApiFieldType, 'array' | 'object'>;
  } => o.value !== 'array' && o.value !== 'object'
);

export type ExternalApiTextSize =
  | 'auto'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'lead'
  | 'body'
  | 'small';

export type ExternalApiUrlDisplay = 'link' | 'button' | 'text';

export type ExternalApiImageAspect =
  | 'video'
  | 'landscape'
  | 'square'
  | 'portrait'
  | 'wide'
  | 'auto';

export type ExternalApiGalleryAspect =
  | 'wide'
  | 'landscape'
  | 'square'
  | 'portrait'
  | 'tall'
  | 'auto';

export type ExternalApiArrayLayout =
  | 'stack'
  | 'row'
  | 'grid'
  | 'badges'
  | 'cards'
  | 'list';

export interface ExternalApiNestedFieldMapping {
  id?: string;
  /** Sub-key inside the array item (e.g. `name`, `address.city`, or `.` for primitive array values). */
  key: string;
  label?: string;
  showLabel?: boolean;
  fieldType: Exclude<ExternalApiFieldType, 'array'>;
  /** For `text`: `'plain' | 'video' | 'embed'` (matches collection settings). */
  textMode?: TextFieldMode;
  /** For `url`: `'other' | 'video'` (matches collection settings). */
  urlMode?: UrlFieldMode;
  /** For `media`: multi-image gallery view vs single image. */
  multiple?: boolean;
  /** For `media`: featured image treatment. */
  isFeatured?: boolean;
  textSize?: ExternalApiTextSize;
  linkToItem?: boolean;
  urlDisplay?: ExternalApiUrlDisplay;
  urlLinkText?: string;
  urlNewTab?: boolean;
  showArrow?: boolean;
  dateFormat?: 'medium' | 'long' | 'short' | 'iso' | 'relative';
  datePrefix?: string;
  maxLines?: 'none' | '2' | '3' | '4' | '6';
  stripHtml?: boolean;
  imageAspect?: ExternalApiImageAspect;
  galleryViewMode?: string;
  galleryAspect?: ExternalApiGalleryAspect;
  popupTrigger?: boolean;
  overlayId?: string;
  posterUrl?: string;
}

export interface ExternalApiFieldMapping
  extends Omit<ExternalApiNestedFieldMapping, 'fieldType'> {
  fieldType: ExternalApiFieldType;
  /** Layout when `fieldType === 'array'`. */
  arrayLayout?: ExternalApiArrayLayout;
  /** Nested multi-repeat field mappings when `fieldType === 'array'`. */
  nestedFields?: ExternalApiNestedFieldMapping[];
}

export interface DiscoveredApiKey {
  /** Dot-notation path, e.g. `title`, `address.street`, `address.geo.lat`, `tags`. */
  key: string;
  /** Human-readable label with key path, e.g. `Address › Street (address.street)`. */
  label: string;
  /** Short human label, e.g. `Address Street`. */
  shortLabel: string;
  isNested: boolean;
  isArray: boolean;
  isArrayOfObjects?: boolean;
  inferredType: ExternalApiFieldType;
  inferredTextMode?: TextFieldMode;
  inferredUrlMode?: UrlFieldMode;
  inferredMultipleMedia?: boolean;
  sampleValue?: unknown;
  samplePreview: string;
  /** When `isArray` is true, discovered sub-keys of array items (including nested object keys + `.` primitive). */
  subKeys?: DiscoveredApiKey[];
}

export interface ExternalApiPreviewPostOption {
  id: string;
  title: string;
  label: string;
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Path Resolution & Humanizing Helpers
// ---------------------------------------------------------------------------

export function humanizeApiKeyPath(path: string): string {
  if (!path || path === '.') return 'Item Value';
  return path
    .split('.')
    .map(part =>
      part
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase())
    )
    .join(' › ');
}

export function shortLabelForApiKeyPath(path: string): string {
  if (!path || path === '.') return 'Value';
  return path
    .split('.')
    .map(part =>
      part
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase())
    )
    .join(' ');
}

/**
 * Safely reads a dot-notation path (e.g. `address.street`, `address.geo.lat`,
 * or `.` for identity on primitive array items) from any value.
 */
export function extractNestedValue(data: unknown, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '.') return data;
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    trimmed in (data as Record<string, unknown>)
  ) {
    return (data as Record<string, unknown>)[trimmed];
  }
  let cur: unknown = data;
  for (const segment of trimmed.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(segment);
      if (Number.isInteger(idx) && idx >= 0) {
        cur = cur[idx];
      } else {
        const mapped = cur
          .map(el =>
            el && typeof el === 'object'
              ? (el as Record<string, unknown>)[segment]
              : undefined
          )
          .filter(v => v !== undefined);
        cur = mapped.length > 0 ? mapped : undefined;
      }
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return cur;
}

/**
 * Flattens nested object keys into top-level dot-notation entries on a raw item
 * record so both `readPath(item.raw, 'address.street')` and direct key lookups work.
 */
export function flattenNestedObjectKeys(
  obj: Record<string, unknown>,
  maxDepth = 4
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  const visit = (
    current: Record<string, unknown>,
    prefix: string,
    depth: number
  ) => {
    if (depth > maxDepth) return;
    for (const [k, v] of Object.entries(current)) {
      if (k.startsWith('__')) continue;
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (!(fullKey in out)) {
        out[fullKey] = v;
      }
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        visit(v as Record<string, unknown>, fullKey, depth + 1);
      }
    }
  };
  visit(obj, '', 1);
  return out;
}

// ---------------------------------------------------------------------------
// Type & View Mode Inference
// ---------------------------------------------------------------------------

const IMAGE_URL_RE = /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?|#|$)/i;
const IMAGE_HOST_RE =
  /(images\.unsplash\.com|picsum\.photos|placehold\.co|via\.placeholder\.com|i\.imgur\.com|avatars\.githubusercontent\.com|cdn\.dummyjson\.com|fakestoreapi\.com\/img)/i;
const IMAGE_KEY_RE =
  /(^|\.|_)(image|img|thumbnail|thumb|avatar|photo|picture|cover|banner|logo|icon|poster)s?$/i;
const VIDEO_KEY_RE =
  /(^|\.|_)(video|video_url|videoUrl|youtube|vimeo|trailer)s?$/i;
const EMBED_KEY_RE = /(^|\.|_)(embed|embed_url|embedUrl|iframe|map_embed)$/i;
const URL_KEY_RE = /(^|\.|_)(url|website|homepage|link|href|permalink|uri)$/i;
const DATE_KEY_RE =
  /(^|\.|_)(date|publishedAt|published_at|createdAt|created_at|updatedAt|updated_at|timestamp|launched|released|birthDate)$/i;
const HTML_TAG_RE =
  /<\/?(p|div|ul|ol|li|h[1-6]|blockquote|strong|em|br|article|section|span|a)\b/i;
const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function isLikelyImageUrl(value: string, key = ''): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (IMAGE_URL_RE.test(trimmed) || IMAGE_HOST_RE.test(trimmed)) return true;
  if (IMAGE_KEY_RE.test(key) && isValidGeneralUrl(trimmed)) return true;
  return false;
}

export function isLikelyVideoValue(value: string, key = ''): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parsed = parseVideoUrl(trimmed);
  if (!parsed) return false;
  if (parsed.kind === 'youtube' || parsed.kind === 'vimeo') return true;
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(trimmed)) return true;
  if (VIDEO_KEY_RE.test(key)) return true;
  return false;
}

export function isLikelyEmbedValue(value: string, key = ''): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^<iframe\b/i.test(trimmed) && parseEmbedInput(trimmed)) return true;
  if (EMBED_KEY_RE.test(key) && isValidEmbedUrl(trimmed)) return true;
  return false;
}

export function inferFieldTypeAndMode(
  key: string,
  sampleValue: unknown
): {
  fieldType: ExternalApiFieldType;
  textMode?: TextFieldMode;
  urlMode?: UrlFieldMode;
  multiple?: boolean;
  isFeatured?: boolean;
} {
  if (Array.isArray(sampleValue)) {
    const mediaUrls = entryMediaValues(sampleValue);
    const nonEmpty = sampleValue.filter(v => v !== null && v !== undefined);
    const allStrings =
      nonEmpty.length > 0 && nonEmpty.every(v => typeof v === 'string');
    if (
      mediaUrls.length > 0 &&
      allStrings &&
      nonEmpty.every(v => isLikelyImageUrl(String(v), key))
    ) {
      return {
        fieldType: 'array',
        multiple: true,
      };
    }
    return { fieldType: 'array' };
  }

  if (typeof sampleValue === 'boolean') {
    return { fieldType: 'boolean' };
  }

  if (typeof sampleValue === 'number') {
    return { fieldType: 'number' };
  }

  if (typeof sampleValue === 'string') {
    const trimmed = sampleValue.trim();

    if (isLikelyEmbedValue(trimmed, key)) {
      return { fieldType: 'text', textMode: 'embed' };
    }

    if (isLikelyVideoValue(trimmed, key)) {
      if (URL_KEY_RE.test(key) || VIDEO_KEY_RE.test(key)) {
        return { fieldType: 'url', urlMode: 'video' };
      }
      return { fieldType: 'text', textMode: 'video' };
    }

    if (isLikelyImageUrl(trimmed, key)) {
      return { fieldType: 'media', multiple: false, isFeatured: true };
    }

    if (HTML_TAG_RE.test(trimmed)) {
      return { fieldType: 'richtext' };
    }

    if (
      ISO_DATE_RE.test(trimmed) ||
      (DATE_KEY_RE.test(key) && !Number.isNaN(Date.parse(trimmed)))
    ) {
      return { fieldType: 'date' };
    }

    if (
      (/^https?:\/\//i.test(trimmed) || URL_KEY_RE.test(key)) &&
      isValidGeneralUrl(trimmed)
    ) {
      return { fieldType: 'url', urlMode: 'other' };
    }

    return { fieldType: 'text', textMode: 'plain' };
  }

  if (EMBED_KEY_RE.test(key)) return { fieldType: 'text', textMode: 'embed' };
  if (VIDEO_KEY_RE.test(key)) return { fieldType: 'url', urlMode: 'video' };
  if (IMAGE_KEY_RE.test(key))
    return { fieldType: 'media', multiple: false, isFeatured: true };
  if (DATE_KEY_RE.test(key)) return { fieldType: 'date' };
  if (URL_KEY_RE.test(key)) return { fieldType: 'url', urlMode: 'other' };

  return { fieldType: 'text', textMode: 'plain' };
}

function formatSamplePreview(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (Array.isArray(val)) {
    if (val.length === 0) return '[] (0 items)';
    const first = val[0];
    if (first && typeof first === 'object') {
      const keys = Object.keys(first as Record<string, unknown>).slice(0, 3);
      return `[${val.length} items: { ${keys.join(', ')}${keys.length >= 3 ? ', …' : ''} }]`;
    }
    return `[${val.length} items: ${val.slice(0, 2).map(String).join(', ')}${val.length > 2 ? ', …' : ''}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>).slice(0, 3);
    return `{ ${keys.join(', ')} }`;
  }
  const str = String(val).replace(/\s+/g, ' ').trim();
  return str.length > 48 ? `${str.slice(0, 48)}…` : str;
}

// ---------------------------------------------------------------------------
// Schema & Key Discovery (Top-level + Nested Dot Keys + Array Sub-Keys)
// ---------------------------------------------------------------------------

/**
 * Discovers all keys across an array of JSON objects, flattening nested objects
 * into dot-notation (`address.street`, `address.geo.lat`, `company.name`) and
 * extracting sub-keys for array fields (`subKeys`).
 */
export function discoverExternalApiSchema(
  rawItems: unknown[],
  maxDepth = 4
): DiscoveredApiKey[] {
  const objects = rawItems.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object' && !Array.isArray(item))
  );
  if (objects.length === 0) return [];

  const keySamples = new Map<string, unknown>();
  const keyOrder: string[] = [];

  const collectFromObject = (
    obj: Record<string, unknown>,
    prefix: string,
    depth: number
  ) => {
    if (depth > maxDepth) return;
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('__')) continue;
      const path = prefix ? `${prefix}.${k}` : k;

      if (
        v !== null &&
        v !== undefined &&
        typeof v === 'object' &&
        !Array.isArray(v)
      ) {
        collectFromObject(v as Record<string, unknown>, path, depth + 1);
        continue;
      }

      if (!keySamples.has(path)) {
        keyOrder.push(path);
        keySamples.set(path, v);
      } else {
        const existing = keySamples.get(path);
        const isExistingEmpty =
          existing === null ||
          existing === undefined ||
          existing === '' ||
          (Array.isArray(existing) && existing.length === 0);
        const isNewPopulated =
          v !== null &&
          v !== undefined &&
          v !== '' &&
          (!Array.isArray(v) || v.length > 0);
        if (isExistingEmpty && isNewPopulated) {
          keySamples.set(path, v);
        }
      }
    }
  };

  for (const item of objects.slice(0, 25)) {
    collectFromObject(item, '', 1);
  }

  return keyOrder.map(path => {
    const sample = keySamples.get(path);
    const isArray = Array.isArray(sample);
    const inferred = inferFieldTypeAndMode(path, sample);
    const human = humanizeApiKeyPath(path);
    const shortLabel = shortLabelForApiKeyPath(path);

    let subKeys: DiscoveredApiKey[] | undefined;
    let isArrayOfObjects = false;
    if (isArray) {
      const allArrayElements: unknown[] = [];
      for (const obj of objects.slice(0, 15)) {
        const arrVal = extractNestedValue(obj, path);
        if (Array.isArray(arrVal)) {
          allArrayElements.push(...arrVal);
        }
      }
      const nonNullElements = allArrayElements.filter(
        el => el !== null && el !== undefined
      );
      const objectElements = nonNullElements.filter(
        (el): el is Record<string, unknown> =>
          typeof el === 'object' && !Array.isArray(el)
      );
      isArrayOfObjects = objectElements.length > 0;

      subKeys = [];
      if (objectElements.length > 0) {
        subKeys.push(...discoverExternalApiSchema(objectElements, 3));
      }

      const firstPrimitive = nonNullElements.find(
        el => typeof el !== 'object' || el === null
      );
      if (firstPrimitive !== undefined || subKeys.length === 0) {
        const primInferred = inferFieldTypeAndMode(path, firstPrimitive ?? '');
        subKeys.unshift({
          key: '.',
          label: 'Item Value (.)',
          shortLabel,
          isNested: false,
          isArray: false,
          inferredType:
            primInferred.fieldType === 'array' ? 'text' : primInferred.fieldType,
          inferredTextMode: primInferred.textMode,
          inferredUrlMode: primInferred.urlMode,
          sampleValue: firstPrimitive,
          samplePreview: formatSamplePreview(firstPrimitive),
        });
      }
    }

    const mediaUrls = isArray ? entryMediaValues(sample) : [];
    const inferredMultipleMedia =
      isArray &&
      mediaUrls.length > 0 &&
      (sample as unknown[]).every(
        v => typeof v === 'string' && isLikelyImageUrl(v, path)
      );

    return {
      key: path,
      label: `${human} (${path})`,
      shortLabel,
      isNested: path.includes('.'),
      isArray,
      ...(isArray ? { isArrayOfObjects } : {}),
      inferredType: inferred.fieldType,
      inferredTextMode: inferred.textMode,
      inferredUrlMode: inferred.urlMode,
      inferredMultipleMedia,
      sampleValue: sample,
      samplePreview: formatSamplePreview(sample),
      ...(subKeys ? { subKeys } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Payload Array Extraction & Post Option List Builder
// ---------------------------------------------------------------------------

const COMMON_ARRAY_PATHS = [
  'items',
  'data',
  'posts',
  'results',
  'products',
  'users',
  'entries',
  'records',
  'nodes',
  'articles',
  'videos',
  'comments',
  'data.items',
  'data.posts',
  'data.results',
];

/**
 * Extracts raw object items from an API JSON response, supporting explicit
 * `itemsPath`, auto-detected array wrappers when `itemsPath` is blank, or
 * wrapping a single JSON object as a 1-item list.
 */
export function extractExternalApiPostsList(
  payload: unknown,
  itemsPathOrOpts:
    | string
    | { itemsPath?: string; idKey?: string; titleKey?: string } = '',
  idKeyArg = 'id',
  titleKeyArg = 'title'
): {
  rawItems: Record<string, unknown>[];
  postOptions: ExternalApiPreviewPostOption[];
  detectedItemsPath: string;
} {
  const itemsPath =
    typeof itemsPathOrOpts === 'string'
      ? itemsPathOrOpts
      : (itemsPathOrOpts?.itemsPath ?? '');
  const idKey =
    typeof itemsPathOrOpts === 'object' && itemsPathOrOpts !== null
      ? (itemsPathOrOpts.idKey ?? idKeyArg)
      : idKeyArg;
  const titleKey =
    typeof itemsPathOrOpts === 'object' && itemsPathOrOpts !== null
      ? (itemsPathOrOpts.titleKey ?? titleKeyArg)
      : titleKeyArg;
  const trimmedPath = itemsPath.trim();
  let extracted: unknown = trimmedPath
    ? extractNestedValue(payload, trimmedPath)
    : payload;
  let detectedItemsPath = trimmedPath;

  if (
    !trimmedPath &&
    !Array.isArray(extracted) &&
    extracted &&
    typeof extracted === 'object'
  ) {
    const obj = extracted as Record<string, unknown>;
    for (const candidate of COMMON_ARRAY_PATHS) {
      const candidateVal = extractNestedValue(obj, candidate);
      if (Array.isArray(candidateVal)) {
        extracted = candidateVal;
        detectedItemsPath = candidate;
        break;
      }
    }
    if (!Array.isArray(extracted) && Object.keys(obj).length > 0) {
      extracted = [obj];
    }
  } else if (
    trimmedPath &&
    !Array.isArray(extracted) &&
    extracted &&
    typeof extracted === 'object'
  ) {
    extracted = [extracted];
  }

  if (!Array.isArray(extracted)) {
    return { rawItems: [], postOptions: [], detectedItemsPath };
  }

  const rawItems = extracted.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object' && !Array.isArray(item))
  );

  const postOptions: ExternalApiPreviewPostOption[] = rawItems.map(
    (item, idx) => {
      const rawId =
        extractNestedValue(item, idKey || 'id') ??
        item.id ??
        item._id ??
        item.uuid ??
        item.slug ??
        String(idx + 1);
      const id = String(rawId);

      const rawTitle =
        extractNestedValue(item, titleKey || 'title') ??
        item.title ??
        item.name ??
        item.label ??
        item.headline ??
        item.subject ??
        item.username ??
        item.email ??
        `Item ${idx + 1}`;
      const title = String(rawTitle);

      const formatted = `#${id} — ${title}`;
      return {
        id,
        title: formatted,
        label: formatted,
        raw: item,
      };
    }
  );

  return { rawItems, postOptions, detectedItemsPath };
}

// ---------------------------------------------------------------------------
// Builder Field & View Type Validation (Video, Embed, URL, Number, Date)
// ---------------------------------------------------------------------------

export interface ExternalFieldValidationResult {
  valid: boolean;
  error: string | null;
  warning: string | null;
}

/**
 * Validates a mapped field's value against its selected `fieldType` and dynamic
 * view mode (`textMode`: plain/video/embed, `urlMode`: other/video, `media`, etc.)
 * using the same validators as `/dashboard/collections/[slug]/settings`.
 */
export function validateExternalApiFieldMapping(
  mapping: ExternalApiFieldMapping | ExternalApiNestedFieldMapping,
  rawValueOrParent: unknown
): ExternalFieldValidationResult {
  const rawValue =
    rawValueOrParent !== null &&
    rawValueOrParent !== undefined &&
    typeof rawValueOrParent === 'object' &&
    !Array.isArray(rawValueOrParent) &&
    mapping.key &&
    mapping.key !== '.' &&
    (mapping.key in (rawValueOrParent as Record<string, unknown>) ||
      extractNestedValue(rawValueOrParent, mapping.key) !== undefined)
      ? extractNestedValue(rawValueOrParent, mapping.key)
      : rawValueOrParent;
  const fieldType = mapping.fieldType ?? 'text';
  const textMode: TextFieldMode = mapping.textMode ?? 'plain';
  const urlMode: UrlFieldMode = mapping.urlMode ?? 'other';

  const isEmpty =
    rawValue === null ||
    rawValue === undefined ||
    (typeof rawValue === 'string' && rawValue.trim() === '') ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  if (
    (fieldType === 'text' && textMode === 'video') ||
    (fieldType === 'url' && urlMode === 'video')
  ) {
    if (isEmpty) {
      return {
        valid: false,
        error: null,
        warning: 'No video URL found on the selected post for this key.',
      };
    }
    const str =
      typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
    if (!parseVideoUrl(str)) {
      return {
        valid: false,
        error: VIDEO_URL_ERROR,
        warning: null,
      };
    }
    return { valid: true, error: null, warning: null };
  }

  if (fieldType === 'text' && textMode === 'embed') {
    if (isEmpty) {
      return {
        valid: false,
        error: null,
        warning:
          'No embed URL or <iframe> snippet found on the selected post for this key.',
      };
    }
    const str =
      typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
    if (!isValidEmbedUrl(str)) {
      return {
        valid: false,
        error: EMBED_URL_ERROR,
        warning: null,
      };
    }
    return { valid: true, error: null, warning: null };
  }

  if (fieldType === 'url' && urlMode === 'other') {
    if (isEmpty) {
      return {
        valid: true,
        error: null,
        warning: 'No URL value on the selected post for this key.',
      };
    }
    const str =
      typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
    if (!isValidGeneralUrl(str)) {
      return {
        valid: false,
        error: GENERAL_URL_ERROR,
        warning: null,
      };
    }
    return { valid: true, error: null, warning: null };
  }

  if (fieldType === 'media') {
    if (isEmpty) {
      return {
        valid: true,
        error: null,
        warning: 'No image/media URL on the selected post for this key.',
      };
    }
    const urls = entryMediaValues(rawValue);
    if (urls.length === 0 && typeof rawValue === 'string') {
      const str = rawValue.trim();
      if (str && !isValidGeneralUrl(str)) {
        return {
          valid: false,
          error:
            'Media field expects a valid image http(s):// URL or /relative path.',
          warning: null,
        };
      }
    } else if (urls.some(u => !isValidGeneralUrl(u))) {
      return {
        valid: false,
        error:
          'One or more media URLs are not valid http(s):// URLs or /relative paths.',
        warning: null,
      };
    }
    return { valid: true, error: null, warning: null };
  }

  if (fieldType === 'number' && !isEmpty) {
    const n = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (Number.isNaN(n)) {
      return {
        valid: false,
        error: `Expected a numeric value, but got "${String(rawValue).slice(0, 32)}".`,
        warning: null,
      };
    }
  }

  if (fieldType === 'date' && !isEmpty) {
    const d = new Date(String(rawValue));
    if (Number.isNaN(d.getTime())) {
      return {
        valid: false,
        error: `Expected a valid date string, but got "${String(rawValue).slice(0, 32)}".`,
        warning: null,
      };
    }
  }

  if (fieldType === 'array' && !isEmpty) {
    if (!Array.isArray(rawValue)) {
      return {
        valid: false,
        error: `Expected an array at key "${mapping.key}", but got ${typeof rawValue}.`,
        warning: null,
      };
    }
    const nestedFields = (
      mapping as ExternalApiFieldMapping
    ).nestedFields;
    if (Array.isArray(nestedFields) && rawValue.length > 0) {
      const firstItem = rawValue[0];
      for (const nf of nestedFields) {
        const subVal = extractNestedValue(firstItem, nf.key || '.');
        const subRes = validateExternalApiFieldMapping(nf, subVal);
        if (!subRes.valid && subRes.error) {
          return {
            valid: false,
            error: `Nested field "${nf.key}": ${subRes.error}`,
            warning: null,
          };
        }
      }
    }
  }

  return { valid: true, error: null, warning: null };
}

// ---------------------------------------------------------------------------
// Field Metadata Conversion for NormalizedListingItem & LoopPreviewProvider
// ---------------------------------------------------------------------------

export function buildFieldMetaFromApiFields(
  apiFields?: ExternalApiFieldMapping[],
  discoveredKeys?: DiscoveredApiKey[]
): Record<
  string,
  { label: string; type: string; config: Record<string, unknown> }
> {
  const meta: Record<
    string,
    { label: string; type: string; config: Record<string, unknown> }
  > = {};

  if (Array.isArray(discoveredKeys)) {
    for (const k of discoveredKeys) {
      meta[k.key] = {
        label: k.shortLabel || humanizeApiKeyPath(k.key),
        type: k.inferredType,
        config: {
          ...(k.inferredTextMode ? { textMode: k.inferredTextMode } : {}),
          ...(k.inferredUrlMode ? { urlMode: k.inferredUrlMode } : {}),
          ...(k.inferredMultipleMedia ? { multiple: true } : {}),
        },
      };
    }
  }

  if (Array.isArray(apiFields)) {
    for (const f of apiFields) {
      if (!f || !f.key) continue;
      meta[f.key] = {
        label: f.label?.trim() || shortLabelForApiKeyPath(f.key),
        type: f.fieldType || 'text',
        config: {
          ...(f.textMode ? { textMode: f.textMode } : {}),
          ...(f.urlMode ? { urlMode: f.urlMode } : {}),
          ...(f.multiple !== undefined ? { multiple: f.multiple } : {}),
          ...(f.isFeatured !== undefined ? { isFeatured: f.isFeatured } : {}),
          ...(f.nestedFields ? { nestedFields: f.nestedFields } : {}),
          ...(f.arrayLayout ? { arrayLayout: f.arrayLayout } : {}),
        },
      };
    }
  }

  return meta;
}

// ---------------------------------------------------------------------------
// External API Query / Filter Params & Response Data Filters
// ---------------------------------------------------------------------------

export const EXTERNAL_API_FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'in', label: 'In (comma-separated)' },
  { value: 'not_empty', label: 'Is not empty' },
] as const;

export type ExternalApiFilterOperator =
  (typeof EXTERNAL_API_FILTER_OPERATORS)[number]['value'];

export interface ExternalApiDataFilter {
  key: string;
  operator: ExternalApiFilterOperator;
  value?: string;
}

/** Appends configured query/filter params to an External API endpoint URL. */
export function applyExternalApiQueryParams(
  endpointUrl: string,
  queryParams?: Record<string, string> | null
): string {
  const trimmed = endpointUrl.trim();
  if (!trimmed || !queryParams || typeof queryParams !== 'object') {
    return trimmed;
  }
  const entries = Object.entries(queryParams).filter(
    ([k, v]) => k.trim().length > 0 && v !== undefined && v !== null && String(v).trim().length > 0
  );
  if (entries.length === 0) return trimmed;
  try {
    const url = new URL(trimmed);
    for (const [k, v] of entries) {
      url.searchParams.set(k.trim(), String(v).trim());
    }
    return url.toString();
  } catch {
    return trimmed;
  }
}

function matchesSingleDataFilter(
  rawItem: Record<string, unknown>,
  filter: ExternalApiDataFilter
): boolean {
  const key = filter.key.trim();
  if (!key) return true;
  const val = extractNestedValue(rawItem, key);
  const op = filter.operator;
  const target = (filter.value ?? '').trim();

  if (op === 'not_empty') {
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    return String(val).trim().length > 0;
  }

  const strVal =
    val === null || val === undefined
      ? ''
      : Array.isArray(val)
        ? val.map(v => String(v ?? '')).join(', ')
        : typeof val === 'object'
          ? JSON.stringify(val)
          : String(val);

  const lowerVal = strVal.toLowerCase();
  const lowerTarget = target.toLowerCase();

  switch (op) {
    case 'equals':
      return lowerVal === lowerTarget;
    case 'not_equals':
      return lowerVal !== lowerTarget;
    case 'contains':
      return lowerVal.includes(lowerTarget);
    case 'not_contains':
      return !lowerVal.includes(lowerTarget);
    case 'starts_with':
      return lowerVal.startsWith(lowerTarget);
    case 'gt': {
      const a = Number(val);
      const b = Number(target);
      return Number.isFinite(a) && Number.isFinite(b) ? a > b : strVal > target;
    }
    case 'lt': {
      const a = Number(val);
      const b = Number(target);
      return Number.isFinite(a) && Number.isFinite(b) ? a < b : strVal < target;
    }
    case 'in': {
      const list = lowerTarget
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (list.length === 0) return true;
      return list.includes(lowerVal);
    }
    default:
      return true;
  }
}

/** Filters raw External API objects against configured data filter rules. */
export function filterExternalApiRawItems<T>(
  items: T[],
  filters?: ExternalApiDataFilter[] | null
): T[] {
  if (!Array.isArray(filters) || filters.length === 0) return items;
  const active = filters.filter(f => f && typeof f.key === 'string' && f.key.trim());
  if (active.length === 0) return items;
  return items.filter(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return active.every(f => matchesSingleDataFilter(record, f));
  });
}
