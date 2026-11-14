'use client';

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Globe,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  ExternalApiFieldsMapperControl,
  ExternalApiKeySelectField,
  useExternalApiInspection,
} from '@/builder/controls/external-api-fields';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ExternalApiRecord } from '@/db/schemas/external-apis.schema';
import {
  EXTERNAL_API_FILTER_OPERATORS,
  type ExternalApiDataFilter,
  type ExternalApiFieldMapping,
  filterExternalApiRawItems,
} from '@/lib/external-api-schema';
import { cn } from '@/lib/utils/cn';
import {
  createExternalApiAction,
  deleteExternalApiAction,
  updateExternalApiAction,
} from '@/server/actions/external-api.actions';

interface HeaderRow {
  key: string;
  value: string;
}

interface DraftApiState {
  id: string | null;
  name: string;
  description: string;
  endpointUrl: string;
  method: 'GET' | 'POST';
  headers: HeaderRow[];
  secrets: HeaderRow[];
  queryParams: HeaderRow[];
  dataFilters: ExternalApiDataFilter[];
  body: string;
  itemsPath: string;
  totalPath: string;
  selectedItemId: string;
  filterToSelectedItem: boolean;
  fieldId: string;
  fieldTitle: string;
  fieldUrl: string;
  fieldExcerpt: string;
  fieldImage: string;
  fieldPublishedAt: string;
  fields: ExternalApiFieldMapping[] | undefined;
  cacheTtlSeconds: number;
  timeoutMs: number;
}

function emptyDraft(): DraftApiState {
  return {
    id: null,
    name: '',
    description: '',
    endpointUrl: '',
    method: 'GET',
    headers: [],
    secrets: [],
    queryParams: [],
    dataFilters: [],
    body: '',
    itemsPath: '',
    totalPath: '',
    selectedItemId: '',
    filterToSelectedItem: true,
    fieldId: 'id',
    fieldTitle: 'title',
    fieldUrl: '',
    fieldExcerpt: '',
    fieldImage: '',
    fieldPublishedAt: '',
    fields: undefined,
    cacheTtlSeconds: 60,
    timeoutMs: 4000,
  };
}

function recordToDraft(rec: ExternalApiRecord): DraftApiState {
  const headerEntries = Object.entries(rec.headers ?? {}).map(([key, value]) => ({
    key,
    value,
  }));
  const secretEntries = Object.entries(rec.secrets ?? {}).map(([key, value]) => ({
    key,
    value,
  }));
  const queryParamEntries = Object.entries(rec.queryParams ?? {}).map(
    ([key, value]) => ({
      key,
      value,
    })
  );
  return {
    id: rec.id,
    name: rec.name,
    description: rec.description ?? '',
    endpointUrl: rec.endpointUrl,
    method: rec.method === 'POST' ? 'POST' : 'GET',
    headers: headerEntries,
    secrets: secretEntries,
    queryParams: queryParamEntries,
    dataFilters: Array.isArray(rec.dataFilters) ? rec.dataFilters : [],
    body: rec.body ?? '',
    itemsPath: rec.itemsPath ?? '',
    totalPath: rec.totalPath ?? '',
    selectedItemId: rec.selectedItemId ?? '',
    filterToSelectedItem: rec.filterToSelectedItem ?? true,
    fieldId: rec.fieldId || 'id',
    fieldTitle: rec.fieldTitle || 'title',
    fieldUrl: rec.fieldUrl ?? '',
    fieldExcerpt: rec.fieldExcerpt ?? '',
    fieldImage: rec.fieldImage ?? '',
    fieldPublishedAt: rec.fieldPublishedAt ?? '',
    fields: Array.isArray(rec.fields) ? rec.fields : [],
    cacheTtlSeconds: rec.cacheTtlSeconds ?? 60,
    timeoutMs: rec.timeoutMs ?? 4000,
  };
}

