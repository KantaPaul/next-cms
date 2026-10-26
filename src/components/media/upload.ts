'use client';

export type UploadedMedia = {
  id: string;
  url: string;
  filename: string;
  title: string | null;
  alt: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  folder: string;
};

function measureImage(
  file: File
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null);
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function uploadMediaFile(
  file: File,
  folder?: string
): Promise<UploadedMedia> {
  const size = await measureImage(file);
  const form = new FormData();
  form.append('file', file);
  if (folder) form.append('folder', folder);
  if (size) {
    form.append('width', String(size.width));
    form.append('height', String(size.height));
  }

  const response = await fetch('/api/media', { method: 'POST', body: form });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message ?? 'Upload failed');
  return json as UploadedMedia;
}

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
