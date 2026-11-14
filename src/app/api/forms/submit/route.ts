import { after } from 'next/server';
import { env } from '@/env.mjs';
import { clientIp } from '@/server/lib/client-ip';
import {
  checkPublicCors,
  handlePublicCorsOptions,
} from '@/server/lib/public-cors-site';
import { formsService } from '@/server/services/forms.service';

/** Five files at the upload limit, plus room for the text fields. */
const MAX_BODY_BYTES = (5 * env.MEDIA_MAX_UPLOAD_MB + 1) * 1024 * 1024;

export async function OPTIONS(request: Request) {
  return handlePublicCorsOptions(request);
}

export async function POST(request: Request) {
  const cors = await checkPublicCors(request);
  if (!cors.allowed) {
    return Response.json({ error: cors.reason ?? 'Forbidden' }, { status: 403 });
  }

  // Refuse oversized bodies before `formData()` buffers them in memory.
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) {
    return Response.json(
      { error: 'The upload is too large.' },
      { status: 413, headers: cors.headers }
    );
  }

  const formData = await request.formData();
  const result = await formsService.submit(formData, {
    ip: clientIp(request.headers),
  });

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: result.status, headers: cors.headers }
    );
  }

  if (result.afterAction) {
    after(result.afterAction);
  }

  return Response.json(
    {
      ok: true,
      id: result.id,
      redirectTo: result.redirectTo,
    },
    { headers: cors.headers }
  );
}
