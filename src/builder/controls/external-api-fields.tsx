'use client';

import { inputStyle, useEditorStore } from '@nextcms/builder-react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { TextFieldMode, UrlFieldMode } from '@/config/post-types';
import {
  type DiscoveredApiKey,
  EXTERNAL_API_FIELD_TYPE_OPTIONS,
  EXTERNAL_API_NESTED_FIELD_TYPE_OPTIONS,
  type ExternalApiArrayLayout,
  type ExternalApiFieldMapping,
  type ExternalApiFieldType,
  type ExternalApiNestedFieldMapping,
  type ExternalApiPreviewPostOption,
  extractNestedValue,
  shortLabelForApiKeyPath,
  validateExternalApiFieldMapping,
} from '@/lib/external-api-schema';
import { cn } from '@/lib/utils/cn';
import { PAGES } from '@/config/pages';
import {
  listExternalApisAction,
} from '@/server/actions/external-api.actions';
import { inspectExternalApiAction } from '@/server/actions/listing.actions';
import { LOOP_GALLERY_VIEW_OPTIONS } from '../blocks/loop-item-field';
import { LOOP_DATE_FORMAT_OPTIONS } from '../blocks/loop-shared';
import {
  EXT_FILTER_STYLES,
  type ExtFilterStyle,
  isExtFilterStyle,
} from '@/lib/external-api-visitor-filters';
import { inheritTargetLoopApi } from '../query-filter-target';
import { useEditorBridge } from './editor-bridge';
import { OverlaySelect } from './overlay-picker';
import { Switcher } from './primitives';

// ---------------------------------------------------------------------------
// Shared Inspection Cache for External API in Builder
// ---------------------------------------------------------------------------

type InspectionResult = {
  ok: boolean;
  error?: string;
  postOptions: ExternalApiPreviewPostOption[];
  keys: DiscoveredApiKey[];
  detectedItemsPath: string;
  totalItems: number;
};

const inspectCache = new Map<string, Promise<InspectionResult>>();
const inspectListeners = new Set<() => void>();

function buildInspectCacheKey(props?: Record<string, unknown>): string {
  const endpointUrl =
    typeof props?.apiEndpointUrl === 'string'
      ? props.apiEndpointUrl.trim()
      : '';
  const method = props?.apiMethod === 'POST' ? 'POST' : 'GET';
  const body = typeof props?.apiBody === 'string' ? props.apiBody : '';
  const itemsPath =
    typeof props?.apiItemsPath === 'string' ? props.apiItemsPath.trim() : '';
  const idKey =
    typeof props?.apiFieldId === 'string' ? props.apiFieldId.trim() : 'id';
  const titleKey =
    typeof props?.apiFieldTitle === 'string'
      ? props.apiFieldTitle.trim()
      : 'title';
  const headers =
    props?.apiHeaders && typeof props.apiHeaders === 'object'
      ? (props.apiHeaders as Record<string, string>)
      : {};
  const queryParams =
    props?.apiQueryParams && typeof props.apiQueryParams === 'object'
      ? (props.apiQueryParams as Record<string, string>)
      : {};
  return JSON.stringify({
    endpointUrl,
    method,
    headers,
    queryParams,
    body,
    itemsPath,
    idKey,
    titleKey,
  });
}

export function useExternalApiInspection(props?: Record<string, unknown>) {
  const { selectedProps, selectedType, targetLoopProps } = useEditorBridge();
  // A Query Filter with no API of its own inspects its target loop's API.
  const effectiveProps = useMemo(() => {
    if (props) return props;
    if (selectedType !== 'QueryFilter' || !selectedProps) return selectedProps;
    return inheritTargetLoopApi(
      selectedProps,
      targetLoopProps
        ? { id: '', type: 'LoopGrid', props: targetLoopProps }
        : undefined
    );
  }, [props, selectedProps, selectedType, targetLoopProps]);
  const endpointUrl =
    typeof effectiveProps?.apiEndpointUrl === 'string'
      ? effectiveProps.apiEndpointUrl.trim()
      : '';
  const method =
    effectiveProps?.apiMethod === 'POST' ? ('POST' as const) : ('GET' as const);
  const body =
    typeof effectiveProps?.apiBody === 'string' ? effectiveProps.apiBody : '';
  const itemsPath =
    typeof effectiveProps?.apiItemsPath === 'string'
      ? effectiveProps.apiItemsPath.trim()
      : '';
  const idKey =
    typeof effectiveProps?.apiFieldId === 'string'
      ? effectiveProps.apiFieldId.trim()
      : 'id';
  const titleKey =
    typeof effectiveProps?.apiFieldTitle === 'string'
      ? effectiveProps.apiFieldTitle.trim()
      : 'title';
  const timeoutMs =
    typeof effectiveProps?.apiTimeoutMs === 'number'
      ? effectiveProps.apiTimeoutMs
      : 5000;

  const cacheKey = useMemo(
    () => buildInspectCacheKey(effectiveProps),
    [effectiveProps]
  );

  const [state, setState] = useState<{
    loading: boolean;
    data: InspectionResult | null;
  }>({ loading: false, data: null });
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const listener = () => setReloadTick(t => t + 1);
    inspectListeners.add(listener);
    return () => {
      inspectListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!endpointUrl) {
      setState({ loading: false, data: null });
      return;
    }

    let active = true;
    setState(prev => ({ ...prev, loading: true }));

    const timer = setTimeout(() => {
      let req = inspectCache.get(cacheKey);
      if (!req) {
        const headers =
          effectiveProps?.apiHeaders &&
          typeof effectiveProps.apiHeaders === 'object'
            ? (effectiveProps.apiHeaders as Record<string, string>)
            : undefined;
        const queryParams =
          effectiveProps?.apiQueryParams &&
          typeof effectiveProps.apiQueryParams === 'object'
            ? (effectiveProps.apiQueryParams as Record<string, string>)
            : undefined;
        const presetId =
          typeof effectiveProps?.apiPresetId === 'string' &&
          effectiveProps.apiPresetId.trim()
            ? effectiveProps.apiPresetId.trim()
            : undefined;
        req = inspectExternalApiAction({
          ...(presetId ? { presetId } : {}),
          endpointUrl,
          method,
          headers,
          queryParams,
          body,
          itemsPath,
          idKey,
          titleKey,
          timeoutMs,
        })
          .then((res): InspectionResult => {
            if (res && 'ok' in res) return res;
            const errMsg =
              res && 'error' in res && typeof res.error === 'string'
                ? res.error
                : 'Failed to inspect API';
            return {
              ok: false,
              error: errMsg,
              postOptions: [],
              keys: [],
              detectedItemsPath: '',
              totalItems: 0,
            };
          })
          .catch(err => ({
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to inspect API',
            postOptions: [],
            keys: [],
            detectedItemsPath: '',
            totalItems: 0,
          }));
        inspectCache.set(cacheKey, req);
      }
      req.then(res => {
        if (active) {
          setState({ loading: false, data: res });
        }
      });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    cacheKey,
    endpointUrl,
    method,
    body,
    itemsPath,
    idKey,
    titleKey,
    timeoutMs,
    reloadTick,
  ]);

  const refresh = useCallback(() => {
    inspectCache.delete(cacheKey);
    for (const l of inspectListeners) l();
  }, [cacheKey]);

  const selectedItemId =
    typeof effectiveProps?.apiSelectedItemId === 'string'
      ? effectiveProps.apiSelectedItemId.trim()
      : '';

  const activePost = useMemo(() => {
    const posts = state.data?.postOptions ?? [];
    if (!posts.length) return null;
    if (selectedItemId) {
      return posts.find(p => p.id === selectedItemId) ?? posts[0] ?? null;
    }
    return posts[0] ?? null;
  }, [state.data?.postOptions, selectedItemId]);

  return {
    loading: state.loading,
    data: state.data,
    activePost,
    selectedItemId,
    refresh,
    endpointUrl,
  };
}

