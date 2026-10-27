'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTransition } from 'react';
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
  ChevronRight,
  Layout,
  List,
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
  DialogTrigger,
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
import { Toggle } from '@/components/ui/toggle';
import { useFormAction } from '@/hooks/use-form-action';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { parseVideoUrl } from '@/lib/video/parse';
import { VideoPlayer } from '@/components/video/video-player';

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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [layout, setLayout] = useState<'sidebar' | 'stacked'>('sidebar');
  const [isLoading, startTransition] = useTransition();
  const [openForm, setOpenForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);

  const loadData = useCallback(async () => {
    await handleActionResponse(
      listVideos({
        search: search || undefined,
        playlistId: selectedPlaylist || undefined,
        status: statusFilter || undefined,
        page,
        size: 40,
      }),
      (result: { data: VideoItem[]; total: number }) => {
        setVideos(result.data);
        setTotal(result.total);
      }
    );
  }, [search, selectedPlaylist, statusFilter, page]);

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
      toast.success('Published');
    });
  };

  const handleUnpublish = async (id: string) => {
    await handleActionResponse(unpublishVideo({ id }), () => {
      startTransition(() => loadData());
      toast.success('Unpublished');
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this video?')) return;
    await handleActionResponse(deleteVideo({ id }), () => {
      startTransition(() => loadData());
      toast.success('Deleted');
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
      startTransition(() => loadData());
      toast.success('Playlist created');
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Videos</h1>
          <p className="text-sm text-steel-500">
            Manage YouTube, Vimeo, and direct MP4/WebM videos.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <PlaylistPanel
            playlists={playlists}
            selectedPlaylist={selectedPlaylist}
            onSelect={setSelectedPlaylist}
            onCreate={handleCreatePlaylist}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
          <Button
            onClick={() => {
              setEditingVideo(null);
              setOpenForm(true);
            }}
            disabled={!canCreate}
          >
            <Plus className="mr-2 h-4 w-4" /> Add video
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLayout(l => (l === 'sidebar' ? 'stacked' : 'sidebar'))}
          >
            {layout === 'sidebar' ? (
              <>
                <List className="mr-2 h-4 w-4" /> Stacked
              </>
            ) : (
              <>
                <Layout className="mr-2 h-4 w-4" /> Sidebar
              </>
            )}
          </Button>
        </div>
      </div>

      {layout === 'sidebar' ? (
        <PlaylistPanel
          playlists={playlists}
          selectedPlaylist={selectedPlaylist}
          onSelect={setSelectedPlaylist}
          onCreate={handleCreatePlaylist}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ) : null}
      <div className="grid gap-4">
        <SearchBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        <VideoList
          videos={videos}
          total={total}
          page={page}
          setPage={setPage}
          isLoading={isLoading}
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
          onPreview={video => {
            setPreviewVideo(video);
          }}
          onReorder={handleReorder}
        />
      </div>

      <VideoForm
        open={openForm}
        onOpenChange={setOpenForm}
        editingVideo={editingVideo}
        onSave={handleSaveVideo}
        onCreate={handleCreateVideo}
        playlists={playlists}
        canCreate={canCreate}
        canEdit={canEdit}
      />
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

function SearchBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
        <Input
          placeholder="Search videos…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="relative">
        <Label htmlFor="status-filter">Status</Label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={e =>
            onStatusFilterChange(e.target.value as 'draft' | 'published' | 'archived' | '')
          }
          className="h-9 rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          onSearchChange('');
          onStatusFilterChange('');
        }}
        disabled={!search && !statusFilter}
      >
        <RefreshCw className="mr-2 h-4 w-4" /> Reset
      </Button>
    </div>
  );
}

