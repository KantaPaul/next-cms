import { z } from 'zod';

export const createCollectionBlockSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().trim().min(1, 'Name is required').max(150),
  description: z.string().trim().max(500).nullish(),
  fromId: z.string().nullish(),
});

export const updateCollectionBlockSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Name is required').max(150),
  description: z.string().trim().max(500).nullish(),
});