// ---------------------------------------------------------------------------
// 1. Post Option List Selector (`apiSelectedItemId`)
// ---------------------------------------------------------------------------

type CustomControlProps<T> = {
  name: string;
  id: string;
  value: T;
  onChange: (value: T) => void;
  readOnly?: boolean;
  field: { label?: string };
  props?: Record<string, unknown>;
};

export function ExternalApiPostSelectField({
  value,
  onChange,
  field,
  props,
  readOnly,
}: CustomControlProps<string | undefined>) {
  const store = useEditorStore();
  const { loading, data, activePost, refresh, endpointUrl } =
    useExternalApiInspection(props);

  const updateBlockProps = useCallback(
    (patch: Record<string, unknown>) => {
      const sel = store.getState().selection;
      if (sel.length === 1) {
        store.updateProps(sel[0], patch);
      }
    },
    [store]
  );

  const postOptions = data?.postOptions ?? [];
  const selectOptions = useMemo(
    () => [
      {
        value: '__all__',
        label: `All fetched posts (${data?.totalItems ?? postOptions.length})`,
      },
      ...postOptions.map(p => ({
        value: p.id,
        label: p.title,
      })),
    ],
    [postOptions, data?.totalItems]
  );

  const currentVal = value && value.trim() ? value.trim() : '__all__';
  const filterToSelected =
    (props?.apiFilterToSelectedItem as boolean | undefined) !== false;

  return (
    <div className="space-y-2 rounded-lg border border-steel-200/80 bg-steel-50/50 p-2.5 dark:border-dark-300 dark:bg-dark-200/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-steel-700 dark:text-steel-200">
          {field.label || 'Select Post from API'}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={!endpointUrl || loading}
          className="inline-flex items-center gap-1 rounded border border-steel-200 bg-white px-2 py-0.5 text-[11px] font-medium text-steel-700 hover:bg-steel-50 disabled:opacity-50 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-300"
          title="Fetch latest data and keys from External API"
        >
          <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
          {loading ? 'Fetching…' : 'Fetch API'}
        </button>
      </div>

      {!endpointUrl ? (
        <p className="text-[11px] text-steel-500">
          Enter an API Endpoint URL above to fetch posts and map all keys.
        </p>
      ) : data && !data.ok ? (
        <div className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{data.error}</span>
        </div>
      ) : (
        <>
          <SearchableSelect
            size="sm"
            className="text-xs"
            value={currentVal}
            disabled={readOnly || loading || postOptions.length === 0}
            options={selectOptions}
            placeholder={
              loading ? 'Fetching posts from API…' : 'Select a post from API…'
            }
            searchPlaceholder="Search fetched posts…"
            onValueChange={next => {
              const nextId = !next || next === '__all__' ? '' : next;
              onChange(nextId || undefined);
            }}
            aria-label={field.label || 'Select post from API'}
          />

          {value && value !== '__all__' && (
            <Switcher
              label="Display only this selected post on canvas"
              value={filterToSelected}
              onChange={checked =>
                updateBlockProps({ apiFilterToSelectedItem: checked })
              }
            />
          )}

          {data?.ok && (
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-steel-500">
              <span>
                Found <strong>{data.totalItems}</strong> posts ·{' '}
                <strong>{data.keys.length}</strong> mapped keys
                {data.detectedItemsPath
                  ? ` (path: ${data.detectedItemsPath})`
                  : ''}
              </span>
              {activePost && (
                <span className="truncate font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                  Previewing #{activePost.id}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Discovered Key Selector for Core Field Keys (ID, Title, URL, Image, etc.)
// ---------------------------------------------------------------------------

export function ExternalApiKeySelectField({
  value,
  onChange,
  field,
  props,
  readOnly,
}: CustomControlProps<string | undefined>) {
  const { data, activePost } = useExternalApiInspection(props);
  const keys = data?.keys ?? [];

  const options = useMemo(
    () =>
      keys.map(k => {
        const postVal = activePost
          ? extractNestedValue(activePost.raw, k.key)
          : k.sampleValue;
        const preview =
          postVal !== undefined && postVal !== null && typeof postVal !== 'object'
            ? ` — ${String(postVal).slice(0, 28)}`
            : '';
        return {
          value: k.key,
          label: `${k.label}${preview}`,
        };
      }),
    [keys, activePost]
  );

  if (keys.length === 0) {
    return (
      <input
        type="text"
        value={value ?? ''}
        disabled={readOnly}
        onChange={e => onChange(e.target.value || undefined)}
        placeholder="e.g. id, title, address.street"
        style={inputStyle}
        aria-label={field.label}
      />
    );
  }

  return (
    <SearchableSelect
      size="sm"
      className="text-xs"
      value={value || undefined}
      disabled={readOnly}
      options={options}
      placeholder="Choose a mapped key…"
      emptyOptionLabel="None (optional)"
      missingLabel={value}
      searchPlaceholder="Search keys (e.g. address.street)…"
      onValueChange={v => onChange(v || undefined)}
      aria-label={field.label}
    />
  );
}

// ---------------------------------------------------------------------------
// 3. Dynamic View Mode Switches (modeled after /dashboard/collections/[slug]/settings)
// ---------------------------------------------------------------------------

function DynamicViewModeControls({
  item,
  onUpdate,
  isNested = false,
}: {
  item: ExternalApiFieldMapping | ExternalApiNestedFieldMapping;
  onUpdate: (patch: Partial<ExternalApiFieldMapping>) => void;
  isNested?: boolean;
}) {
  const fieldType = item.fieldType ?? 'text';
  const textMode: TextFieldMode = item.textMode ?? 'plain';
  const urlMode: UrlFieldMode = item.urlMode ?? 'other';
  const multiple = Boolean(item.multiple);
  const isFeatured = Boolean(item.isFeatured);

  return (
    <div className="space-y-2.5">
      {/* TEXT FIELD VIEW MODES: Plain text | Video URL | Embed URL */}
      {fieldType === 'text' && (
        <div className="space-y-1.5 rounded-md border border-steel-200/80 bg-steel-50/60 p-2 dark:border-dark-300 dark:bg-dark-200/40">
          <div className="text-[11px] font-medium text-steel-600 dark:text-steel-300">
            Text view mode (single choice)
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'plain', label: 'Plain text' },
                { id: 'video', label: 'Video URL' },
                { id: 'embed', label: 'Embed URL' },
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdate({ textMode: opt.id })}
                className={cn(
                  'rounded px-2 py-1 text-[11px] font-medium transition',
                  textMode === opt.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'border border-steel-200 bg-white text-steel-600 hover:bg-steel-50 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {textMode === 'plain' && (
            <div className="grid gap-2 pt-1">
              <div>
                <label className="mb-1 block text-[11px] text-steel-500">
                  Text size / Heading
                </label>
                <select
                  value={item.textSize ?? 'auto'}
                  onChange={e =>
                    onUpdate({
                      textSize: e.target
                        .value as ExternalApiFieldMapping['textSize'],
                    })
                  }
                  style={inputStyle}
                >
                  <option value="auto">Auto (Smart text)</option>
                  <option value="h1">Heading 1 (Hero Title)</option>
                  <option value="h2">Heading 2 (Section Title)</option>
                  <option value="h3">Heading 3 (Card Title)</option>
                  <option value="lead">Lead (Large text)</option>
                  <option value="body">Body (Regular text)</option>
                  <option value="small">Small</option>
                </select>
              </div>
              {!isNested && (
                <Switcher
                  label="Link text to item URL"
                  value={Boolean(item.linkToItem)}
                  onChange={linkToItem => onUpdate({ linkToItem })}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* URL FIELD VIEW MODES: Video URL | Other URL */}
      {fieldType === 'url' && (
        <div className="space-y-2 rounded-md border border-steel-200/80 bg-steel-50/60 p-2 dark:border-dark-300 dark:bg-dark-200/40">
          <div className="text-[11px] font-medium text-steel-600 dark:text-steel-300">
            URL view mode (single choice)
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { id: 'other', label: 'Other URL (Link / Button)' },
                { id: 'video', label: 'Video URL (Player)' },
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdate({ urlMode: opt.id })}
                className={cn(
                  'rounded px-2 py-1 text-[11px] font-medium transition',
                  urlMode === opt.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'border border-steel-200 bg-white text-steel-600 hover:bg-steel-50 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {urlMode === 'other' && (
            <div className="grid gap-2 pt-1">
              <div>
                <label className="mb-1 block text-[11px] text-steel-500">
                  URL display style
                </label>
                <select
                  value={item.urlDisplay ?? 'link'}
                  onChange={e =>
                    onUpdate({
                      urlDisplay: e.target
                        .value as ExternalApiFieldMapping['urlDisplay'],
                    })
                  }
                  style={inputStyle}
                >
                  <option value="link">Clickable link</option>
                  <option value="button">Button</option>
                  <option value="text">Plain URL text</option>
                </select>
              </div>
              {item.urlDisplay !== 'text' && (
                <>
                  <div>
                    <label className="mb-1 block text-[11px] text-steel-500">
                      Link / button text (optional)
                    </label>
                    <input
                      type="text"
                      value={item.urlLinkText ?? ''}
                      onChange={e => onUpdate({ urlLinkText: e.target.value })}
                      placeholder="Uses URL or label when empty"
                      style={inputStyle}
                    />
                  </div>
                  <Switcher
                    label="Open in new tab"
                    value={item.urlNewTab !== false}
                    onChange={urlNewTab => onUpdate({ urlNewTab })}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* MEDIA FIELD VIEW MODES: Multiple image upload (Gallery) | Featured image */}
      {fieldType === 'media' && (
        <div className="space-y-2 rounded-md border border-steel-200/80 bg-steel-50/60 p-2 dark:border-dark-300 dark:bg-dark-200/40">
          <div className="text-[11px] font-medium text-steel-600 dark:text-steel-300">
            Media view mode
          </div>
          <Switcher
            label="Multiple image gallery"
            value={multiple}
            onChange={checked =>
              onUpdate({
                multiple: checked,
                isFeatured: checked ? false : item.isFeatured,
              })
            }
          />
          <Switcher
            label="Featured image (single)"
            value={isFeatured || !multiple}
            onChange={checked =>
              onUpdate({
                isFeatured: checked,
                multiple: checked ? false : item.multiple,
              })
            }
          />

          {multiple ? (
            <div className="grid gap-2 pt-1">
              <div>
                <label className="mb-1 block text-[11px] text-steel-500">
                  Gallery view style
                </label>
                <select
                  value={item.galleryViewMode ?? 'featured-slider'}
                  onChange={e => onUpdate({ galleryViewMode: e.target.value })}
                  style={inputStyle}
                >
                  {LOOP_GALLERY_VIEW_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-steel-500">
                  Gallery aspect ratio
                </label>
                <select
                  value={item.galleryAspect ?? 'wide'}
                  onChange={e =>
                    onUpdate({
                      galleryAspect: e.target
                        .value as ExternalApiFieldMapping['galleryAspect'],
                    })
                  }
                  style={inputStyle}
                >
                  <option value="wide">Wide (16:9)</option>
                  <option value="landscape">Landscape (4:3)</option>
                  <option value="square">Square (1:1)</option>
                  <option value="portrait">Portrait (3:4)</option>
                  <option value="tall">Tall (4:5)</option>
                  <option value="auto">Auto (Smart)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="pt-1">
              <label className="mb-1 block text-[11px] text-steel-500">
                Image aspect ratio
              </label>
              <select
                value={item.imageAspect ?? 'video'}
                onChange={e =>
                  onUpdate({
                    imageAspect: e.target
                      .value as ExternalApiFieldMapping['imageAspect'],
                  })
                }
                style={inputStyle}
              >
                <option value="video">Video (16:9)</option>
                <option value="landscape">Landscape (4:3)</option>
                <option value="square">Square (1:1)</option>
                <option value="portrait">Portrait (3:4)</option>
                <option value="wide">Wide (21:9)</option>
                <option value="auto">Original (Auto)</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* VIDEO / MEDIA POPUP & OVERLAY CONTROLS */}
      {(fieldType === 'media' ||
        (fieldType === 'text' && textMode === 'video') ||
        (fieldType === 'url' && urlMode === 'video')) && (
        <div className="space-y-1.5 pt-0.5">
          <Switcher
            label="Open popup/drawer on click"
            value={Boolean(item.popupTrigger)}
            onChange={popupTrigger => onUpdate({ popupTrigger })}
          />
          {item.popupTrigger && (
            <div className="space-y-1.5 pl-1">
              <OverlaySelect
                value={item.overlayId}
                onChange={overlayId => onUpdate({ overlayId })}
                ariaLabel="Popup / Drawer"
              />
              {((fieldType === 'text' && textMode === 'video') ||
                (fieldType === 'url' && urlMode === 'video')) && (
                <input
                  type="url"
                  value={item.posterUrl ?? ''}
                  onChange={e => onUpdate({ posterUrl: e.target.value })}
                  placeholder="Poster image URL (optional)"
                  style={inputStyle}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* RICHTEXT OPTIONS */}
      {fieldType === 'richtext' && (
        <div className="grid gap-2 rounded-md border border-steel-200/80 bg-steel-50/60 p-2 dark:border-dark-300 dark:bg-dark-200/40">
          <div>
            <label className="mb-1 block text-[11px] text-steel-500">
              Line clamp / Max lines
            </label>
            <select
              value={item.maxLines ?? 'none'}
              onChange={e =>
                onUpdate({
                  maxLines: e.target
                    .value as ExternalApiFieldMapping['maxLines'],
                })
              }
              style={inputStyle}
            >
              <option value="none">Full content (no limit)</option>
              <option value="2">2 lines</option>
              <option value="3">3 lines</option>
              <option value="4">4 lines</option>
              <option value="6">6 lines</option>
            </select>
          </div>
          <Switcher
            label="Plain text only (strip HTML)"
            value={Boolean(item.stripHtml)}
            onChange={stripHtml => onUpdate({ stripHtml })}
          />
        </div>
      )}

      {/* DATE OPTIONS */}
      {fieldType === 'date' && (
        <div className="grid gap-2 rounded-md border border-steel-200/80 bg-steel-50/60 p-2 dark:border-dark-300 dark:bg-dark-200/40">
          <div>
            <label className="mb-1 block text-[11px] text-steel-500">
              Date format
            </label>
            <select
              value={item.dateFormat ?? 'medium'}
              onChange={e =>
                onUpdate({
                  dateFormat: e.target
                    .value as ExternalApiFieldMapping['dateFormat'],
                })
              }
              style={inputStyle}
            >
              {LOOP_DATE_FORMAT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-steel-500">
              Date prefix (optional)
            </label>
            <input
              type="text"
              value={item.datePrefix ?? ''}
              onChange={e => onUpdate({ datePrefix: e.target.value })}
              placeholder="e.g. Published on "
              style={inputStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Validation & Live Value Feedback Banner
// ---------------------------------------------------------------------------

function FieldValidationNotice({
  mapping,
  rawValue,
}: {
  mapping: ExternalApiFieldMapping | ExternalApiNestedFieldMapping;
  rawValue: unknown;
}) {
  const validation = useMemo(
    () => validateExternalApiFieldMapping(mapping, rawValue),
    [mapping, rawValue]
  );

  const isVideoMode =
    (mapping.fieldType === 'text' && mapping.textMode === 'video') ||
    (mapping.fieldType === 'url' && mapping.urlMode === 'video');
  const isEmbedMode =
    mapping.fieldType === 'text' && mapping.textMode === 'embed';
  const isUrlMode =
    mapping.fieldType === 'url' && (mapping.urlMode ?? 'other') === 'other';

  const previewText = useMemo(() => {
    if (rawValue === undefined || rawValue === null) return 'empty / null';
    if (Array.isArray(rawValue)) return `Array (${rawValue.length} items)`;
    if (typeof rawValue === 'object') return JSON.stringify(rawValue).slice(0, 60);
    return String(rawValue).slice(0, 70);
  }, [rawValue]);

  return (
    <div className="space-y-1.5 text-[11px]">
      <div className="flex items-center justify-between gap-2 rounded bg-steel-100/80 px-2 py-1 text-steel-600 dark:bg-dark-200 dark:text-steel-300">
        <span className="shrink-0 font-medium">Selected post value:</span>
        <code className="truncate font-mono text-[10px]">{previewText}</code>
      </div>

      {validation.error && (
        <div
          role="alert"
          className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{validation.error}</span>
        </div>
      )}

      {!validation.error && validation.warning && (
        <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{validation.warning}</span>
        </div>
      )}

      {!validation.error &&
        !validation.warning &&
        (isVideoMode || isEmbedMode || isUrlMode) &&
        rawValue !== undefined &&
        rawValue !== null &&
        String(rawValue).trim() !== '' && (
          <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span>
              {isVideoMode
                ? 'Valid Video URL for player'
                : isEmbedMode
                  ? 'Valid Embed URL / iframe'
                  : 'Valid URL'}
            </span>
          </div>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Nested Array Multi-Repeatable System (`nestedFields`)
// ---------------------------------------------------------------------------

function NestedArrayFieldsRepeater({
  parentField,
  subKeys,
  arraySampleValue,
  onChange,
  readOnly,
}: {
  parentField: ExternalApiFieldMapping;
  subKeys: DiscoveredApiKey[];
  arraySampleValue: unknown;
  onChange: (nextNested: ExternalApiNestedFieldMapping[]) => void;
  readOnly?: boolean;
}) {
  const nestedFields = Array.isArray(parentField.nestedFields)
    ? parentField.nestedFields
    : [];
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const firstElement = useMemo(() => {
    if (Array.isArray(arraySampleValue) && arraySampleValue.length > 0) {
      return arraySampleValue[0];
    }
    return undefined;
  }, [arraySampleValue]);

  const updateNested = (
    idx: number,
    patch: Partial<ExternalApiNestedFieldMapping>
  ) => {
    onChange(
      nestedFields.map((nf, i) => (i === idx ? { ...nf, ...patch } : nf))
    );
  };

  const removeNested = (idx: number) => {
    onChange(nestedFields.filter((_, i) => i !== idx));
  };

  const moveNested = (from: number, to: number) => {
    const copy = [...nestedFields];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    onChange(copy);
    setOpenIdx(to);
  };

  const addNestedField = () => {
    const defaultSub = subKeys[0];
    const nextItem: ExternalApiNestedFieldMapping = {
      key: defaultSub?.key ?? '.',
      label: defaultSub?.shortLabel ?? 'Item Value',
      showLabel: false,
      fieldType:
        defaultSub && defaultSub.inferredType !== 'array'
          ? defaultSub.inferredType
          : 'text',
      textMode: defaultSub?.inferredTextMode ?? 'plain',
      urlMode: defaultSub?.inferredUrlMode ?? 'other',
      textSize: 'body',
    };
    onChange([...nestedFields, nextItem]);
    setOpenIdx(nestedFields.length);
  };

  const autoMapAllSubKeys = () => {
    const toMap =
      subKeys.length > 1
        ? subKeys.filter(sk => sk.key !== '.')
        : subKeys;
    const mapped: ExternalApiNestedFieldMapping[] = toMap.map(sk => ({
      key: sk.key,
      label: sk.shortLabel,
      showLabel: sk.key !== '.',
      fieldType: sk.inferredType === 'array' ? 'text' : sk.inferredType,
      textMode: sk.inferredTextMode ?? 'plain',
      urlMode: sk.inferredUrlMode ?? 'other',
      multiple: sk.inferredMultipleMedia ?? false,
      textSize: 'body',
    }));
    onChange(mapped);
    setOpenIdx(0);
  };

  const subKeyOptions = useMemo(
    () =>
      subKeys.map(sk => ({
        value: sk.key,
        label: `${sk.label} [${sk.inferredType}]`,
      })),
    [subKeys]
  );

  return (
    <div className="space-y-2 rounded-lg border border-indigo-200/80 bg-indigo-50/30 p-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
          <Layers className="size-3.5" />
          Nested Array Repeatable Fields ({nestedFields.length})
        </span>
        {subKeys.length > 0 && (
          <button
            type="button"
            disabled={readOnly}
            onClick={autoMapAllSubKeys}
            className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-dark-100 dark:text-indigo-300"
          >
            <Sparkles className="size-2.5" />
            Map all sub-keys
          </button>
        )}
      </div>

      {nestedFields.map((nf, idx) => {
        const subRawVal =
          firstElement !== undefined
            ? extractNestedValue(firstElement, nf.key || '.')
            : undefined;
        const isOpen = openIdx === idx;
        const title =
          nf.label?.trim() ||
          shortLabelForApiKeyPath(nf.key) ||
          `Sub-field ${idx + 1}`;

        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: repeatable list order
            key={idx}
            className="rounded-md border border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-100"
          >
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex min-w-0 flex-1 items-center justify-between gap-1.5 text-left text-xs font-medium"
              >
                <span className="truncate">
                  {title}{' '}
                  <span className="font-mono text-[10px] text-steel-400">
                    ({nf.key || '.'} · {nf.fieldType})
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'size-3.5 shrink-0 text-steel-400 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              <button
                type="button"
                disabled={readOnly || idx === 0}
                onClick={() => moveNested(idx, idx - 1)}
                className="rounded p-0.5 text-steel-400 hover:text-steel-700 disabled:opacity-30"
                aria-label="Move nested field up"
              >
                <ArrowUp className="size-3" />
              </button>
              <button
                type="button"
                disabled={readOnly || idx === nestedFields.length - 1}
                onClick={() => moveNested(idx, idx + 1)}
                className="rounded p-0.5 text-steel-400 hover:text-steel-700 disabled:opacity-30"
                aria-label="Move nested field down"
              >
                <ArrowDown className="size-3" />
              </button>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => removeNested(idx)}
                className="rounded p-0.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
                aria-label="Remove nested field"
              >
                <X className="size-3" />
              </button>
            </div>

            {isOpen && (
              <div className="space-y-2.5 border-t border-steel-100 p-2.5 dark:border-dark-300">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-steel-600 dark:text-steel-300">
                    Array Item Sub-Key
                  </label>
                  {subKeyOptions.length > 0 ? (
                    <SearchableSelect
                      size="sm"
                      className="text-xs"
                      value={nf.key || '.'}
                      options={subKeyOptions}
                      missingLabel={nf.key}
                      searchPlaceholder="Search array sub-keys…"
                      onValueChange={nextKey => {
                        if (!nextKey) return;
                        const found = subKeys.find(sk => sk.key === nextKey);
                        updateNested(idx, {
                          key: nextKey,
                          label:
                            found?.shortLabel ??
                            shortLabelForApiKeyPath(nextKey),
                          fieldType:
                            found && found.inferredType !== 'array'
                              ? found.inferredType
                              : nf.fieldType,
                          textMode: found?.inferredTextMode ?? 'plain',
                          urlMode: found?.inferredUrlMode ?? 'other',
                        });
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={nf.key ?? '.'}
                      onChange={e => updateNested(idx, { key: e.target.value })}
                      placeholder=". (primitive) or sub-key e.g. name, author.name"
                      style={inputStyle}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-steel-600 dark:text-steel-300">
                      Field Type
                    </label>
                    <select
                      value={nf.fieldType ?? 'text'}
                      onChange={e =>
                        updateNested(idx, {
                          fieldType: e.target
                            .value as ExternalApiNestedFieldMapping['fieldType'],
                        })
                      }
                      style={inputStyle}
                    >
                      {EXTERNAL_API_NESTED_FIELD_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-steel-600 dark:text-steel-300">
                      Label (optional)
                    </label>
                    <input
                      type="text"
                      value={nf.label ?? ''}
                      onChange={e =>
                        updateNested(idx, { label: e.target.value })
                      }
                      placeholder={shortLabelForApiKeyPath(nf.key)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <Switcher
                  label="Show sub-field label"
                  value={Boolean(nf.showLabel)}
                  onChange={showLabel => updateNested(idx, { showLabel })}
                />

                <DynamicViewModeControls
                  item={nf}
                  onUpdate={patch =>
                    updateNested(
                      idx,
                      patch as Partial<ExternalApiNestedFieldMapping>
                    )
                  }
                  isNested
                />

                <FieldValidationNotice mapping={nf} rawValue={subRawVal} />
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        disabled={readOnly}
        onClick={addNestedField}
        className="inline-flex h-7 w-full items-center justify-center gap-1 rounded border border-dashed border-indigo-300 bg-white/70 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-dark-100 dark:text-indigo-300"
      >
        <Plus className="size-3" /> Add nested array field
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Main Multi-Repeatable External API Content Field Mapping Control
// ---------------------------------------------------------------------------

export function ExternalApiFieldsMapperControl({
  value,
  onChange,
  props,
  readOnly,
}: CustomControlProps<ExternalApiFieldMapping[] | undefined>) {
  const { data, activePost } = useExternalApiInspection(props);
  const discoveredKeys = data?.keys ?? [];
  const fields: ExternalApiFieldMapping[] = Array.isArray(value) ? value : [];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const keyOptions = useMemo(
    () =>
      discoveredKeys.map(k => ({
        value: k.key,
        label: `${k.label} · [${k.isArray ? 'array' : k.inferredType}]`,
      })),
    [discoveredKeys]
  );

  const updateField = (
    index: number,
    patch: Partial<ExternalApiFieldMapping>
  ) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const moveField = (from: number, to: number) => {
    const next = [...fields];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setOpenIndex(to);
  };

  const buildDefaultMappingForKey = useCallback(
    (k?: DiscoveredApiKey): ExternalApiFieldMapping => {
      if (!k) {
        return {
          key: '',
          label: '',
          showLabel: true,
          fieldType: 'text',
          textMode: 'plain',
          textSize: 'auto',
        };
      }
      const isArr = k.isArray || k.inferredType === 'array';
      const defaultSubKeys = k.subKeys ?? [];
      const defaultNested: ExternalApiNestedFieldMapping[] | undefined = isArr
        ? (defaultSubKeys.length > 1
            ? defaultSubKeys.filter(sk => sk.key !== '.').slice(0, 4)
            : defaultSubKeys.slice(0, 1)
          ).map(sk => ({
            key: sk.key,
            label: sk.shortLabel,
            showLabel: sk.key !== '.',
            fieldType: sk.inferredType === 'array' ? 'text' : sk.inferredType,
            textMode: sk.inferredTextMode ?? 'plain',
            urlMode: sk.inferredUrlMode ?? 'other',
            textSize: 'body',
          }))
        : undefined;

      return {
        key: k.key,
        label: k.shortLabel,
        showLabel: k.key !== 'title' && k.key !== 'name',
        fieldType: isArr ? 'array' : k.inferredType,
        textMode: k.inferredTextMode ?? 'plain',
        urlMode: k.inferredUrlMode ?? 'other',
        multiple: k.inferredMultipleMedia ?? false,
        isFeatured: k.inferredType === 'media' && !k.inferredMultipleMedia,
        textSize: k.key === 'title' || k.key === 'name' ? 'h3' : 'auto',
        linkToItem: k.key === 'title' || k.key === 'name',
        ...(isArr
          ? {
              arrayLayout:
                defaultSubKeys.length <= 1 ? 'badges' : ('cards' as const),
              nestedFields: defaultNested,
            }
          : {}),
      };
    },
    []
  );

  const addField = () => {
    const usedKeys = new Set(fields.map(f => f.key));
    const nextDiscovered =
      discoveredKeys.find(k => !usedKeys.has(k.key)) ?? discoveredKeys[0];
    const newItem = buildDefaultMappingForKey(nextDiscovered);
    onChange([...fields, newItem]);
    setOpenIndex(fields.length);
  };

  const mapAllKeys = useCallback(() => {
    if (discoveredKeys.length === 0) return;
    const mapped = discoveredKeys.map(k => buildDefaultMappingForKey(k));
    onChange(mapped);
    setOpenIndex(0);
  }, [discoveredKeys, buildDefaultMappingForKey, onChange]);

  // Auto-map all discovered keys on initial External API setup (when value is still undefined)
  useEffect(() => {
    if (value === undefined && discoveredKeys.length > 0 && !readOnly) {
      mapAllKeys();
    }
  }, [value, discoveredKeys.length, readOnly, mapAllKeys]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-xs font-semibold text-steel-700 dark:text-steel-200">
          Mapped API Fields ({fields.length})
        </span>
        <div className="flex items-center gap-1.5">
          {discoveredKeys.length > 0 && (
            <button
              type="button"
              disabled={readOnly}
              onClick={mapAllKeys}
              className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
              title="Automatically map all discovered keys (including nested objects and arrays)"
            >
              <Sparkles className="size-3" />
              Map all {discoveredKeys.length} keys
            </button>
          )}
          {fields.length > 0 && (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onChange([])}
              className="text-[11px] text-steel-500 hover:text-red-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-steel-200 p-3 text-center text-xs text-steel-500 dark:border-dark-300">
          <p>
            No fields mapped yet. Click <strong>Map all keys</strong> or{' '}
            <strong>Add mapped field</strong> below to map top-level keys,
            nested object keys (e.g. <code>address.street</code>), and
            repeatable arrays with dynamic view types.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((item, idx) => {
            const isOpen = openIndex === idx;
            const discovered = discoveredKeys.find(k => k.key === item.key);
            const rawVal = activePost
              ? extractNestedValue(activePost.raw, item.key)
              : discovered?.sampleValue;
            const validation = validateExternalApiFieldMapping(item, rawVal);
            const rowTitle =
              item.label?.trim() ||
              shortLabelForApiKeyPath(item.key) ||
              `Field ${idx + 1}`;

            const modeBadge =
              item.fieldType === 'text'
                ? `text · ${item.textMode ?? 'plain'}`
                : item.fieldType === 'url'
                  ? `url · ${item.urlMode ?? 'other'}`
                  : item.fieldType === 'media'
                    ? `media · ${item.multiple ? 'gallery' : 'featured'}`
                    : item.fieldType;

            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: repeatable list order
                key={idx}
                className={cn(
                  'rounded-lg border bg-white transition dark:bg-dark-100',
                  validation.error
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-steel-200 dark:border-dark-300'
                )}
              >
                <div className="flex items-center gap-1 px-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-xs font-medium"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                      {validation.error ? (
                        <AlertCircle className="size-3.5 shrink-0 text-red-500" />
                      ) : null}
                      <span className="truncate font-semibold">{rowTitle}</span>
                      {item.key && (
                        <span className="truncate font-mono text-[10px] text-steel-400">
                          ({item.key})
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded bg-steel-100 px-1.5 py-0.5 text-[10px] font-medium text-steel-600 dark:bg-dark-200 dark:text-steel-300">
                        {modeBadge}
                      </span>
                      <ChevronDown
                        className={cn(
                          'size-3.5 text-steel-400 transition-transform',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || idx === 0}
                    onClick={() => moveField(idx, idx - 1)}
                    className="rounded p-1 text-steel-400 hover:text-steel-700 disabled:opacity-30"
                    aria-label="Move field up"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || idx === fields.length - 1}
                    onClick={() => moveField(idx, idx + 1)}
                    className="rounded p-1 text-steel-400 hover:text-steel-700 disabled:opacity-30"
                    aria-label="Move field down"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => removeField(idx)}
                    className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-30"
                    aria-label="Remove field"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-3 border-t border-steel-100 p-3 dark:border-dark-300">
                    {/* 1. Key Selection (supports top-level, nested dot-keys like address.street, and array keys) */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-steel-600 dark:text-steel-300">
                        API Key (supports nested e.g. <code>address.street</code>)
                      </label>
                      {keyOptions.length > 0 ? (
                        <SearchableSelect
                          size="sm"
                          className="text-xs"
                          value={item.key || undefined}
                          options={keyOptions}
                          placeholder="Choose a key from API response…"
                          missingLabel={item.key}
                          searchPlaceholder="Search keys (e.g. address.street)…"
                          onValueChange={nextKey => {
                            if (!nextKey) return;
                            const found = discoveredKeys.find(
                              k => k.key === nextKey
                            );
                            if (found) {
                              const auto = buildDefaultMappingForKey(found);
                              updateField(idx, auto);
                            } else {
                              updateField(idx, {
                                key: nextKey,
                                label: shortLabelForApiKeyPath(nextKey),
                              });
                            }
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={item.key ?? ''}
                          onChange={e =>
                            updateField(idx, {
                              key: e.target.value,
                              label:
                                item.label ||
                                shortLabelForApiKeyPath(e.target.value),
                            })
                          }
                          placeholder="e.g. title, address.street, tags"
                          style={inputStyle}
                        />
                      )}
                    </div>

                    {/* 2. Field Type & Custom Label */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-steel-600 dark:text-steel-300">
                          Field Type
                        </label>
                        <select
                          value={item.fieldType ?? 'text'}
                          onChange={e => {
                            const nextType = e.target
                              .value as ExternalApiFieldType;
                            const patch: Partial<ExternalApiFieldMapping> = {
                              fieldType: nextType,
                            };
                            if (
                              nextType === 'array' &&
                              (!item.nestedFields ||
                                item.nestedFields.length === 0)
                            ) {
                              const subKeys = discovered?.subKeys ?? [];
                              patch.arrayLayout =
                                subKeys.length <= 1 ? 'badges' : 'cards';
                              patch.nestedFields = (
                                subKeys.length > 1
                                  ? subKeys.filter(sk => sk.key !== '.')
                                  : subKeys
                              )
                                .slice(0, 4)
                                .map(sk => ({
                                  key: sk.key,
                                  label: sk.shortLabel,
                                  showLabel: sk.key !== '.',
                                  fieldType:
                                    sk.inferredType === 'array'
                                      ? 'text'
                                      : sk.inferredType,
                                  textMode: sk.inferredTextMode ?? 'plain',
                                  urlMode: sk.inferredUrlMode ?? 'other',
                                  textSize: 'body',
                                }));
                            }
                            updateField(idx, patch);
                          }}
                          style={inputStyle}
                        >
                          {EXTERNAL_API_FIELD_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-steel-600 dark:text-steel-300">
                          Display Label
                        </label>
                        <input
                          type="text"
                          value={item.label ?? ''}
                          onChange={e =>
                            updateField(idx, { label: e.target.value })
                          }
                          placeholder={shortLabelForApiKeyPath(item.key)}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <Switcher
                      label="Show field label on card"
                      value={Boolean(item.showLabel)}
                      onChange={showLabel => updateField(idx, { showLabel })}
                    />

                    {/* 3. Dynamic View Type / Mode Controls */}
                    {item.fieldType !== 'array' && (
                      <DynamicViewModeControls
                        item={item}
                        onUpdate={patch => updateField(idx, patch)}
                      />
                    )}

                    {/* 4. Nested Array Repeatable Block when fieldType === 'array' */}
                    {item.fieldType === 'array' && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-steel-600 dark:text-steel-300">
                            Array items layout
                          </label>
                          <select
                            value={item.arrayLayout ?? 'cards'}
                            onChange={e =>
                              updateField(idx, {
                                arrayLayout: e.target
                                  .value as ExternalApiArrayLayout,
                              })
                            }
                            style={inputStyle}
                          >
                            <option value="cards">Cards (Boxed items)</option>
                            <option value="stack">Stacked rows</option>
                            <option value="row">Horizontal row</option>
                            <option value="grid">2-Column Grid</option>
                            <option value="badges">Badges / Pills</option>
                            <option value="list">Bulleted list</option>
                          </select>
                        </div>

                        <NestedArrayFieldsRepeater
                          parentField={item}
                          subKeys={discovered?.subKeys ?? []}
                          arraySampleValue={rawVal}
                          readOnly={readOnly}
                          onChange={nestedFields =>
                            updateField(idx, { nestedFields })
                          }
                        />
                      </div>
                    )}

                    {/* 5. Builder Validation & Live Selected Post Preview */}
                    <FieldValidationNotice mapping={item} rawValue={rawVal} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={readOnly}
        onClick={addField}
        className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-steel-300 bg-white text-xs font-medium text-steel-700 hover:bg-steel-50 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-200"
      >
        <Plus className="size-3.5" /> Add mapped field
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. Reusable Saved External API Preset Selector (`apiPresetId`)
// ---------------------------------------------------------------------------

import type { ExternalApiRecord } from '@/db/schemas/external-apis.schema';

export function ExternalApiPresetSelectField({
  value,
  onChange,
  field,
  readOnly,
}: CustomControlProps<string | undefined>) {
  const store = useEditorStore();
  const [presets, setPresets] = useState<ExternalApiRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPresets = useCallback(() => {
    setLoading(true);
    listExternalApisAction({})
      .then(rows => setPresets(Array.isArray(rows) ? rows : []))
      .catch(() => setPresets([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const options = useMemo(
    () => [
      { value: '__custom__', label: 'Custom (configure below)' },
      ...presets.map(p => ({
        value: p.id,
        label: `${p.name} (${p.method} · ${p.fields?.length ?? 0} fields)`,
      })),
    ],
    [presets]
  );

  const applyPreset = (presetId: string | undefined) => {
    if (!presetId || presetId === '__custom__') {
      onChange(undefined);
      return;
    }
    const preset = presets.find(p => p.id === presetId);
    onChange(presetId);
    if (!preset) return;
    const sel = store.getState().selection;
    if (sel.length === 1) {
      store.updateProps(sel[0], {
        apiPresetId: preset.id,
        apiEndpointUrl: preset.endpointUrl,
        apiMethod: preset.method === 'POST' ? 'POST' : 'GET',
        apiHeaders: preset.headers ?? {},
        apiQueryParams: preset.queryParams ?? {},
        apiDataFilters: Array.isArray(preset.dataFilters)
          ? preset.dataFilters
          : [],
        apiBody: preset.body ?? '',
        apiItemsPath: preset.itemsPath ?? '',
        apiTotalPath: preset.totalPath ?? '',
        apiSelectedItemId: preset.selectedItemId ?? '',
        apiFilterToSelectedItem: preset.filterToSelectedItem ?? true,
        apiFieldId: preset.fieldId || 'id',
        apiFieldTitle: preset.fieldTitle || 'title',
        apiFieldUrl: preset.fieldUrl ?? '',
        apiFieldExcerpt: preset.fieldExcerpt ?? '',
        apiFieldImage: preset.fieldImage ?? '',
        apiFieldPublishedAt: preset.fieldPublishedAt ?? '',
        apiFields: Array.isArray(preset.fields) ? preset.fields : [],
        apiCacheTtlSeconds: preset.cacheTtlSeconds ?? 60,
        apiTimeoutMs: preset.timeoutMs ?? 4000,
      });
    }
  };

  return (
    <div className="space-y-1.5 rounded-lg border border-steel-200/80 bg-steel-50/50 p-2.5 dark:border-dark-300 dark:bg-dark-200/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-steel-700 dark:text-steel-200">
          {field.label || 'Saved External API'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPresets}
            disabled={loading}
            className="text-[11px] text-steel-500 hover:text-steel-800 hover:underline dark:hover:text-steel-200"
            title="Reload saved External APIs"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <a
            href={PAGES.DASHBOARD.EXTERNAL_API}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Manage APIs ↗
          </a>
        </div>
      </div>

      <SearchableSelect
        size="sm"
        className="text-xs"
        value={value && value.trim() ? value.trim() : '__custom__'}
        disabled={readOnly || loading}
        options={options}
        placeholder={
          loading ? 'Loading saved External APIs…' : 'Choose a saved API…'
        }
        searchPlaceholder="Search saved APIs…"
        onValueChange={applyPreset}
        aria-label={field.label || 'Saved External API'}
      />
    </div>
  );
}

export interface ExternalApiFilterFieldRow {
  key: string;
  label?: string;
  style?: ExtFilterStyle;
}

const EXT_FILTER_STYLE_OPTIONS = EXT_FILTER_STYLES.map(s => ({
  value: s.value,
  label: s.label,
}));

function formatKeyLabel(key: string): string {
  const leaf = key.split('.').pop() || key;
  return leaf
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Inspector control for configuring External API facet/filter fields on QueryFilter / QueryLoop. */
export function ExternalApiFilterFieldsControl({
  value,
  onChange,
  field,
  readOnly,
}: CustomControlProps<ExternalApiFilterFieldRow[] | undefined>) {
  const { loading, data } = useExternalApiInspection();
  const rows = Array.isArray(value) ? value : [];

  const keyOptions = useMemo(() => {
    const discovered = data?.ok ? data.keys : [];
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const item of discovered) {
      const k = typeof item === 'string' ? item : item.key;
      if (k && !seen.has(k)) {
        seen.add(k);
        opts.push({ value: k, label: k });
      }
    }
    for (const r of rows) {
      if (r.key && !seen.has(r.key)) {
        seen.add(r.key);
        opts.push({ value: r.key, label: r.key });
      }
    }
    return opts;
  }, [data, rows]);

  const updateRow = (idx: number, patch: Partial<ExternalApiFilterFieldRow>) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const defaultKey = keyOptions[0]?.value ?? '';
    onChange([
      ...rows,
      {
        key: defaultKey,
        label: defaultKey ? formatKeyLabel(defaultKey) : '',
        style: 'select',
      },
    ]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 rounded-lg border border-steel-200/80 bg-steel-50/50 p-2.5 dark:border-dark-300 dark:bg-dark-200/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-steel-700 dark:text-steel-200">
          {field.label || 'External API Filter Fields'}
        </span>
        <button
          type="button"
          onClick={addRow}
          disabled={readOnly}
          className="rounded border border-steel-300 bg-white px-2 py-0.5 text-[11px] font-medium text-steel-700 hover:bg-steel-100 disabled:opacity-50 dark:border-dark-300 dark:bg-dark-200 dark:text-steel-200 dark:hover:bg-dark-300"
        >
          + Add field
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-steel-500 dark:text-steel-400">
          {loading
            ? 'Inspecting External API keys…'
            : 'Add any API field key (e.g. address.city, company.name) to filter items by its values.'}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="space-y-1.5 rounded border border-steel-200/80 bg-white p-2 dark:border-dark-300 dark:bg-dark-100"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-medium text-steel-500">
                  Filter #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={readOnly}
                  className="text-[11px] text-red-500 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
              {keyOptions.length > 0 ? (
                <SearchableSelect
                  size="sm"
                  className="text-xs"
                  value={row.key}
                  disabled={readOnly}
                  options={keyOptions}
                  placeholder="Select API field key…"
                  searchPlaceholder="Search keys…"
                  onValueChange={nextKey =>
                    updateRow(idx, {
                      key: nextKey ?? '',
                      label:
                        !row.label || row.label === formatKeyLabel(row.key)
                          ? formatKeyLabel(nextKey ?? '')
                          : row.label,
                    })
                  }
                />
              ) : (
                <input
                  type="text"
                  value={row.key}
                  disabled={readOnly}
                  onChange={e => updateRow(idx, { key: e.target.value })}
                  placeholder="Field key (e.g. address.city)"
                  className="h-7 w-full rounded border border-steel-300 bg-white px-2 font-mono text-xs dark:border-dark-300 dark:bg-dark-200"
                />
              )}
              <div className="grid grid-cols-1 gap-1.5">
                <input
                  type="text"
                  value={row.label ?? ''}
                  disabled={readOnly}
                  onChange={e => updateRow(idx, { label: e.target.value })}
                  placeholder="Display label"
                  className="h-7 w-full rounded border border-steel-300 bg-white px-2 text-xs dark:border-dark-300 dark:bg-dark-200"
                />
                <SearchableSelect
                  size="sm"
                  className="text-xs"
                  value={row.style ?? 'select'}
                  disabled={readOnly}
                  options={EXT_FILTER_STYLE_OPTIONS}
                  placeholder="Input type…"
                  searchPlaceholder="Search input types…"
                  onValueChange={next =>
                    updateRow(idx, {
                      style: isExtFilterStyle(next) ? next : 'select',
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
