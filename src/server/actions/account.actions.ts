'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { users } from '@/db/schema';
import { isUiLocale } from '@/i18n/config';
import { requireSession } from '@/server/actions/auth.actions';

export async function updateUiLocaleAction(
  nextLocale: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const value =
    nextLocale && nextLocale !== 'auto'
      ? isUiLocale(nextLocale)
        ? nextLocale
        : null
      : null;

  await db
    .update(users)
    .set({ uiLocale: value })
    .where(eq(users.id, session.session.userId));

  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
