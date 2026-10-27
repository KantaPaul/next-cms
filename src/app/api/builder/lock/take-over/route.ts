import { NextResponse } from 'next/server';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { editorLockService } from '@/server/services/editor-lock.service';

export async function POST(request: Request) {
  const { userId } = await getCurrentUserAndTeamId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  let body: { targetType: 'page' | 'post'; targetId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const result = await editorLockService.takeOver(body.targetType, body.targetId, userId);
  return NextResponse.json(result);
}
