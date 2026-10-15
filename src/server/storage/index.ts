import 'server-only';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '@/env.mjs';

export type StorageDriver = {
  put: (key: string, body: Buffer, contentType: string) => Promise<{ url: string }>;
  remove: (key: string) => Promise<void>;
  /** Only the local driver serves files itself; S3 objects are served by the bucket/CDN. */
  read?: (key: string) => Promise<Buffer | null>;
};

export const LOCAL_MEDIA_ROUTE = '/media';

const localRoot = () => path.resolve(process.cwd(), env.MEDIA_LOCAL_DIR);

/** Resolves a key inside the upload root and rejects path traversal. */
function localPath(key: string) {
  const root = localRoot();
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error('Invalid media key');
  return full;
}

const localDriver: StorageDriver = {
  put: async (key, body) => {
    const full = localPath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return { url: `${LOCAL_MEDIA_ROUTE}/${key}` };
  },
  remove: async key => {
    await unlink(localPath(key)).catch(() => undefined);
  },
  read: async key => {
    try {
      return await readFile(localPath(key));
    } catch {
      return null;
    }
  },
};

function s3Driver(): StorageDriver {
  if (!env.S3_BUCKET || !env.S3_REGION) {
    throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET and S3_REGION');
  }

  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: !!env.S3_ENDPOINT,
    credentials:
      env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
        : undefined,
  });

  const publicBase =
    env.S3_PUBLIC_URL?.replace(/\/$/, '') ?? `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;

  return {
    put: async (key, body, contentType) => {
      await client.send(
        new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType })
      );
      return { url: `${publicBase}/${key}` };
    },
    remove: async key => {
      await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    },
  };
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  driver ??= env.STORAGE_DRIVER === 's3' ? s3Driver() : localDriver;
  return driver;
}
