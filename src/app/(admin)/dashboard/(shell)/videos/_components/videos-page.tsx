'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Play,
  Edit3,
  Eye,
  EyeOff,
  Layout,
  List,
  LayoutGrid,
  Columns,
  Video as VideoIcon,
  FolderPlus,
  Folder,
  Layers,
  Sparkles,
  ExternalLink,
  MoreVertical,
  Check,
  Clock,
  Film,
} from 'lucide-react';
import {
  listVideos,
  createVideo,
  updateVideo,
  publishVideo,
  unpublishVideo,
  deleteVideo,
  reorderVideos,
  createPlaylist,
  fetchVideoMetadata,
  type VideoItem,
  type PlaylistItem,
} from '@/app/(admin)/dashboard/(shell)/videos/_modules/videos.actions';
import { PERMISSIONS } from '@/config/permissions';
import { useCan } from '@/providers/access.provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { parseVideoUrl } from '@/lib/video/parse';
import { VideoPlayer } from '@/components/video/video-player';

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function VideosPage({
  playlists,
}: {
  playlists: PlaylistItem[];
}) {
  const canCreate = useCan(PERMISSIONS.VIDEOS_CREATE);
  const canEdit = useCan(PERMISSIONS.VIDEOS_EDIT);
  const canPublish = useCan(PERMISSIONS.VIDEOS_PUBLISH);
  const canDelete = useCan(PERMISSIONS.VIDEOS_DELETE);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<'youtube' | 'vimeo' | 'direct' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'draft' | 'published' | 'archived' | ''>('');
  const [page, setPage] = useState<number>(1);
  const [layout, setLayout] = useState<'sidebar' | 'stacked'>('sidebar');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isLoading, startTransition] = useTransition();

  const [openForm, setOpenForm] = useState(false);
  const [openPlaylistModal, setOpenPlaylistModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);

  const loadData = useCallback(async () => {
    await handleActionResponse(
      listVideos({
        search: search || undefined,
        playlistId: selectedPlaylist || undefined,
        status: statusFilter || undefined,
        provider: providerFilter || undefined,
        page,
        size: 40,
      }),
      (result: { data: VideoItem[]; total: number }) => {
        setVideos(result.data);
        setTotal(result.total);
      }
    );
  }, [search, selectedPlaylist, statusFilter, providerFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateVideo = async (data: {
    title: string;
    slug: string;
    url: string;
    playlistId?: string | null;
  }) => {
    await handleActionResponse(createVideo(data), () => {
      setOpenForm(false);
      setEditingVideo(null);
      startTransition(() => loadData());
      toast.success('Video created');
    });
  };

  const handleSaveVideo = async (data: {
    id: string;
    title?: string;
    slug?: string;
    url?: string;
    playlistId?: string | null;
    status?: string;
    visibility?: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
  }) => {
    await handleActionResponse(updateVideo(data), () => {
      setOpenForm(false);
      setEditingVideo(null);
      startTransition(() => loadData());
      toast.success('Video saved');
    });
  };

  const handlePublish = async (id: string) => {
    await handleActionResponse(publishVideo({ id }), () => {
      startTransition(() => loadData());
      toast.success('Video published');
    });
  };

  const handleUnpublish = async (id: string) => {
    await handleActionResponse(unpublishVideo({ id }), () => {
      startTransition(() => loadData());
      toast.success('Video unpublished');
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    await handleActionResponse(deleteVideo({ id }), () => {
      startTransition(() => loadData());
      toast.success('Video deleted');
    });
  };

  const handleReorder = async (ids: string[]) => {
    await handleActionResponse(reorderVideos({ ids }), () => {
      startTransition(() => loadData());
      toast.success('Order saved');
    });
  };

  const handleCreatePlaylist = async (data: {
    name: string;
    slug: string;
    description?: string;
  }) => {
    await handleActionResponse(createPlaylist(data), () => {
      setOpenPlaylistModal(false);
      startTransition(() => loadData());
      toast.success('Playlist created');
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setProviderFilter('');
    setStatusFilter('');
    setSelectedPlaylist(null);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-steel-200 dark:border-dark-300 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Videos
          </h1>
          <p className="text-sm text-steel-500 mt-0.5">
            Manage YouTube, Vimeo, and direct MP4/WebM videos across your site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-steel-100 dark:bg-dark-200 p-0.5 rounded-lg border border-steel-200 dark:border-dark-300">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-md transition text-xs font-medium',
                viewMode === 'table'
                  ? 'bg-white dark:bg-dark-100 text-slate-900 dark:text-white shadow-sm'
                  : 'text-steel-500 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition text-xs font-medium',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-dark-100 text-slate-900 dark:text-white shadow-sm'
                  : 'text-steel-500 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Layout toggle (Sidebar vs Stacked) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLayout(l => (l === 'sidebar' ? 'stacked' : 'sidebar'))}
            title={layout === 'sidebar' ? 'Switch to stacked view' : 'Switch to sidebar view'}
          >
            {layout === 'sidebar' ? (
              <>
                <Columns className="me-1.5 h-4 w-4" /> Stacked
              </>
            ) : (
              <>
                <Layout className="me-1.5 h-4 w-4" /> Sidebar
              </>
            )}
          </Button>

          {/* Add Video Button */}
          <Button
            onClick={() => {
              setEditingVideo(null);
              setOpenForm(true);
            }}
            disabled={!canCreate}
            className="shadow-sm"
          >
            <Plus className="me-1.5 h-4 w-4" /> Add video
          </Button>
        </div>
      </div>

      {/* Stacked Layout: Horizontal Playlists Chips */}
      {layout === 'stacked' && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <span className="text-xs font-semibold text-steel-500 uppercase tracking-wider me-1">
            Playlists:
          </span>
          <button
            type="button"
            onClick={() => setSelectedPlaylist(null)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
              selectedPlaylist === null
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-steel-100 text-steel-700 hover:bg-steel-200 dark:bg-dark-200 dark:text-steel-300 dark:hover:bg-dark-100'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            All videos
          </button>
          {playlists.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlaylist(p.id === selectedPlaylist ? null : p.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
                selectedPlaylist === p.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-steel-100 text-steel-700 hover:bg-steel-200 dark:bg-dark-200 dark:text-steel-300 dark:hover:bg-dark-100'
              )}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>{p.name}</span>
              <span className="ms-1 px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-[10px]">
                {p.videoCount}
              </span>
            </button>
          ))}
          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 ms-auto"
              onClick={() => setOpenPlaylistModal(true)}
            >
              <FolderPlus className="me-1 h-3.5 w-3.5" /> New playlist
            </Button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          'w-full',
          layout === 'sidebar'
            ? 'flex flex-col lg:flex-row items-start gap-6'
            : 'flex flex-col gap-4'
        )}
      >
        {/* Sidebar Layout: Playlist Sidebar */}
        {layout === 'sidebar' && (
          <aside className="w-full lg:w-64 shrink-0 rounded-xl border border-steel-200 bg-white p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-steel-500">
                Playlists
              </h2>
              {canCreate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  onClick={() => setOpenPlaylistModal(true)}
                >
                  <Plus className="me-1 h-3 w-3" /> New
                </Button>
              )}
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedPlaylist(null)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition',
                  selectedPlaylist === null
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold'
                    : 'text-steel-700 hover:bg-steel-50 dark:text-steel-300 dark:hover:bg-dark-200'
                )}
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  All videos
                </span>
                <span className="text-xs text-steel-400">{total}</span>
              </button>

              {playlists.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlaylist(p.id === selectedPlaylist ? null : p.id)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm transition',
                    selectedPlaylist === p.id
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold'
                      : 'text-steel-700 hover:bg-steel-50 dark:text-steel-300 dark:hover:bg-dark-200'
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="text-xs text-steel-400 ms-2">{p.videoCount}</span>
                </button>
              ))}

              {playlists.length === 0 && (
                <p className="text-xs text-steel-400 px-3 py-2 italic">
                  No playlists created yet.
                </p>
              )}
            </div>
          </aside>
        )}

        {/* Video Main Pane */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* SearchBar with Data Source & Status filters */}
          <SearchBar
            search={search}
            onSearchChange={setSearch}
            providerFilter={providerFilter}
            onProviderFilterChange={setProviderFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onReset={handleResetFilters}
          />

          {/* Video List / Grid Display */}
          {viewMode === 'table' ? (
            <VideoTable
              videos={videos}
              total={total}
              page={page}
              setPage={setPage}
              isLoading={isLoading}
              canCreate={canCreate}
              canEdit={canEdit}
              canPublish={canPublish}
              canDelete={canDelete}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onDelete={handleDelete}
              onEdit={video => {
                setEditingVideo(video);
                setOpenForm(true);
              }}
              onPreview={video => setPreviewVideo(video)}
              onReorder={handleReorder}
              onAddVideo={() => {
                setEditingVideo(null);
                setOpenForm(true);
              }}
            />
          ) : (
            <VideoGrid
              videos={videos}
              total={total}
              page={page}
              setPage={setPage}
              isLoading={isLoading}
              canCreate={canCreate}
              canEdit={canEdit}
              canPublish={canPublish}
              canDelete={canDelete}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onDelete={handleDelete}
              onEdit={video => {
                setEditingVideo(video);
                setOpenForm(true);
              }}
              onPreview={video => setPreviewVideo(video)}
              onAddVideo={() => {
                setEditingVideo(null);
                setOpenForm(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Video Add/Edit Dialog */}
      <VideoForm
        open={openForm}
        onOpenChange={setOpenForm}
        editingVideo={editingVideo}
        onSave={handleSaveVideo}
        onCreate={handleCreateVideo}
        playlists={playlists}
        selectedPlaylistId={selectedPlaylist}
        canCreate={canCreate}
        canEdit={canEdit}
      />

      {/* Create Playlist Modal */}
      <PlaylistModal
        open={openPlaylistModal}
        onOpenChange={setOpenPlaylistModal}
        onCreate={handleCreatePlaylist}
      />

      {/* Preview Dialog */}
      <PreviewDialog
        open={previewVideo !== null}
        onOpenChange={open => {
          if (!open) setPreviewVideo(null);
        }}
        video={previewVideo}
      />
    </div>
  );
}

/**
 * SearchBar — comprehensive search bar with Data Source (Provider) and Status filters.
 */
function SearchBar({
  search,
  onSearchChange,
  providerFilter,
  onProviderFilterChange,
  statusFilter,
  onStatusFilterChange,
  onReset,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  providerFilter: 'youtube' | 'vimeo' | 'direct' | '';
  onProviderFilterChange: (v: 'youtube' | 'vimeo' | 'direct' | '') => void;
  statusFilter: 'draft' | 'published' | 'archived' | '';
  onStatusFilterChange: (v: 'draft' | 'published' | 'archived' | '') => void;
  onReset: () => void;
}) {
  const dynamicPlaceholder =
    providerFilter === 'youtube'
      ? 'Search YouTube videos…'
      : providerFilter === 'vimeo'
        ? 'Search Vimeo videos…'
        : providerFilter === 'direct'
          ? 'Search direct videos…'
          : 'Search videos by title or slug…';

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white p-3 rounded-xl border border-steel-200 shadow-sm dark:border-dark-300 dark:bg-dark-100">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
        <Input
          placeholder={dynamicPlaceholder}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="ps-9 h-9 w-full bg-steel-50/50 dark:bg-dark-200/50"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Data Source Filter (YouTube, Vimeo, Direct) */}
        <div className="flex items-center gap-1">
          <Label htmlFor="provider-filter" className="sr-only">
            Data Source
          </Label>
          <select
            id="provider-filter"
            value={providerFilter}
            onChange={e =>
              onProviderFilterChange(e.target.value as 'youtube' | 'vimeo' | 'direct' | '')
            }
            className="h-9 rounded-md border border-steel-200 bg-white px-2.5 text-xs font-medium text-slate-800 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Sources</option>
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="direct">Direct (MP4/WebM)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          <Label htmlFor="status-filter" className="sr-only">
            Status
          </Label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={e =>
              onStatusFilterChange(
                e.target.value as 'draft' | 'published' | 'archived' | ''
              )
            }
            className="h-9 rounded-md border border-steel-200 bg-white px-2.5 text-xs font-medium text-slate-800 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Reset button */}
        {(search || providerFilter || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 text-xs text-steel-500 hover:text-slate-900 dark:hover:text-white"
            title="Reset filters"
          >
            <RefreshCw className="me-1 h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * VideoTable — clean, responsive tabular view of videos with rich thumbnails.
 */
function VideoTable({
  videos,
  total,
  page,
  setPage,
  isLoading,
  canCreate,
  canEdit,
  canPublish,
  canDelete,
  onPublish,
  onUnpublish,
  onDelete,
  onEdit,
  onPreview,
  onReorder,
  onAddVideo,
}: {
  videos: VideoItem[];
  total: number;
  page: number;
  setPage: (action: number | ((prev: number) => number)) => void;
  isLoading: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (video: VideoItem) => void;
  onPreview: (video: VideoItem) => void;
  onReorder: (ids: string[]) => void;
  onAddVideo: () => void;
}) {
  const statusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40';
      case 'draft':
        return 'bg-steel-100 text-steel-700 dark:bg-dark-200 dark:text-steel-300 border border-steel-200 dark:border-dark-300';
      case 'archived':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40';
      default:
        return 'bg-steel-100 text-steel-700';
    }
  };

  return (
    <div className="rounded-xl border border-steel-200 bg-white shadow-sm dark:border-dark-300 dark:bg-dark-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50/60 dark:border-dark-300 dark:bg-dark-200/50 text-xs font-semibold uppercase tracking-wider text-steel-500">
              <th className="text-start px-4 py-3">Video</th>
              <th className="text-start px-4 py-3">Source</th>
              <th className="text-start px-4 py-3">Playlist</th>
              <th className="text-start px-4 py-3">Duration</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-end px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 dark:divide-dark-300/50">
            {videos.map(video => (
              <tr
                key={video.id}
                className="hover:bg-steel-50/80 dark:hover:bg-dark-200/40 transition group"
              >
                {/* Thumbnail + Title + Slug */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => onPreview(video)}
                      className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-steel-100 dark:bg-dark-200 cursor-pointer group/thumb border border-steel-200 dark:border-dark-300"
                    >
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover transition group-hover/thumb:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Film className="h-5 w-5 text-steel-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                        <Play className="h-5 w-5 text-white fill-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div
                        onClick={() => onPreview(video)}
                        className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 transition truncate cursor-pointer max-w-sm"
                      >
                        {video.title}
                      </div>
                      <div className="text-xs text-steel-500 font-mono truncate max-w-xs mt-0.5">
                        {video.slug}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Source / Provider */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {video.provider === 'youtube' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                      <Play className="h-3 w-3 fill-red-600 text-red-600" />
                      YouTube
                    </span>
                  ) : video.provider === 'vimeo' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-900/40">
                      <Play className="h-3 w-3 fill-sky-600 text-sky-600" />
                      Vimeo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200 dark:border-violet-900/40">
                      <Film className="h-3 w-3 text-violet-600" />
                      Direct
                    </span>
                  )}
                </td>

                {/* Playlist */}
                <td className="px-4 py-3 whitespace-nowrap text-steel-600 dark:text-steel-400">
                  {video.playlistName ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-steel-100 dark:bg-dark-200 text-xs">
                      <Folder className="h-3 w-3 text-steel-500" />
                      {video.playlistName}
                    </span>
                  ) : (
                    <span className="text-steel-400 text-xs">—</span>
                  )}
                </td>

                {/* Duration */}
                <td className="px-4 py-3 whitespace-nowrap text-xs text-steel-500">
                  {video.duration ? formatDuration(video.duration) : '—'}
                </td>

                {/* Status */}
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                      statusColor(video.status)
                    )}
                  >
                    {video.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-end whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(video)}
                      className="h-8 px-2 text-xs text-steel-600 hover:text-slate-900"
                      title="Preview video"
                    >
                      <Play className="h-3.5 w-3.5 me-1 text-indigo-600" /> Preview
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {video.status === 'published' ? (
                          <DropdownMenuItem onSelect={() => onUnpublish(video.id)}>
                            <EyeOff className="me-2 h-3.5 w-3.5 text-steel-500" /> Unpublish
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => onPublish(video.id)}>
                            <Eye className="me-2 h-3.5 w-3.5 text-emerald-600" /> Publish
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onSelect={() => onEdit(video)}>
                            <Edit3 className="me-2 h-3.5 w-3.5 text-steel-500" /> Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center cursor-pointer"
                          >
                            <ExternalLink className="me-2 h-3.5 w-3.5 text-steel-500" /> Open URL
                          </a>
                        </DropdownMenuItem>
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => onDelete(video.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="me-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}

            {videos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-steel-100 dark:bg-dark-200 mb-3">
                      <VideoIcon className="h-6 w-6 text-steel-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      No videos found
                    </h3>
                    <p className="mt-1 text-xs text-steel-500 text-center">
                      Try adjusting your search criteria, or add a new video from YouTube, Vimeo, or direct upload.
                    </p>
                    {canCreate && (
                      <Button
                        onClick={onAddVideo}
                        size="sm"
                        className="mt-4"
                      >
                        <Plus className="me-1.5 h-3.5 w-3.5" /> Add video
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-steel-200 dark:border-dark-300 bg-steel-50/40 dark:bg-dark-200/20">
          <p className="text-xs text-steel-500">
            Showing <span className="font-semibold">{videos.length}</span> of{' '}
            <span className="font-semibold">{total}</span> videos
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 40 >= total || isLoading}
              onClick={() => setPage((prev: number) => prev + 1)}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * VideoGrid — visual card grid view for rich video browsing.
 */
function VideoGrid({
  videos,
  total,
  page,
  setPage,
  isLoading,
  canCreate,
  canEdit,
  canPublish,
  canDelete,
  onPublish,
  onUnpublish,
  onDelete,
  onEdit,
  onPreview,
  onAddVideo,
}: {
  videos: VideoItem[];
  total: number;
  page: number;
  setPage: (action: number | ((prev: number) => number)) => void;
  isLoading: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (video: VideoItem) => void;
  onPreview: (video: VideoItem) => void;
  onAddVideo: () => void;
}) {
  return (
    <div className="space-y-4">
      {videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-100 p-12 text-center">
          <div className="mx-auto flex max-w-xs flex-col items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-steel-100 dark:bg-dark-200 mb-3">
              <VideoIcon className="h-6 w-6 text-steel-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              No videos found
            </h3>
            <p className="mt-1 text-xs text-steel-500">
              No videos matching your current filter settings.
            </p>
            {canCreate && (
              <Button onClick={onAddVideo} size="sm" className="mt-4">
                <Plus className="me-1.5 h-3.5 w-3.5" /> Add video
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(video => (
            <div
              key={video.id}
              className="group rounded-xl border border-steel-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition dark:border-dark-300 dark:bg-dark-100 flex flex-col"
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => onPreview(video)}
                className="relative aspect-video w-full bg-steel-100 dark:bg-dark-200 cursor-pointer overflow-hidden group/thumb"
              >
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover/thumb:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Film className="h-8 w-8 text-steel-400" />
                  </div>
                )}

                {/* Duration Badge */}
                {video.duration ? (
                  <span className="absolute bottom-2 end-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                    {formatDuration(video.duration)}
                  </span>
                ) : null}

                {/* Source Badge */}
                <span
                  className={cn(
                    'absolute top-2 start-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1',
                    video.provider === 'youtube'
                      ? 'bg-red-600 text-white'
                      : video.provider === 'vimeo'
                        ? 'bg-sky-500 text-white'
                        : 'bg-violet-600 text-white'
                  )}
                >
                  <Play className="h-2 w-2 fill-current" />
                  {video.provider}
                </span>

                {/* Hover Play Button */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-900 transition hover:scale-110">
                    <Play className="h-5 w-5 fill-current ms-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h4
                    onClick={() => onPreview(video)}
                    className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 hover:text-indigo-600 cursor-pointer"
                  >
                    {video.title}
                  </h4>
                  <p className="text-xs text-steel-400 font-mono truncate mt-1">
                    {video.slug}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-steel-100 dark:border-dark-300/60 pt-2.5 text-xs">
                  <span className="text-steel-500 truncate max-w-[120px]">
                    {video.playlistName || 'No playlist'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium capitalize',
                        video.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : video.status === 'draft'
                            ? 'bg-steel-100 text-steel-700 dark:bg-dark-200 dark:text-steel-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      )}
                    >
                      {video.status}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onPreview(video)}>
                          <Play className="me-2 h-3.5 w-3.5 text-indigo-600" /> Preview
                        </DropdownMenuItem>
                        {video.status === 'published' ? (
                          <DropdownMenuItem onSelect={() => onUnpublish(video.id)}>
                            <EyeOff className="me-2 h-3.5 w-3.5 text-steel-500" /> Unpublish
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => onPublish(video.id)}>
                            <Eye className="me-2 h-3.5 w-3.5 text-emerald-600" /> Publish
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onSelect={() => onEdit(video)}>
                            <Edit3 className="me-2 h-3.5 w-3.5 text-steel-500" /> Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onSelect={() => onDelete(video.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="me-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between px-1 py-2">
          <p className="text-xs text-steel-500">
            Showing <span className="font-semibold">{videos.length}</span> of{' '}
            <span className="font-semibold">{total}</span> videos
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 40 >= total || isLoading}
              onClick={() => setPage((prev: number) => prev + 1)}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * VideoForm — Create or Edit video with automatic provider detection, oEmbed fetching, and thumbnail preview.
 */
function VideoForm({
  open,
  onOpenChange,
  editingVideo,
  onSave,
  onCreate,
  playlists,
  selectedPlaylistId,
  canCreate,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingVideo: VideoItem | null;
  onSave: (data: {
    id: string;
    title?: string;
    slug?: string;
    url?: string;
    playlistId?: string | null;
    status?: string;
    visibility?: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
  }) => void;
  onCreate: (data: {
    title: string;
    slug: string;
    url: string;
    playlistId?: string | null;
  }) => void;
  playlists: PlaylistItem[];
  selectedPlaylistId?: string | null;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [title, setTitle] = useState(editingVideo?.title ?? '');
  const [slug, setSlug] = useState(editingVideo?.slug ?? '');
  const [url, setUrl] = useState(editingVideo?.url ?? '');
  const [playlistId, setPlaylistId] = useState(
    editingVideo?.playlistId ?? selectedPlaylistId ?? ''
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(editingVideo?.thumbnailUrl ?? '');
  const [duration, setDuration] = useState<string>(
    editingVideo?.duration ? String(editingVideo.duration) : ''
  );
  const [status, setStatus] = useState(editingVideo?.status ?? 'draft');
  const [visibility, setVisibility] = useState(editingVideo?.visibility ?? 'public');
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  const checkUrl = useCallback((value: string) => {
    if (!value.trim()) {
      setDetectedProvider(null);
      setInvalidUrl(false);
      return;
    }
    const parsed = parseVideoUrl(value);
    if (parsed) {
      setDetectedProvider(parsed.provider);
      setInvalidUrl(false);
    } else {
      setDetectedProvider(null);
      setInvalidUrl(true);
    }
  }, []);

  useEffect(() => {
    setTitle(editingVideo?.title ?? '');
    setSlug(editingVideo?.slug ?? '');
    setUrl(editingVideo?.url ?? '');
    setPlaylistId(editingVideo?.playlistId ?? selectedPlaylistId ?? '');
    setThumbnailUrl(editingVideo?.thumbnailUrl ?? '');
    setDuration(editingVideo?.duration ? String(editingVideo.duration) : '');
    setStatus(editingVideo?.status ?? 'draft');
    setVisibility(editingVideo?.visibility ?? 'public');
    setInvalidUrl(false);
    if (editingVideo?.url) {
      checkUrl(editingVideo.url);
    } else {
      setDetectedProvider(null);
    }
  }, [editingVideo, selectedPlaylistId, checkUrl]);

  const handleFetchMetadata = async () => {
    if (!url || invalidUrl) return;
    setIsFetchingMetadata(true);
    try {
      await handleActionResponse(
        fetchVideoMetadata({ url }),
        (data: { provider: string; id: string; title: string; thumbnailUrl: string } | null) => {
          if (!data) return;
          if (!title && data.title) {
            setTitle(data.title);
            if (!slug) {
              setSlug(
                data.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')
              );
            }
          }
          if (data.thumbnailUrl) {
            setThumbnailUrl(data.thumbnailUrl);
          }
          toast.success(`Metadata loaded from ${data.provider}`);
        }
      );
    } catch {
      toast.error('Could not fetch video details automatically');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingVideo && !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
          <DialogDescription>
            Enter a YouTube watch/shorts URL, Vimeo link, or direct HTTPS MP4/WebM URL.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={e => {
            e.preventDefault();
            if (invalidUrl || !url) return;
            const parsedDuration = duration ? parseInt(duration, 10) : null;
            if (editingVideo && canEdit) {
              onSave({
                id: editingVideo.id,
                title,
                slug,
                url,
                playlistId: playlistId || null,
                status,
                visibility,
                thumbnailUrl: thumbnailUrl || null,
                duration: parsedDuration && !isNaN(parsedDuration) ? parsedDuration : null,
              });
            } else if (!editingVideo && canCreate) {
              onCreate({
                title,
                slug,
                url,
                playlistId: playlistId || null,
              });
            }
          }}
          className="space-y-4 py-2"
        >
          {/* URL Input with Provider Badge */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Video URL</Label>
              {detectedProvider && (
                <span
                  className={cn(
                    'text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex items-center gap-1',
                    detectedProvider === 'youtube'
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                      : detectedProvider === 'vimeo'
                        ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                        : 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400'
                  )}
                >
                  <Play className="h-2.5 w-2.5 fill-current" />
                  {detectedProvider} Detected
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  checkUrl(e.target.value);
                }}
                onBlur={() => {
                  if (url && !invalidUrl && !title) {
                    handleFetchMetadata();
                  }
                }}
                placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                required
                className={cn(
                  'h-9 flex-1 rounded-md border text-sm',
                  invalidUrl ? 'border-destructive focus-visible:ring-destructive' : ''
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchMetadata}
                disabled={!url || invalidUrl || isFetchingMetadata}
                className="shrink-0 text-xs"
              >
                <Sparkles className="me-1 h-3.5 w-3.5 text-indigo-500" />
                {isFetchingMetadata ? 'Fetching…' : 'Fetch Info'}
              </Button>
            </div>

            {invalidUrl && (
              <p className="text-xs text-destructive">
                Unsupported video URL. Please provide a valid YouTube, Vimeo, or direct MP4/WebM URL.
              </p>
            )}
          </div>

          {/* Title & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Title</Label>
              <Input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Video title"
                required
                maxLength={200}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Slug</Label>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="video-url-slug"
                required
                maxLength={200}
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>

          {/* Playlist Selection & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Playlist</Label>
              <select
                value={playlistId}
                onChange={e => setPlaylistId(e.target.value)}
                className="h-9 rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None (No Playlist)</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Duration (Seconds)</Label>
              <Input
                type="number"
                min="0"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="e.g. 180"
                className="h-9"
              />
            </div>
          </div>

          {/* Status & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="h-9 rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Visibility</Label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as any)}
                className="h-9 rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* Thumbnail preview if present */}
          {thumbnailUrl && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-steel-50 dark:bg-dark-200 border border-steel-200 dark:border-dark-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                className="h-12 w-20 rounded object-cover border border-steel-300"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-800 dark:text-white block">
                  Thumbnail Preview
                </span>
                <span className="text-[11px] text-steel-500 truncate block">
                  {thumbnailUrl}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={invalidUrl || !title || !slug || !url}
            >
              {editingVideo ? 'Save changes' : 'Add video'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * PlaylistModal — dialog for creating new playlists.
 */
function PlaylistModal({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; slug: string; description?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Playlist</DialogTitle>
          <DialogDescription>
            Group videos into curated playlists for widgets and sections.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={e => {
            e.preventDefault();
            onCreate({
              name: name.trim(),
              slug: slug.trim(),
              description: description.trim() || undefined,
            });
            setName('');
            setSlug('');
            setDescription('');
          }}
          className="space-y-3 py-2"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Playlist Name</Label>
              <Input
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Tutorials"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Slug</Label>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="e.g. tutorials"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">Description (Optional)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this playlist"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || !slug}>
              Create Playlist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * PreviewDialog — video player preview modal with provider styling.
 */
function PreviewDialog({
  open,
  onOpenChange,
  video,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: VideoItem | null;
}) {
  if (!video) return null;

  const parsed = parseVideoUrl(video.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg truncate flex-1">
              {video.title}
            </DialogTitle>
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0',
                video.provider === 'youtube'
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : video.provider === 'vimeo'
                    ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                    : 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400'
              )}
            >
              {video.provider}
            </span>
          </div>
          <DialogDescription className="text-xs flex items-center gap-2">
            <span>Slug: {video.slug}</span>
            <span>•</span>
            <span className="capitalize">{video.visibility}</span>
            <span>•</span>
            <span className="capitalize">{video.status}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {parsed ? (
            <div className="rounded-xl overflow-hidden shadow-lg bg-black aspect-video">
              <VideoPlayer
                parsed={parsed}
                poster={video.thumbnailUrl ?? undefined}
                duration={video.duration ?? undefined}
                lockSeek={true}
              />
            </div>
          ) : (
            <div className="bg-steel-100 rounded-xl aspect-video flex items-center justify-center dark:bg-dark-200">
              <p className="text-sm text-steel-500">
                Unable to load preview for this video URL.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs text-steel-500"
          >
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open original
            </a>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
