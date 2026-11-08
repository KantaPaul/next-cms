import { z } from 'zod';

const httpsUrl = z
  .string()
  .trim()
  .max(300)
  .refine(
    v => v === '' || /^https:\/\/[^\s]+$/i.test(v),
    'Links must start with https://'
  );

export const profileSchema = z.object({
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
  jobTitle: z.string().trim().max(120),
  website: httpsUrl,
  x: httpsUrl,
  linkedin: httpsUrl,
  github: httpsUrl,
  instagram: httpsUrl,
});