export function ExternalApiManager({
  initialApis,
}: {
  initialApis: ExternalApiRecord[];
}) {
  const [apis, setApis] = useState<ExternalApiRecord[]>(initialApis);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<DraftApiState>(() =>
    initialApis.length > 0 ? recordToDraft(initialApis[0]) : emptyDraft()
  );
  const [isPending, startTransition] = useTransition();

  const headersRecord = useMemo(() => {
    const out: Record<string, string> = {};
    for (const h of draft.headers) {
      const k = h.key.trim();
      if (k) out[k] = h.value;
    }
    return out;
  }, [draft.headers]);

  const secretsRecord = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of draft.secrets) {
      const k = s.key.trim();
      if (k) out[k] = s.value;
    }
    return out;
  }, [draft.secrets]);

  const queryParamsRecord = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of draft.queryParams) {
      const k = p.key.trim();
      if (k) out[k] = p.value;
    }
    return out;
  }, [draft.queryParams]);

  // Shape compatible with builder external-api-fields controls
  const controlProps = useMemo<Record<string, unknown>>(
    () => ({
      ...(draft.id ? { apiPresetId: draft.id } : {}),
      apiEndpointUrl: draft.endpointUrl,
      apiMethod: draft.method,
      apiHeaders: headersRecord,
      apiQueryParams: queryParamsRecord,
      apiDataFilters: draft.dataFilters,
      apiBody: draft.body,
      apiItemsPath: draft.itemsPath,
      apiTotalPath: draft.totalPath,
      apiSelectedItemId: draft.selectedItemId,
      apiFilterToSelectedItem: draft.filterToSelectedItem,
      apiFieldId: draft.fieldId,
      apiFieldTitle: draft.fieldTitle,
      apiFieldUrl: draft.fieldUrl,
      apiFieldExcerpt: draft.fieldExcerpt,
      apiFieldImage: draft.fieldImage,
      apiFieldPublishedAt: draft.fieldPublishedAt,
      apiFields: draft.fields,
      apiCacheTtlSeconds: draft.cacheTtlSeconds,
      apiTimeoutMs: draft.timeoutMs,
    }),
    [draft, headersRecord, queryParamsRecord]
  );

  const { loading, data, activePost, refresh } =
    useExternalApiInspection(controlProps);

  const filteredPostCount = useMemo(() => {
    const rawList = (data?.postOptions ?? []).map(p => p.raw);
    return filterExternalApiRawItems(rawList, draft.dataFilters).length;
  }, [data?.postOptions, draft.dataFilters]);

  const filterKeyOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const k of data?.keys ?? []) {
      if (!seen.has(k.key)) {
        seen.add(k.key);
        opts.push({ value: k.key, label: k.label });
      }
    }
    for (const f of draft.fields ?? []) {
      if (f.key && !seen.has(f.key)) {
        seen.add(f.key);
        opts.push({ value: f.key, label: f.label || f.key });
      }
    }
    return opts;
  }, [data?.keys, draft.fields]);

  const filteredApis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apis;
    return apis.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        a.endpointUrl.toLowerCase().includes(q)
    );
  }, [apis, search]);

  const postOptions = data?.postOptions ?? [];
  const postSelectOptions = useMemo(
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

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast.error('Please enter a name for this External API.');
      return;
    }
    if (!draft.endpointUrl.trim()) {
      toast.error('Please enter an API Endpoint URL.');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          endpointUrl: draft.endpointUrl.trim(),
          method: draft.method,
          headers: headersRecord,
          secrets: secretsRecord,
          queryParams: queryParamsRecord,
          dataFilters: draft.dataFilters.filter(f => f.key.trim().length > 0),
          body: draft.body || null,
          itemsPath: draft.itemsPath.trim(),
          totalPath: draft.totalPath.trim() || null,
          selectedItemId: draft.selectedItemId.trim() || null,
          filterToSelectedItem: draft.filterToSelectedItem,
          fieldId: draft.fieldId.trim() || 'id',
          fieldTitle: draft.fieldTitle.trim() || 'title',
          fieldUrl: draft.fieldUrl.trim() || null,
          fieldExcerpt: draft.fieldExcerpt.trim() || null,
          fieldImage: draft.fieldImage.trim() || null,
          fieldPublishedAt: draft.fieldPublishedAt.trim() || null,
          fields: draft.fields ?? [],
          cacheTtlSeconds: Number(draft.cacheTtlSeconds) || 60,
          timeoutMs: Number(draft.timeoutMs) || 4000,
        };

        if (draft.id) {
          const updated = await updateExternalApiAction({
            id: draft.id,
            ...payload,
          });
          if (!updated || !('id' in updated)) {
            toast.error(
              updated && 'error' in updated && typeof updated.error === 'string'
                ? updated.error
                : 'Failed to update External API.'
            );
            return;
          }
          setApis(prev => prev.map(a => (a.id === updated.id ? updated : a)));
          setDraft(recordToDraft(updated));
          toast.success(`Updated "${updated.name}"`);
        } else {
          const created = await createExternalApiAction(payload);
          if (!created || !('id' in created)) {
            toast.error(
              created && 'error' in created && typeof created.error === 'string'
                ? created.error
                : 'Failed to create External API.'
            );
            return;
          }
          setApis(prev => [created, ...prev]);
          setDraft(recordToDraft(created));
          toast.success(`Created "${created.name}"`);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to save External API.'
        );
      }
    });
  };

  const handleDelete = (api: ExternalApiRecord) => {
    startTransition(async () => {
      try {
        await deleteExternalApiAction({ id: api.id });
        const remaining = apis.filter(a => a.id !== api.id);
        setApis(remaining);
        if (draft.id === api.id) {
          setDraft(
            remaining.length > 0 ? recordToDraft(remaining[0]) : emptyDraft()
          );
        }
        toast.success(`Deleted "${api.name}"`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete External API.'
        );
      }
    });
  };

  const handleDuplicate = (api: ExternalApiRecord) => {
    const copy = recordToDraft(api);
    copy.id = null;
    copy.name = `${api.name} (Copy)`;
    setDraft(copy);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Sidebar: Saved External APIs List */}
      <div className="space-y-4 lg:col-span-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                Saved External APIs ({apis.length})
              </CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() => setDraft(emptyDraft())}
              >
                <Plus className="size-4" /> New API
              </Button>
            </div>
            <CardDescription>
              Create once and reuse in Query Loop &amp; Loop Grid blocks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 start-2.5 size-4" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search saved APIs…"
                className="ps-8"
              />
            </div>

            {filteredApis.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
                {apis.length === 0
                  ? 'No saved External APIs yet. Fill out the form to create your first reusable connection.'
                  : 'No APIs match your search.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredApis.map(api => {
                  const active = draft.id === api.id;
                  return (
                    <div
                      key={api.id}
                      className={cn(
                        'group rounded-lg border p-3 transition',
                        active
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                          : 'hover:bg-muted/40'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setDraft(recordToDraft(api))}
                        className="w-full text-start"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-sm">
                            {api.name}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                            {api.method}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
                          {api.endpointUrl}
                        </p>
                        <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-[11px]">
                          <span>
                            {Array.isArray(api.fields) ? api.fields.length : 0}{' '}
                            mapped fields
                          </span>
                        </div>
                      </button>

                      <div className="mt-2 flex items-center justify-end gap-1 border-t pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDuplicate(api)}
                          title="Duplicate"
                        >
                          <Copy className="size-3.5" /> Duplicate
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          disabled={isPending}
                          onClick={() => handleDelete(api)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Full External API CRUD + Schema Inspection + Mapping */}
      <div className="space-y-6 lg:col-span-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="size-5 text-indigo-600" />
                  {draft.id ? `Edit: ${draft.name || 'External API'}` : 'Create External API'}
                </CardTitle>
                <CardDescription>
                  Configure endpoint, headers, post selection, nested field
                  mapping, and dynamic view types.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={refresh}
                  disabled={!draft.endpointUrl.trim() || loading}
                >
                  <RefreshCw
                    className={cn('size-4', loading && 'animate-spin')}
                  />
                  {loading ? 'Fetching…' : 'Fetch API'}
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                >
                  <Save className="size-4" />
                  {isPending
                    ? 'Saving…'
                    : draft.id
                      ? 'Update API'
                      : 'Save API'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 1. Connection Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ext-api-name">Preset Name *</Label>
                <Input
                  id="ext-api-name"
                  value={draft.name}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Showcase Products API"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ext-api-method">HTTP Method</Label>
                <select
                  id="ext-api-method"
                  value={draft.method}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      method: e.target.value === 'POST' ? 'POST' : 'GET',
                    }))
                  }
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST (REST / GraphQL)</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ext-api-url">API Endpoint URL (HTTPS) *</Label>
                <Input
                  id="ext-api-url"
                  value={draft.endpointUrl}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, endpointUrl: e.target.value }))
                  }
                  placeholder="https://jsonplaceholder.typicode.com/users"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ext-api-desc">Description (optional)</Label>
                <Input
                  id="ext-api-desc"
                  value={draft.description}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional notes about this integration"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ext-api-items-path">
                  Items JSON Path (optional)
                </Label>
                <Input
                  id="ext-api-items-path"
                  value={draft.itemsPath}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, itemsPath: e.target.value }))
                  }
                  placeholder="Leave blank if root is array (e.g. data.items)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ext-api-total-path">
                  Total Count Path (optional)
                </Label>
                <Input
                  id="ext-api-total-path"
                  value={draft.totalPath}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, totalPath: e.target.value }))
                  }
                  placeholder="e.g. meta.total"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ext-api-ttl">Cache TTL (seconds)</Label>
                <Input
                  id="ext-api-ttl"
                  type="number"
                  min={0}
                  max={3600}
                  value={draft.cacheTtlSeconds}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      cacheTtlSeconds: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ext-api-timeout">Timeout (ms)</Label>
                <Input
                  id="ext-api-timeout"
                  type="number"
                  min={500}
                  max={10000}
                  value={draft.timeoutMs}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      timeoutMs: Number(e.target.value) || 4000,
                    }))
                  }
                />
              </div>

              {draft.method === 'POST' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ext-api-body">
                    POST / GraphQL Body (JSON)
                  </Label>
                  <Textarea
                    id="ext-api-body"
                    rows={4}
                    value={draft.body}
                    onChange={e =>
                      setDraft(prev => ({ ...prev, body: e.target.value }))
                    }
                    placeholder='{"query": "{ posts { id title } }"}'
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </div>

            {/* Headers */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Request Headers (supports {'{{secret.NAME}}'} and {'{{env.EXT_API_*}}'})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    setDraft(prev => ({
                      ...prev,
                      headers: [...prev.headers, { key: '', value: '' }],
                    }))
                  }
                >
                  <Plus className="size-3.5" /> Add Header
                </Button>
              </div>
              {draft.headers.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No custom headers configured.
                </p>
              ) : (
                <div className="space-y-2">
                  {draft.headers.map((h, idx) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: header rows
                      key={idx}
                      className="flex items-center gap-2"
                    >
                      <Input
                        value={h.key}
                        placeholder="Header name (e.g. Authorization)"
                        onChange={e =>
                          setDraft(prev => ({
                            ...prev,
                            headers: prev.headers.map((row, i) =>
                              i === idx ? { ...row, key: e.target.value } : row
                            ),
                          }))
                        }
                      />
                      <Input
                        value={h.value}
                        placeholder="Value (e.g. Bearer {{secret.API_TOKEN}})"
                        onChange={e =>
                          setDraft(prev => ({
                            ...prev,
                            headers: prev.headers.map((row, i) =>
                              i === idx
                                ? { ...row, value: e.target.value }
                                : row
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDraft(prev => ({
                            ...prev,
                            headers: prev.headers.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Secrets Vault */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">
                    Secrets Vault (referenced as {'{{secret.NAME}}'})
                  </Label>
                  <p className="text-muted-foreground text-[11px]">
                    Encrypted at rest with AES-256-GCM and masked after saving.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    setDraft(prev => ({
                      ...prev,
                      secrets: [...prev.secrets, { key: '', value: '' }],
                    }))
                  }
                >
                  <Plus className="size-3.5" /> Add Secret
                </Button>
              </div>
              {draft.secrets.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No vault secrets configured.
                </p>
              ) : (
                <div className="space-y-2">
                  {draft.secrets.map((s, idx) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: secret rows
                      key={idx}
                      className="flex items-center gap-2"
                    >
                      <Input
                        value={s.key}
                        placeholder="Secret name (e.g. API_TOKEN)"
                        onChange={e =>
                          setDraft(prev => ({
                            ...prev,
                            secrets: prev.secrets.map((row, i) =>
                              i === idx ? { ...row, key: e.target.value } : row
                            ),
                          }))
                        }
                      />
                      <Input
                        type="password"
                        value={s.value}
                        placeholder="Secret value"
                        onChange={e =>
                          setDraft(prev => ({
                            ...prev,
                            secrets: prev.secrets.map((row, i) =>
                              i === idx
                                ? { ...row, value: e.target.value }
                                : row
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDraft(prev => ({
                            ...prev,
                            secrets: prev.secrets.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 1b. Filter Params (URL Query Params) & Response Data Filters */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    Data Filters &amp; Filter Params
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Add URL query parameters sent with the request and/or filter
                    returned items by any field key.
                  </p>
                </div>
                {data?.ok && draft.dataFilters.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                    {filteredPostCount} / {data.postOptions.length} matching
                    filters
                  </span>
                )}
              </div>

              {/* URL Query / Filter Params */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    URL Query / Filter Params
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft(prev => ({
                        ...prev,
                        queryParams: [
                          ...prev.queryParams,
                          { key: '', value: '' },
                        ],
                      }))
                    }
                  >
                    <Plus className="me-1 size-3.5" />
                    Add param
                  </Button>
                </div>
                {draft.queryParams.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No query params configured (e.g. <code>userId=1</code>).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {draft.queryParams.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={p.key}
                          onChange={e =>
                            setDraft(prev => ({
                              ...prev,
                              queryParams: prev.queryParams.map((row, i) =>
                                i === idx ? { ...row, key: e.target.value } : row
                              ),
                            }))
                          }
                          placeholder="Param name (e.g. userId)"
                          className="font-mono text-xs"
                        />
                        <Input
                          value={p.value}
                          onChange={e =>
                            setDraft(prev => ({
                              ...prev,
                              queryParams: prev.queryParams.map((row, i) =>
                                i === idx
                                  ? { ...row, value: e.target.value }
                                  : row
                              ),
                            }))
                          }
                          placeholder="Param value (e.g. 1)"
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDraft(prev => ({
                              ...prev,
                              queryParams: prev.queryParams.filter(
                                (_, i) => i !== idx
                              ),
                            }))
                          }
                        >
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Response Data Filters */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Response Data Filters
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft(prev => ({
                        ...prev,
                        dataFilters: [
                          ...prev.dataFilters,
                          {
                            key: filterKeyOptions[0]?.value ?? '',
                            operator: 'equals',
                            value: '',
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="me-1 size-3.5" />
                    Add data filter
                  </Button>
                </div>
                {draft.dataFilters.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No data filters configured. All fetched items will be
                    returned.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {draft.dataFilters.map((flt, idx) => (
                      <div
                        key={idx}
                        className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_160px_minmax(0,1fr)_auto]"
                      >
                        {filterKeyOptions.length > 0 ? (
                          <SearchableSelect
                            size="sm"
                            value={flt.key}
                            options={filterKeyOptions}
                            placeholder="Select field key…"
                            searchPlaceholder="Search keys…"
                            onValueChange={next =>
                              setDraft(prev => ({
                                ...prev,
                                dataFilters: prev.dataFilters.map((row, i) =>
                                  i === idx ? { ...row, key: next ?? '' } : row
                                ),
                              }))
                            }
                          />
                        ) : (
                          <Input
                            value={flt.key}
                            onChange={e =>
                              setDraft(prev => ({
                                ...prev,
                                dataFilters: prev.dataFilters.map((row, i) =>
                                  i === idx
                                    ? { ...row, key: e.target.value }
                                    : row
                                ),
                              }))
                            }
                            placeholder="Field key (e.g. address.city)"
                            className="font-mono text-xs"
                          />
                        )}
                        <select
                          value={flt.operator}
                          onChange={e =>
                            setDraft(prev => ({
                              ...prev,
                              dataFilters: prev.dataFilters.map((row, i) =>
                                i === idx
                                  ? {
                                      ...row,
                                      operator: e.target
                                        .value as ExternalApiDataFilter['operator'],
                                    }
                                  : row
                              ),
                            }))
                          }
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {EXTERNAL_API_FILTER_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        {flt.operator !== 'not_empty' ? (
                          <Input
                            value={flt.value ?? ''}
                            onChange={e =>
                              setDraft(prev => ({
                                ...prev,
                                dataFilters: prev.dataFilters.map((row, i) =>
                                  i === idx
                                    ? { ...row, value: e.target.value }
                                    : row
                                ),
                              }))
                            }
                            placeholder="Filter value…"
                            className="text-xs"
                          />
                        ) : (
                          <div className="flex items-center text-xs text-muted-foreground">
                            Any non-empty value
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDraft(prev => ({
                              ...prev,
                              dataFilters: prev.dataFilters.filter(
                                (_, i) => i !== idx
                              ),
                            }))
                          }
                        >
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Fetched Post Option List */}
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    Select Post from Fetched API
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Inspect live API data and pick a post to preview &amp;
                    validate field mappings.
                  </p>
                </div>
                {data?.ok && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle2 className="size-3.5" />
                    {data.totalItems} posts · {data.keys.length} keys
                  </span>
                )}
              </div>

              {data && !data.ok && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{data.error}</span>
                </div>
              )}

              <SearchableSelect
                value={
                  draft.selectedItemId.trim()
                    ? draft.selectedItemId.trim()
                    : '__all__'
                }
                disabled={loading || postOptions.length === 0}
                options={postSelectOptions}
                placeholder={
                  loading
                    ? 'Fetching posts from API…'
                    : 'Select a post from API…'
                }
                searchPlaceholder="Search fetched posts…"
                onValueChange={next =>
                  setDraft(prev => ({
                    ...prev,
                    selectedItemId: !next || next === '__all__' ? '' : next,
                  }))
                }
              />

              {draft.selectedItemId && (
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={draft.filterToSelectedItem}
                    onChange={checked =>
                      setDraft(prev => ({
                        ...prev,
                        filterToSelectedItem: checked,
                      }))
                    }
                  />
                  <span>
                    Display only this selected post by default when reused
                  </span>
                </label>
              )}
            </div>

            {/* 3. Core Field Keys */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Core Card Keys</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ExternalApiKeySelectField
                  id="core-id"
                  name="apiFieldId"
                  field={{ label: 'ID Field Key' }}
                  value={draft.fieldId}
                  props={controlProps}
                  onChange={v =>
                    setDraft(prev => ({ ...prev, fieldId: v || 'id' }))
                  }
                />
                <ExternalApiKeySelectField
                  id="core-title"
                  name="apiFieldTitle"
                  field={{ label: 'Title Field Key' }}
                  value={draft.fieldTitle}
                  props={controlProps}
                  onChange={v =>
                    setDraft(prev => ({ ...prev, fieldTitle: v || 'title' }))
                  }
                />
                <ExternalApiKeySelectField
                  id="core-url"
                  name="apiFieldUrl"
                  field={{ label: 'URL Field Key (optional)' }}
                  value={draft.fieldUrl}
                  props={controlProps}
                  onChange={v =>
                    setDraft(prev => ({ ...prev, fieldUrl: v ?? '' }))
                  }
                />
                <ExternalApiKeySelectField
                  id="core-excerpt"
                  name="apiFieldExcerpt"
                  field={{ label: 'Excerpt Field Key (optional)' }}
                  value={draft.fieldExcerpt}
                  props={controlProps}
                  onChange={v =>
                    setDraft(prev => ({ ...prev, fieldExcerpt: v ?? '' }))
                  }
                />
                <ExternalApiKeySelectField
                  id="core-image"
                  name="apiFieldImage"
                  field={{ label: 'Image Field Key (optional)' }}
                  value={draft.fieldImage}
                  props={controlProps}
                  onChange={v =>
                    setDraft(prev => ({ ...prev, fieldImage: v ?? '' }))
                  }
                />
                <ExternalApiKeySelectField
                  id="core-date"
                  name="apiFieldPublishedAt"
                  field={{ label: 'Published Date Field Key (optional)' }}
                  value={draft.fieldPublishedAt}
                  props={controlProps}
                  onChange={v =>
                    setDraft(prev => ({ ...prev, fieldPublishedAt: v ?? '' }))
                  }
                />
              </div>
            </div>

            {/* 4. Multi-Repeatable Field Mapping + Nested Objects + Nested Arrays + Dynamic View Types */}
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <h3 className="text-sm font-semibold">
                  Repeatable Content Fields, Nested Objects &amp; View Types
                </h3>
                <p className="text-muted-foreground text-xs">
                  Map top-level keys, nested object paths (e.g.{' '}
                  <code>address.street</code>), and repeatable arrays with
                  dynamic view modes and validation.
                </p>
              </div>
              <ExternalApiFieldsMapperControl
                id="crud-api-fields"
                name="apiFields"
                field={{ label: 'Mapped API Fields' }}
                value={draft.fields}
                props={controlProps}
                onChange={nextFields =>
                  setDraft(prev => ({ ...prev, fields: nextFields ?? [] }))
                }
              />
            </div>

            {/* 5. Live Selected Post JSON Inspector */}
            {activePost && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide">
                    Selected Post Raw JSON (#{activePost.id})
                  </h3>
                </div>
                <pre className="max-h-64 overflow-auto rounded bg-background p-3 font-mono text-[11px]">
                  {JSON.stringify(activePost.raw, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
