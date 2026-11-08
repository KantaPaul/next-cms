'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { type AuthorSocialLinks, users } from '@/db/schemas/auth.schema';
import { profileSchema } from './profile.schemas';

const SOCIAL_KEYS = ['x', 'linkedin', 'github', 'instagram'] as const;

/** The signed-in user's public author profile (Author bio / Author card blocks). */
export async function updateAuthorProfile(formData: FormData) {
  const { requireSession } = await import('@/server/actions/auth.actions');
  const session = await requireSession();
  const read = (key: string) => String(formData.get(key) ?? '');
  const parsed = profileSchema.safeParse({
    name: read('name'),
    image: read('image'),
    bio: read('bio'),
    jobTitle: read('jobTitle'),
    website: read('website'),
    x: read('x'),
    linkedin: read('linkedin'),
    github: read('github'),
    instagram: read('instagram'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
  }
  const { name, image, bio, jobTitle, website } = parsed.data;
  const socialLinks: AuthorSocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    if (parsed.data[key]) socialLinks[key] = parsed.data[key];
  }
  await db
    .update(users)
    .set({
      name: name || null,
      image: image || null,
      bio: bio || null,
      jobTitle: jobTitle || null,
      website: website || null,
      socialLinks: Object.keys(socialLinks).length ? socialLinks : null,
    })
    .where(eq(users.id, session.session.userId));
  return { message: 'Profile saved.' };
}
