'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schemas/auth.schema';

const profileSchema = z.object({
  name: z.string().trim().max(100),
  image: z
    .string()
    .trim()
    .max(500)
    .refine(
      v => v === '' || /^https?:\/\//i.test(v) || v.startsWith('/'),
      'Use an https:// URL or a /media/ path'
    ),
  bio: z.string().trim().max(600),
});

/** The signed-in user's public author profile (name, avatar, bio). */
export async function updateAuthorProfile(formData: FormData) {
  const { requireSession } = await import('@/server/actions/auth.actions');
  const session = await requireSession();
  const parsed = profileSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    image: String(formData.get('image') ?? ''),
    bio: String(formData.get('bio') ?? ''),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
  }
  const { name, image, bio } = parsed.data;
  await db
    .update(users)
    .set({ name: name || null, image: image || null, bio: bio || null })
    .where(eq(users.id, session.session.userId));
  return { message: 'Profile saved.' };
}