function PlaylistPanel({
  playlists,
  selectedPlaylist,
  onSelect,
  onCreate,
  canCreate,
  canEdit,
  canDelete,
}: {
  playlists: PlaylistItem[];
  selectedPlaylist: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (data: { name: string; slug: string; description?: string }) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <aside className="w-72 rounded-lg border border-steel-200 p-4 dark:border-dark-300">
      <h2 className="text-sm font-semibold mb-3">Playlists</h2>
      {playlists.length === 0 ? (
        <p className="text-xs text-steel-500">No playlists yet.</p>
      ) : (
        <div className="space-y-1">
          {playlists.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id === selectedPlaylist ? null : p.id)}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded text-sm transition',
                selectedPlaylist === p.id
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40'
                  : 'hover:bg-steel-100 dark:hover:bg-dark-200'
              )}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-steel-400">{p.videoCount}</span>
            </button>
          ))}
        </div>
      )}
      <Separator className="my-3" />
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNewName('');
            setNewSlug('');
            setOpen(true);
          }}
          disabled={!canCreate}
        >
          <Plus className="mr-2 h-3 w-3" /> New
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled>
            placeholder
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New playlist</DialogTitle>
            <DialogDescription>
              Group videos into a playlist for the library widget.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onCreate({
                name: formData.get('name') as string,
                slug: formData.get('slug') as string,
                description: (formData.get('description') as string) || undefined,
              });
              setOpen(false);
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Name</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Slug</Label>
                <Input
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newName || !newSlug}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function VideoList({
  videos,
  total,
  page,
  setPage,
  isLoading,
  canEdit,
  canPublish,
  canDelete,
  onPublish,
  onUnpublish,
  onDelete,
  onEdit,
  onPreview,
  onReorder,
}: {
  videos: VideoItem[];
  total: number;
  page: number;
  setPage: (action: number | ((prev: number) => number)) => void;
  isLoading: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (video: VideoItem) => void;
  onPreview: (video: VideoItem) => void;
  onReorder: (ids: string[]) => void;
}) {
  const statusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'draft':
        return 'bg-steel-100 text-steel-700 dark:bg-dark-200 dark:text-steel-400';
      case 'archived':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-steel-100 text-steel-700';
    }
  };

  return (
    <div className="rounded-lg border border-steel-200 dark:border-dark-300">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 dark:border-dark-300">
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Provider</th>
              <th className="text-left px-4 py-3 font-medium">Playlist</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map(video => (
              <tr
                key={video.id}
                className="border-b border-steel-200 dark:border-dark-300 hover:bg-steel-50 dark:hover:bg-dark-200/50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{video.title}</div>
                  <div className="text-xs text-steel-500">{video.slug}</div>
                </td>
                <td className="px-4 py-3">
                  {video.provider === 'youtube' ? (
                    <>
                      <Play className="mr-1.5 h-3 w-3 text-red-600 fill-red-600" />
                      YouTube
                    </>
                  ) : video.provider === 'vimeo' ? (
                    <>
                      <Play className="mr-1.5 h-3 w-3 text-blue-600 fill-blue-600" />
                      Vimeo
                    </>
                  ) : (
                    <>Direct</>
                  )}
                </td>
                <td className="px-4 py-3">
                  {video.playlistName ?? <span className="text-steel-400">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(video.status)}`}
                  >
                    {video.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {video.status === 'published' ? (
                        <DropdownMenuItem onSelect={() => onUnpublish(video.id)}>
                          <EyeOff className="mr-2 h-3 w-3" /> Unpublish
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => onPublish(video.id)}>
                          <Eye className="mr-2 h-3 w-3" /> Publish
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => onPreview(video)}>
                        <Play className="mr-2 h-3 w-3" /> Preview
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onSelect={() => onEdit(video)}>
                          <Edit3 className="mr-2 h-3 w-3" /> Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          onSelect={() => onDelete(video.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-3 w-3" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {videos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-steel-500">
                  No videos found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-steel-200 dark:border-dark-300">
          <p className="text-xs text-steel-500">
            Showing {videos.length} of {total} videos
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((prev: number) => prev - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page - 1) * 40 >= total || isLoading}
              onClick={() => setPage((prev: number) => prev + 1)}
            >
              Load more
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoForm({
  open,
  onOpenChange,
  editingVideo,
  onSave,
  onCreate,
  playlists,
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
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [title, setTitle] = useState(editingVideo?.title ?? '');
  const [slug, setSlug] = useState(editingVideo?.slug ?? '');
  const [url, setUrl] = useState(editingVideo?.url ?? '');
  const [playlistId, setPlaylistId] = useState(editingVideo?.playlistId ?? '');
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [status, setStatus] = useState(editingVideo?.status ?? 'draft');
  const [visibility, setVisibility] = useState(editingVideo?.visibility ?? 'public');

  useEffect(() => {
    setTitle(editingVideo?.title ?? '');
    setSlug(editingVideo?.slug ?? '');
    setUrl(editingVideo?.url ?? '');
    setPlaylistId(editingVideo?.playlistId ?? '');
    setStatus(editingVideo?.status ?? 'draft');
    setVisibility(editingVideo?.visibility ?? 'public');
    setInvalidUrl(false);
  }, [editingVideo]);

  const validateUrl = useCallback((value: string) => {
    try {
      const u = new URL(value);
      const lower = u.pathname.toLowerCase();
      const isDirect = lower.endsWith('.mp4') || lower.endsWith('.webm');
      const isYt =
        u.hostname.includes('youtube.com') ||
        u.hostname.includes('youtu.be') ||
        u.hostname.includes('youtube-nocookie.com');
      const isVimeo =
        u.hostname.includes('vimeo.com') || u.hostname.includes('player.vimeo.com');
      setInvalidUrl(!(isDirect || isYt || isVimeo));
    } catch {
      setInvalidUrl(true);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingVideo ? 'Edit video' : 'Add video'}
          </DialogTitle>
          <DialogDescription>
            Add a YouTube, Vimeo, or direct MP4/WebM video URL.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (invalidUrl) return;
            const data = {
              title,
              slug,
              url,
              playlistId: playlistId || null,
            };
            if (editingVideo && canEdit) {
              onSave({
                id: editingVideo.id,
                title,
                slug,
                url,
                playlistId: playlistId || undefined,
                status,
                visibility,
              });
            } else if (!editingVideo && canCreate) {
              onCreate(data);
            }
            onOpenChange(false);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                required
                maxLength={200}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Video URL</Label>
            <Input
              value={url}
              onChange={e => {
                setUrl(e.target.value);
                validateUrl(e.target.value);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              className={cn(
                'h-9 w-full rounded-md border px-3 text-sm',
                invalidUrl ? 'border-destructive' : 'border-steel-200 dark:border-dark-300'
              )}
            />
            {invalidUrl && (
              <p className="text-xs text-destructive">
                Unsupported URL. Use YouTube, Vimeo, or a direct HTTPS .mp4/.webm link.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Label>Playlist</Label>
            <Input
              value={playlistId}
              onChange={e => setPlaylistId(e.target.value)}
              placeholder="Leave empty for no playlist"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label>Status</Label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="h-9 rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Visibility</Label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as any)}
                className="h-9 rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <DialogFooter>
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
 * PreviewDialog — admin preview of a video using the same player stack
 * as the public widget.
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
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Preview: {video.title}</DialogTitle>
          <DialogDescription>
            {video.provider} • {video.visibility} • {video.status}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {parsed ? (
            <VideoPlayer
              parsed={parsed}
              poster={video.thumbnailUrl ?? undefined}
              duration={video.duration ?? undefined}
              lockSeek={true}
            />
          ) : (
            <div className="bg-steel-100 rounded-lg aspect-video flex items-center justify-center dark:bg-dark-200">
              <p className="text-sm text-steel-500">
                Unable to preview this video.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
