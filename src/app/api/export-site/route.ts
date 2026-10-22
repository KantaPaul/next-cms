import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { accessService } from '@/server/services/access.service';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Authenticated download of the baked public-site zip.
 * Requires settings.manage. Runs `pnpm export:site` semantics by invoking the export script
 * when the zip is missing or ?refresh=1 is set.
 */
export async function GET(request: Request) {
  const session = await validateSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const access = await accessService.getUserAccess(session.user.id);
  if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') === '1';
  const zipPath = join(process.cwd(), 'export', 'site.zip');

  if (refresh || !existsSync(zipPath)) {
    try {
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execFileAsync = promisify(execFile);
      await execFileAsync(
        'pnpm',
        ['export:site'],
        {
          cwd: process.cwd(),
          env: process.env,
          timeout: 240_000,
          maxBuffer: 10 * 1024 * 1024,
        }
      );
    } catch (error) {
      console.error('export:site failed', error);
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : 'Export failed. Run `pnpm export:site` and try again.',
        },
        { status: 500 }
      );
    }
  }

  if (!existsSync(zipPath)) {
    return NextResponse.json(
      { message: 'Export zip not found after export.' },
      { status: 500 }
    );
  }

  const stream = createReadStream(zipPath);
  const webStream = ReadableToWeb(stream);
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="site.zip"',
      'Cache-Control': 'no-store',
    },
  });
}

function ReadableToWeb(stream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      stream.on('end', () => controller.close());
      stream.on('error', err => controller.error(err));
    },
    cancel() {
      (stream as any).destroy?.();
    },
  });
}
